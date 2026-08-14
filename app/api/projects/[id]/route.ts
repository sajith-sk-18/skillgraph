import { handleApiError, notFound, ok } from "@/lib/api/response";
import { idSchema } from "@/lib/validations/schemas";
import { getProjectDetail } from "@/server/services/project.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	try {
		const projectId = idSchema.parse(params.id);
		const project = await getProjectDetail(projectId);
		if (!project) return notFound("Project");
		return ok(project);
	} catch (error) {
		return handleApiError(error, "projects/[id]");
	}
}
