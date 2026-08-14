import { handleApiError, ok, queryOf } from "@/lib/api/response";
import { globalSearchSchema } from "@/lib/validations/schemas";
import { search } from "@/server/services/graph.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const { q, limit } = globalSearchSchema.parse(queryOf(request));
		return ok(await search(q, limit));
	} catch (error) {
		return handleApiError(error, "graph/search");
	}
}
