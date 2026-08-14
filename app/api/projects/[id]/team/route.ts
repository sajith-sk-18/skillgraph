import { handleApiError, notFound, ok } from "@/lib/api/response";
import { assignTeamSchema, idSchema } from "@/lib/validations/schemas";
import { assignTeam, clearTeam } from "@/server/services/project.service";

export const dynamic = "force-dynamic";

/**
 * Assigns people to a project.
 *
 * POST rather than PUT because it is additive - assigning does not remove
 * anyone already on the project. Use DELETE to empty the team.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
	try {
		const projectId = idSchema.parse(params.id);
		const { employeeIds } = assignTeamSchema.parse(await request.json());

		const result = await assignTeam(projectId, employeeIds);
		if (!result) return notFound("Project");

		return ok({ ...result, projectId });
	} catch (error) {
		return handleApiError(error, "projects/[id]/team:assign");
	}
}

/** Empties the team, so an assignment made by mistake is reversible. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	try {
		const projectId = idSchema.parse(params.id);
		const result = await clearTeam(projectId);
		if (!result) return notFound("Project");
		return ok({ ...result, projectId });
	} catch (error) {
		return handleApiError(error, "projects/[id]/team:clear");
	}
}
