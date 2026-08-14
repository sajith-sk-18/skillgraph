import { handleApiError, ok } from "@/lib/api/response";
import { createClientSchema } from "@/lib/validations/schemas";
import { createClient, getClientFacets, getFilterOptions } from "@/server/services/project.service";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const [options, facets] = await Promise.all([getFilterOptions(), getClientFacets()]);
		return ok({ clients: options.clients, ...facets });
	} catch (error) {
		return handleApiError(error, "clients");
	}
}

export async function POST(request: Request) {
	try {
		const body = createClientSchema.parse(await request.json());
		const client = await createClient(body);
		if (!client) return ok({ error: "The client could not be created." }, 422);
		return ok({ client }, 201);
	} catch (error) {
		return handleApiError(error, "clients:create");
	}
}
