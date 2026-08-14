import { handleApiError, ok, queryOf } from "@/lib/api/response";
import { createProjectSchema, projectFiltersSchema } from "@/lib/validations/schemas";
import { createProject, listProjects } from "@/server/services/project.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const filters = projectFiltersSchema.parse(queryOf(request));
		const { projects, total } = await listProjects(filters);
		return ok({ projects, total, count: projects.length, filters });
	} catch (error) {
		return handleApiError(error, "projects");
	}
}

/** Creates a project and its REQUIRED_SKILL / FOR_CLIENT / IN_DOMAIN edges. */
export async function POST(request: Request) {
	try {
		const body = createProjectSchema.parse(await request.json());
		const project = await createProject(body);
		if (!project) {
			return ok({ error: "The project could not be created. Check the client and skills exist." }, 422);
		}
		return ok({ project }, 201);
	} catch (error) {
		return handleApiError(error, "projects:create");
	}
}
