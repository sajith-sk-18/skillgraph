import "server-only";

import type { CreateProjectInput, ProjectFilters } from "@/lib/validations/schemas";
import * as repo from "@/server/repositories/project.repository";
import type { Project, ProjectDetail, ProjectSummary, SkillCoverageRow } from "@/types/domain";

export async function listProjects(
	filters: ProjectFilters,
): Promise<{ projects: ProjectSummary[]; total: number }> {
	const [projects, total] = await Promise.all([
		repo.listProjects(filters),
		repo.countProjects(filters),
	]);
	return { projects, total };
}

export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
	const core = await repo.getProject(projectId);
	if (!core) return null;

	const [requiredSkills, technologies, team] = await Promise.all([
		repo.getProjectRequiredSkills(projectId),
		repo.getProjectTechnologies(projectId),
		repo.getProjectTeam(projectId),
	]);

	return { ...core.project, client: core.client, requiredSkills, technologies, team };
}

/**
 * Skill gap analysis.
 *
 * Coverage and suggestions come from two separate queries that are merged
 * here. They cannot be one query: combining them needs an OPTIONAL MATCH whose
 * WHERE clause CognoDB ignores, which silently counted every holder in the
 * company as though they were on the project. See
 * server/queries/README-cognodb.md.
 */
export async function getSkillGap(projectId: string): Promise<SkillCoverageRow[] | null> {
	const teamIds = await repo.getProjectTeamIds(projectId);
	const [coverage, suggestions] = await Promise.all([
		repo.getProjectSkillCoverage(projectId, teamIds),
		repo.getProjectGapSuggestions(projectId, teamIds),
	]);

	if (coverage.length === 0) return null;

	const total = teamIds.length;

	return coverage.map((row) => {
		// With no team yet, every required skill is a 100% gap rather than a
		// division by zero.
		const coveragePercent = total === 0 ? 0 : Math.round((row.covered / total) * 100);
		return {
			skill: row.skill,
			requiredProficiency: row.requiredProficiency,
			covered: row.covered,
			total,
			coveragePercent,
			gap: Math.max(0, 1 - row.covered),
			suggestions: suggestions.get(row.skill) ?? [],
		};
	});
}

export async function createProject(input: CreateProjectInput): Promise<Project | null> {
	const id = await repo.nextProjectId();
	// A project created through the form has not started yet, whatever dates
	// were entered - status is derived, not taken from user input.
	return repo.createProject(id, input, "Planned");
}

export const getFilterOptions = repo.getProjectFilterOptions;
export const getProjectTeamIds = repo.getProjectTeamIds;
