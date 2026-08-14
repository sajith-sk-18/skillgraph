import { handleApiError, ok, queryOf } from "@/lib/api/response";
import { skillFiltersSchema } from "@/lib/validations/schemas";
import { listSkills } from "@/server/services/skill.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const filters = skillFiltersSchema.parse(queryOf(request));
		const skills = await listSkills(filters);
		return ok({ skills, count: skills.length });
	} catch (error) {
		return handleApiError(error, "skills");
	}
}
