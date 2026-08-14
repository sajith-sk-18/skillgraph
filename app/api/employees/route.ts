import { handleApiError, ok, queryOf } from "@/lib/api/response";
import { employeeFiltersSchema } from "@/lib/validations/schemas";
import { listEmployees } from "@/server/services/employee.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	try {
		const filters = employeeFiltersSchema.parse(queryOf(request));
		const { employees, total } = await listEmployees(filters);
		return ok({ employees, total, count: employees.length, filters });
	} catch (error) {
		return handleApiError(error, "employees");
	}
}
