import { verifyConnectivity } from "@/lib/db/neo4j";
import { handleApiError, ok } from "@/lib/api/response";

/** Liveness probe - also the fastest way to tell a config error from a network one. */
export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const result = await verifyConnectivity();
		return ok(
			{
				status: result.ok ? "healthy" : "degraded",
				database: result.ok ? "connected" : "unreachable",
				message: result.message,
				timestamp: new Date().toISOString(),
			},
			result.ok ? 200 : 503,
		);
	} catch (error) {
		return handleApiError(error, "health");
	}
}
