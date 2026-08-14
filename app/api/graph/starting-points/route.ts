import { handleApiError, ok } from "@/lib/api/response";
import { getStartingPoints } from "@/server/services/graph.service";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		return ok(await getStartingPoints());
	} catch (error) {
		return handleApiError(error, "graph/starting-points");
	}
}
