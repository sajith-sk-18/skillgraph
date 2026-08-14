import { handleApiError, notFound, ok } from "@/lib/api/response";
import { idSchema } from "@/lib/validations/schemas";
import { getSkillDetail } from "@/server/services/skill.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	try {
		const skillId = idSchema.parse(params.id);
		const skill = await getSkillDetail(skillId);
		if (!skill) return notFound("Skill");
		return ok(skill);
	} catch (error) {
		return handleApiError(error, "skills/[id]");
	}
}
