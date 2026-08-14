import { handleApiError, notFound, ok, queryOf } from "@/lib/api/response";
import { idSchema } from "@/lib/validations/schemas";
import { getConnectedQualifiedCandidates } from "@/server/services/staffing.service";

export const dynamic = "force-dynamic";

/** The relationally-awkward query, exposed on its own so it can be demonstrated. */
export async function GET(request: Request) {
	try {
		const projectId = idSchema.parse(queryOf(request).projectId);
		const result = await getConnectedQualifiedCandidates(projectId);
		if (!result) return notFound("Project");
		return ok({ ...result, count: result.rows.length });
	} catch (error) {
		return handleApiError(error, "staffing/connected");
	}
}
