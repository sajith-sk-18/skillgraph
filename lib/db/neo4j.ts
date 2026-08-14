import "server-only";

import neo4j, { Driver, Session, type QueryResult, type Record as Neo4jRecord } from "neo4j-driver";

/**
 * The single point at which this application talks to CognoDB.
 *
 * `server-only` is a build-time guard, not a convention: if any Client
 * Component ever imports this module - directly or through a barrel file - the
 * build fails rather than shipping the connection string to a browser.
 */

export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigurationError";
	}
}

export class DatabaseError extends Error {
	constructor(message: string, readonly cause?: unknown) {
		super(message);
		this.name = "DatabaseError";
	}
}

interface Credentials {
	uri: string;
	username: string;
	password: string;
}

function readCredentials(): Credentials {
	const uri = process.env.COGNODB_URI;
	const username = process.env.COGNODB_USERNAME;
	const password = process.env.COGNODB_PASSWORD;

	const missing = [
		["COGNODB_URI", uri],
		["COGNODB_USERNAME", username],
		["COGNODB_PASSWORD", password],
	]
		.filter(([, value]) => !value)
		.map(([name]) => name);

	if (missing.length > 0) {
		throw new ConfigurationError(`Missing environment variable(s): ${missing.join(", ")}`);
	}

	return { uri: uri!, username: username!, password: password! };
}

/**
 * Cached on globalThis rather than in a module-level `let`.
 *
 * Next.js discards and re-evaluates modules on every hot reload in
 * development, so a module-scoped driver leaks a new connection pool on each
 * edit until CognoDB's 200-connection limit is exhausted. globalThis survives
 * the reload.
 */
const globalForDriver = globalThis as unknown as { __skillgraphDriver?: Driver };

export function getDriver(): Driver {
	if (globalForDriver.__skillgraphDriver) return globalForDriver.__skillgraphDriver;

	const { uri, username, password } = readCredentials();

	const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
		// Sized for CognoDB's free c0 tier (0.5 vCPU / 256 MB). A large pool
		// does not make a small instance faster - it just queues.
		maxConnectionPoolSize: 20,
		connectionAcquisitionTimeout: 30_000,
		maxTransactionRetryTime: 15_000,
		disableLosslessIntegers: false,
	});

	globalForDriver.__skillgraphDriver = driver;
	return driver;
}

/**
 * Runs `work` against a read session and always closes it.
 *
 * Every failure is re-thrown as a DatabaseError so that nothing above this
 * layer ever sees a driver message - those can contain the bolt URI.
 */
export async function withSession<T>(work: (session: Session) => Promise<T>): Promise<T> {
	const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
	try {
		return await work(session);
	} catch (error) {
		throw asDatabaseError(error);
	} finally {
		await session.close();
	}
}

export async function withWriteSession<T>(work: (session: Session) => Promise<T>): Promise<T> {
	const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
	try {
		return await work(session);
	} catch (error) {
		throw asDatabaseError(error);
	} finally {
		await session.close();
	}
}

function asDatabaseError(error: unknown): DatabaseError {
	if (error instanceof ConfigurationError) throw error;
	if (error instanceof DatabaseError) return error;

	const message = error instanceof Error ? error.message : String(error);
	// Logged server-side in full; the API layer decides what a user may see.
	console.error("[skillgraph:db]", message);
	return new DatabaseError(message, error);
}

/**
 * Wraps a JavaScript number as a Neo4j 64-bit integer.
 *
 * Required for `LIMIT`, `SKIP` and any property compared against a stored
 * integer: an unwrapped JS number arrives as a float, and `LIMIT 60.0` is a
 * type error rather than a limit.
 */
export const toInt = (value: number) => neo4j.int(Math.round(value));

/** Runs a parameterised read query and hands back the raw driver records. */
export async function readRecords(
	cypher: string,
	params: Record<string, unknown> = {},
): Promise<Neo4jRecord[]> {
	return withSession(async (session) => {
		const result: QueryResult = await session.run(cypher, params);
		return result.records;
	});
}

/** Runs a parameterised write query. */
export async function writeRecords(
	cypher: string,
	params: Record<string, unknown> = {},
): Promise<Neo4jRecord[]> {
	return withWriteSession(async (session) => {
		const result: QueryResult = await session.run(cypher, params);
		return result.records;
	});
}

export async function verifyConnectivity(): Promise<{ ok: boolean; message: string }> {
	try {
		await getDriver().verifyConnectivity();
		return { ok: true, message: "Connected to CognoDB" };
	} catch (error) {
		if (error instanceof ConfigurationError) {
			return { ok: false, message: "Database is not configured" };
		}
		console.error("[skillgraph:db] connectivity check failed", error);
		return { ok: false, message: "Could not reach CognoDB" };
	}
}
