/**
 * Driver helper for the CLI scripts.
 *
 * Deliberately separate from lib/db/neo4j.ts: that module is marked
 * `server-only`, which makes it unimportable from a plain Node process.
 */

import { config as loadEnv } from "dotenv";
import neo4j, { Driver, type QueryResult } from "neo4j-driver";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export function createDriver(): Driver {
	const uri = process.env.COGNODB_URI;
	const username = process.env.COGNODB_USERNAME;
	const password = process.env.COGNODB_PASSWORD;

	if (!uri || !username || !password) {
		console.error(
			"Missing CognoDB credentials. Copy .env.example to .env.local and fill in COGNODB_URI, COGNODB_USERNAME and COGNODB_PASSWORD.",
		);
		process.exit(1);
	}

	return neo4j.driver(uri, neo4j.auth.basic(username, password), {
		maxConnectionPoolSize: 10,
	});
}

/** Neo4j stores whole numbers as 64-bit integers; unwrapped JS numbers arrive as floats. */
export const int = (value: number) => neo4j.int(Math.round(value));

export async function run(
	driver: Driver,
	cypher: string,
	params: Record<string, unknown> = {},
): Promise<QueryResult> {
	const session = driver.session();
	try {
		return await session.run(cypher, params);
	} finally {
		await session.close();
	}
}

/**
 * Sends a large array through a single UNWIND rather than one statement per
 * row. On the free tier the difference is minutes versus seconds - each
 * round trip to a shared 0.5 vCPU instance costs far more than the write.
 */
export async function batch<T>(
	driver: Driver,
	label: string,
	items: T[],
	cypher: string,
	size = 200,
): Promise<void> {
	if (items.length === 0) {
		console.log(`  ${label.padEnd(34)} 0 (nothing to write)`);
		return;
	}
	for (let index = 0; index < items.length; index += size) {
		await run(driver, cypher, { rows: items.slice(index, index + size) });
	}
	console.log(`  ${label.padEnd(34)} ${items.length}`);
}
