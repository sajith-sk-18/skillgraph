import "server-only";

import type { CreateClientInput, CreateProjectInput, ProjectFilters } from "@/lib/validations/schemas";
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
	const [id, domainId] = await Promise.all([repo.nextProjectId(), repo.nextDomainId()]);
	// A project created through the form has not started yet, whatever dates
	// were entered - status is derived, not taken from user input.
	//
	// `domainId` is only consumed if the domain is new: CREATE_PROJECT MERGEs
	// the Domain node and sets the id ON CREATE, so a user-entered domain that
	// does not exist yet is created rather than silently failing the whole
	// statement, which is what a MATCH would have done.
	return repo.createProject(id, domainId, input, "Planned");
}

export async function createClient(input: CreateClientInput) {
	return repo.createClient(await repo.nextClientId(), input);
}

/**
 * Assigns people to a project, then RECOMPUTES the derived collaboration edge.
 *
 * WORKED_WITH is not authored anywhere - it exists because two people share
 * projects. Writing new WORKED_ON edges without updating it would leave the
 * graph internally inconsistent: the staffing engine would keep scoring
 * collaboration from stale history, and the profile page would show co-workers
 * that no longer match the project record.
 */
export async function assignTeam(projectId: string, employeeIds: string[]) {
	const project = await repo.getProject(projectId);
	if (!project) return null;

	const roles = await repo.getEmployeeRoleNames(employeeIds);

	const assigned = await repo.assignTeam(
		projectId,
		employeeIds.map((employeeId) => {
			const role = roles.get(employeeId);
			const senior = ["Senior", "Lead", "Principal"].includes(role?.seniority ?? "") ? "Senior " : "";
			return {
				employeeId,
				role: `${senior}${role?.roleName ?? "Team Member"}`,
				responsibility: "Assigned through SkillGraph staffing",
			};
		}),
	);

	const affected = await repo.getProjectTeamIds(projectId);
	await recomputeCollaboration(affected);

	return { assigned, teamSize: affected.length };
}

export async function clearTeam(projectId: string) {
	const project = await repo.getProject(projectId);
	if (!project) return null;

	// Captured BEFORE the delete - afterwards there is nobody left to look up.
	const previous = await repo.getProjectTeamIds(projectId);
	const removed = await repo.clearTeam(projectId);
	await recomputeCollaboration(previous);

	return { removed, previousTeamSize: previous.length };
}

/**
 * Rebuilds WORKED_WITH for every pair within a set of people.
 *
 * Pairing happens here rather than in Cypher because it needs a pattern with
 * BOTH ends already bound - the shape CognoDB gets wrong (see
 * server/queries/README-cognodb.md). Counting shared projects in TypeScript
 * over a flat membership list is provably correct and costs one query.
 */
async function recomputeCollaboration(employeeIds: string[]): Promise<void> {
	if (employeeIds.length < 2) return;

	const membership = await repo.getTeamProjectMembership(employeeIds);

	const projectsByEmployee = new Map<string, Set<string>>();
	for (const row of membership) {
		const set = projectsByEmployee.get(row.employeeId) ?? new Set<string>();
		set.add(row.projectId);
		projectsByEmployee.set(row.employeeId, set);
	}

	const upserts: { a: string; b: string; projectsTogether: number; lastProject: string }[] = [];
	const deletes: { a: string; b: string }[] = [];

	const sorted = [...employeeIds].sort();
	for (let i = 0; i < sorted.length; i += 1) {
		for (let j = i + 1; j < sorted.length; j += 1) {
			const a = sorted[i];
			const b = sorted[j];
			const shared = Array.from(projectsByEmployee.get(a) ?? []).filter((projectId) =>
				projectsByEmployee.get(b)?.has(projectId),
			);

			// Stored in one direction only, always with the lower id first, so
			// the undirected reads elsewhere never see a duplicate pair.
			if (shared.length > 0) {
				upserts.push({
					a,
					b,
					projectsTogether: shared.length,
					lastProject: shared.sort().reverse()[0],
				});
			} else {
				deletes.push({ a, b });
			}
		}
	}

	await Promise.all([repo.upsertCollaboration(upserts), repo.deleteCollaboration(deletes)]);
}

export const getFilterOptions = repo.getProjectFilterOptions;
export const getProjectTeamIds = repo.getProjectTeamIds;
export const getClientFacets = repo.getClientFacets;
export const listDomains = repo.listDomains;
