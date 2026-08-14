import { handleApiError, notFound, ok } from "@/lib/api/response";
import { idSchema } from "@/lib/validations/schemas";
import { getEmployeeProfile } from "@/server/services/employee.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	try {
		const employeeId = idSchema.parse(params.id);
		const profile = await getEmployeeProfile(employeeId);
		if (!profile) return notFound("Employee");
		return ok(profile);
	} catch (error) {
		return handleApiError(error, "employees/[id]");
	}
}
