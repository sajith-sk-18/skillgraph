import { handleApiError, ok } from "@/lib/api/response";
import { getFilterOptions as employeeOptions } from "@/server/services/employee.service";
import { getFilterOptions as projectOptions } from "@/server/services/project.service";
import { getCategories } from "@/server/services/skill.service";

export const dynamic = "force-dynamic";

/** Every filter dropdown in the app, sourced from the graph rather than hardcoded. */
export async function GET() {
	try {
		const [employees, projects, skillCategories] = await Promise.all([
			employeeOptions(),
			projectOptions(),
			getCategories(),
		]);
		return ok({ employees, projects, skillCategories });
	} catch (error) {
		return handleApiError(error, "filters");
	}
}
