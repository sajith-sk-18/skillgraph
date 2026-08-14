import "server-only";

import type { EmployeeFilters } from "@/lib/validations/schemas";
import * as repo from "@/server/repositories/employee.repository";
import type { EmployeeProfile, EmployeeSummary } from "@/types/domain";

export async function listEmployees(
	filters: EmployeeFilters,
): Promise<{ employees: EmployeeSummary[]; total: number }> {
	// Run together: the count is independent of the page and both are needed
	// before anything renders.
	const [employees, total] = await Promise.all([
		repo.listEmployees(filters),
		repo.countEmployees(filters),
	]);
	return { employees, total };
}

/**
 * Assembles a profile from six focused traversals rather than one large query.
 *
 * A single query returning skills, projects, co-workers, certifications, teams
 * and domains would be a six-way cross product - a person with 7 skills, 4
 * projects and 16 co-workers would come back as 448 rows describing 27 facts.
 * Six queries run concurrently and each returns exactly what it should.
 */
export async function getEmployeeProfile(employeeId: string): Promise<EmployeeProfile | null> {
	const employee = await repo.getEmployee(employeeId);
	if (!employee) return null;

	const [skills, projects, collaborators, certifications, teamsAndRoles, domains] =
		await Promise.all([
			repo.getEmployeeSkills(employeeId),
			repo.getEmployeeProjects(employeeId),
			repo.getEmployeeCollaborators(employeeId),
			repo.getEmployeeCertifications(employeeId),
			repo.getEmployeeTeamsAndRoles(employeeId),
			repo.getEmployeeDomains(employeeId),
		]);

	return {
		...employee,
		skills: skills.sort((a, b) => b.proficiency - a.proficiency || a.skill.name.localeCompare(b.skill.name)),
		projects,
		collaborators,
		certifications,
		teams: teamsAndRoles.teams,
		roles: teamsAndRoles.roles,
		domains,
	};
}

export const getFilterOptions = repo.getEmployeeFilterOptions;
