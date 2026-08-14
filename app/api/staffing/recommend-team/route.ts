import { handleApiError, ok } from "@/lib/api/response";
import { staffingRequestSchema } from "@/lib/validations/schemas";
import { recommendTeam } from "@/server/services/staffing.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const body = staffingRequestSchema.parse(await request.json());
		const team = await recommendTeam(body);

		if (!team) {
			return ok({ error: "No team could be assembled from the current candidate pool." }, 404);
		}

		return ok(team);
	} catch (error) {
		return handleApiError(error, "staffing/recommend-team");
	}
}
