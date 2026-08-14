import { handleApiError, ok } from "@/lib/api/response";
import { getFullAnalytics } from "@/server/services/analytics.service";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		return ok(await getFullAnalytics());
	} catch (error) {
		return handleApiError(error, "analytics");
	}
}
