import { handleApiError, ok } from "@/lib/api/response";
import { staffingRequestSchema } from "@/lib/validations/schemas";
import { findCandidates } from "@/server/services/staffing.service";

export const dynamic = "force-dynamic";

/**
 * POST because a staffing request carries a nested requirement list.
 *
 * Encoding an array of {skillId, proficiency, years} into a query string would
 * be lossy and unreadable, and this is not a cacheable resource - it is a
 * computation over the current state of the graph.
 */
export async function POST(request: Request) {
	try {
		const body = staffingRequestSchema.parse(await request.json());
		const result = await findCandidates(body);

		if (!result) {
			return ok({ error: "That project could not be found, or it has no required skills." }, 404);
		}

		return ok({ ...result, count: result.candidates.length });
	} catch (error) {
		return handleApiError(error, "staffing/match");
	}
}
