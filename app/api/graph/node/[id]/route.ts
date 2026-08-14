import { handleApiError, notFound, ok, queryOf } from "@/lib/api/response";
import { graphExplorerSchema } from "@/lib/validations/schemas";
import { getNeighborhood, getNodeDetail, parseLabels } from "@/server/services/graph.service";

export const dynamic = "force-dynamic";

/** Neighbourhood plus node detail - one call per expansion in the explorer. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
	try {
		const query = graphExplorerSchema.parse({ ...queryOf(request), nodeId: params.id });
		const [graph, detail] = await Promise.all([
			getNeighborhood(query.nodeId, query.depth, query.limit, parseLabels(query.labels)),
			getNodeDetail(query.nodeId),
		]);

		if (!detail) return notFound("Node");
		return ok({ ...graph, detail });
	} catch (error) {
		return handleApiError(error, "graph/node/[id]");
	}
}
