import { handleApiError, ok } from "@/lib/api/response";
import { getDashboardAnalytics, getDashboardStats } from "@/server/services/analytics.service";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const [stats, analytics] = await Promise.all([getDashboardStats(), getDashboardAnalytics()]);
		return ok({ stats, ...analytics });
	} catch (error) {
		return handleApiError(error, "dashboard/stats");
	}
}
