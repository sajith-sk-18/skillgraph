import "server-only";

import * as repo from "@/server/repositories/analytics.repository";

/**
 * Dashboard and analytics.
 *
 * Queries run concurrently because none depends on another, and the free tier
 * is latency-bound rather than CPU-bound for reads this small - eleven
 * sequential round trips would dominate the page load.
 */

export const getDashboardStats = repo.getDashboardStats;

export async function getDashboardAnalytics() {
	const [byDepartment, bySeniority, byAvailability, topSkills, projectsByDomain, mostConnected] =
		await Promise.all([
			repo.getEmployeesByDepartment(),
			repo.getEmployeesBySeniority(),
			repo.getEmployeesByAvailability(),
			repo.getTopSkills(8),
			repo.getProjectsByDomain(),
			repo.getMostConnected(5),
		]);

	return { byDepartment, bySeniority, byAvailability, topSkills, projectsByDomain, mostConnected };
}

export async function getFullAnalytics() {
	const [
		stats,
		byDepartment,
		bySeniority,
		byAvailability,
		topSkills,
		projectsByDomain,
		skillsByDepartment,
		mostExperienced,
		mostConnected,
		supplyVsDemand,
		collaborativeTeams,
	] = await Promise.all([
		repo.getDashboardStats(),
		repo.getEmployeesByDepartment(),
		repo.getEmployeesBySeniority(),
		repo.getEmployeesByAvailability(),
		repo.getTopSkills(12),
		repo.getProjectsByDomain(),
		repo.getSkillsByDepartment(),
		repo.getMostExperienced(8),
		repo.getMostConnected(8),
		repo.getSkillSupplyVsDemand(),
		repo.getMostCollaborativeTeams(),
	]);

	return {
		stats,
		byDepartment,
		bySeniority,
		byAvailability,
		topSkills,
		projectsByDomain,
		skillsByDepartment,
		mostExperienced,
		mostConnected,
		supplyVsDemand,
		collaborativeTeams,
	};
}
