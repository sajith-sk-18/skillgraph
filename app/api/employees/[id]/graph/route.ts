import { handleApiError, ok, queryOf } from "@/lib/api/response";
import { graphExplorerSchema } from "@/lib/validations/schemas";
import { getNeighborhood, parseLabels } from "@/server/services/graph.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
	try {
		const query = graphExplorerSchema.parse({ ...queryOf(request), nodeId: params.id });
		const graph = await getNeighborhood(
			query.nodeId,
			query.depth,
			query.limit,
			parseLabels(query.labels),
		);
		return ok(graph);
	} catch (error) {
		return handleApiError(error, "employees/[id]/graph");
	}
}
