import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ConfigurationError, DatabaseError } from "@/lib/db/neo4j";

/**
 * The single place an error becomes an HTTP response.
 *
 * The contract: a driver message can contain the bolt URI and therefore the
 * instance hostname, so nothing from the underlying error reaches the browser.
 * The full detail is logged server-side; the client gets a status code and a
 * sentence it can act on.
 */

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });

export function handleApiError(error: unknown, context: string): NextResponse {
	if (error instanceof ZodError) {
		return NextResponse.json(
			{
				error: "Some of the values sent were not valid.",
				details: error.issues.map((issue) => ({
					field: issue.path.join("."),
					message: issue.message,
				})),
			},
			{ status: 400 },
		);
	}

	if (error instanceof ConfigurationError) {
		console.error(`[skillgraph:${context}] configuration`, error.message);
		return NextResponse.json(
			{ error: "The application is not configured to reach its database." },
			{ status: 503 },
		);
	}

	if (error instanceof DatabaseError) {
		console.error(`[skillgraph:${context}] database`, error.message);
		return NextResponse.json(
			{ error: "The graph database is currently unreachable. Please try again in a moment." },
			{ status: 503 },
		);
	}

	console.error(`[skillgraph:${context}] unexpected`, error);
	return NextResponse.json({ error: "Something went wrong handling that request." }, { status: 500 });
}

/** 404 with a message worth reading. */
export const notFound = (what: string) => NextResponse.json({ error: `${what} not found.` }, { status: 404 });

/** Turns URLSearchParams into the plain object Zod expects. */
export const queryOf = (request: Request): Record<string, string> =>
	Object.fromEntries(new URL(request.url).searchParams.entries());
