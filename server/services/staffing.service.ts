import "server-only";

import type { StaffingRequest } from "@/lib/validations/schemas";
import * as repo from "@/server/repositories/staffing.repository";
import type {
	CandidateMatch,
	SkillCoverageRow,
	SkillRequirement,
	TeamRecommendation,
} from "@/types/domain";

/**
 * Candidate scoring.
 *
 * The graph supplies the evidence; this file turns it into a number. Keeping
 * the arithmetic here rather than in Cypher means every weight below is
 * covered by tests/staffing.service.test.ts without needing a database.
 *
 * Nothing is opaque. Each component is returned alongside the score and shown
 * on the candidate card, because a recommendation a manager cannot interrogate
 * is a recommendation they will not act on.
 */

/** The published weighting. These five numbers must total 100. */
export const WEIGHTS = {
	skillMatch: 40,
	projectExperience: 25,
	yearsOfExperience: 15,
	domainExperience: 10,
	collaborationFit: 10,
} as const;

/**
 * Saturation points - the level at which a component earns full marks.
 *
 * Deliberately low. The difference between three relevant projects and eight
 * is not worth 25 points, and treating it as though it were would let a
 * long-serving generalist outrank a specialist who actually fits.
 *
 * `projectRelevance` is a WEIGHTED total, not a count - see relevanceOf below.
 * 1.5 means roughly "two projects that each used most of what this one needs".
 */
const FULL_MARKS_AT = {
	projectRelevance: 1.5,
	yearsOfExperience: 8,
	domainProjects: 2,
	/** Summed shared projects with the reference set, not a headcount. */
	collaborationStrength: 6,
} as const;

/**
 * The reference set for collaboration scoring: roughly twice the team being
 * assembled, so it represents the people plausibly going on THIS project.
 *
 * Two earlier attempts both failed to discriminate, and the reason is worth
 * recording. Scoring against the whole 69-person pool gave everyone 10/10.
 * Narrowing to the top 15 barely helped - 36 of 40 candidates still maxed out,
 * because the shortlist is selected by seniority-correlated score and senior
 * people have worked with everyone.
 *
 * The fix is to measure DEPTH rather than breadth: summed shared projects,
 * against a set the size of an actual team.
 */
const shortlistSize = (teamSize: number) => Math.min(15, Math.max(8, teamSize * 2));

/**
 * A prior project's relevance, from 0 to 1.
 *
 * A count of "projects that used at least one required skill" is far too
 * loose: React, Node, Python, AWS and PostgreSQL between them touch nearly
 * every project in the portfolio, so almost everybody scored full marks.
 * Weighting by how MUCH of the requirement each project covered restores the
 * distinction between a genuinely similar engagement and one that happened to
 * use Postgres.
 */
export function relevanceOf(technologyIds: string[], requiredSkillIds: Set<string>): number {
	if (requiredSkillIds.size === 0) return 0;
	const overlap = technologyIds.filter((id) => requiredSkillIds.has(id)).length;
	return overlap / requiredSkillIds.size;
}

/** Proficiency carries more weight than tenure when judging a single skill. */
const PROFICIENCY_SHARE = 0.75;
const YEARS_SHARE = 1 - PROFICIENCY_SHARE;

const ratio = (value: number, target: number): number =>
	target <= 0 ? 1 : Math.min(1, value / target);

/**
 * How well one person covers one requirement, from 0 to 1.
 *
 * Exceeding the bar earns no bonus: a 10/10 React developer is not 25% better
 * for a project needing 8/10 than someone at exactly 8. That headroom is worth
 * something, but not enough to outweigh a missing skill somewhere else.
 */
export function skillCredit(
	held: { proficiency: number; years: number } | undefined,
	required: { requiredProficiency: number; requiredYears: number },
): number {
	if (!held) return 0;
	const proficiency = ratio(held.proficiency, required.requiredProficiency);
	const years = ratio(held.years, required.requiredYears);
	return proficiency * PROFICIENCY_SHARE + years * YEARS_SHARE;
}

interface ScoreInput {
	requirements: SkillRequirement[];
	matchedSkills: repo.SkillEvidence["matchedSkills"];
	/** Weighted total from relevanceOf, not a raw project count. */
	projectRelevance: number;
	yearsOfExperience: number;
	domainProjectCount: number;
	/** Summed shared projects with the reference set - depth, not headcount. */
	collaborationStrength: number;
}

export function scoreCandidate(input: ScoreInput): CandidateMatch["breakdown"] & { total: number } {
	const held = new Map(input.matchedSkills.map((skill) => [skill.skillId, skill]));

	const creditTotal = input.requirements.reduce(
		(sum, requirement) => sum + skillCredit(held.get(requirement.skillId), requirement),
		0,
	);
	const skillMatch =
		input.requirements.length === 0
			? 0
			: (creditTotal / input.requirements.length) * WEIGHTS.skillMatch;

	const projectExperience =
		ratio(input.projectRelevance, FULL_MARKS_AT.projectRelevance) * WEIGHTS.projectExperience;
	const yearsOfExperience =
		ratio(input.yearsOfExperience, FULL_MARKS_AT.yearsOfExperience) * WEIGHTS.yearsOfExperience;
	const domainExperience =
		ratio(input.domainProjectCount, FULL_MARKS_AT.domainProjects) * WEIGHTS.domainExperience;
	const collaborationFit =
		ratio(input.collaborationStrength, FULL_MARKS_AT.collaborationStrength) * WEIGHTS.collaborationFit;

	const round = (value: number) => Math.round(value * 10) / 10;

	return {
		skillMatch: round(skillMatch),
		projectExperience: round(projectExperience),
		yearsOfExperience: round(yearsOfExperience),
		domainExperience: round(domainExperience),
		collaborationFit: round(collaborationFit),
		total: Math.round(
			skillMatch + projectExperience + yearsOfExperience + domainExperience + collaborationFit,
		),
	};
}

/** Resolves a staffing request to a concrete requirement list and domain. */
async function resolveRequest(request: StaffingRequest): Promise<{
	requirements: SkillRequirement[];
	domain: string;
	projectId: string | null;
	projectName: string | null;
} | null> {
	if (request.projectId) {
		const resolved = await repo.getProjectRequirements(request.projectId);
		if (!resolved) return null;
		return {
			requirements: resolved.requirements,
			domain: request.domain || resolved.domain,
			projectId: resolved.project.id,
			projectName: resolved.project.name,
		};
	}

	// An ad-hoc requirement carries skill ids but no names, so they are filled
	// in from the evidence query rather than left blank in the UI.
	return {
		requirements: (request.requiredSkills ?? []).map((skill) => ({
			skillId: skill.skillId,
			skillName: skill.skillId,
			requiredProficiency: skill.requiredProficiency,
			requiredYears: skill.requiredYears,
		})),
		domain: request.domain ?? "",
		projectId: null,
		projectName: null,
	};
}

export interface StaffingResult {
	projectId: string | null;
	projectName: string | null;
	domain: string;
	requirements: SkillRequirement[];
	candidates: CandidateMatch[];
	poolSize: number;
}

/**
 * The main staffing pipeline.
 *
 * Four traversals gather evidence, then one pass scores it:
 *
 *   1. who holds any required skill, and how well  (Skill <- HAS_SKILL - Employee)
 *   2. what they have delivered                    (Employee -> Project -> Domain)
 *   3. who among them has worked together          (Employee - WORKED_WITH - Employee)
 *   4. skill coverage across the shortlist
 *
 * Step 3 runs only over the candidate pool, which is why collaboration is
 * "fit with this team" rather than a general popularity score.
 */
export async function findCandidates(request: StaffingRequest): Promise<StaffingResult | null> {
	const resolved = await resolveRequest(request);
	if (!resolved || resolved.requirements.length === 0) return null;

	const evidence = await repo.getSkillEvidence(resolved.requirements);

	const pool = request.onlyAvailable
		? evidence.filter((entry) => entry.employee.availability !== "Allocated")
		: evidence;

	if (pool.length === 0) {
		return { ...resolved, candidates: [], poolSize: 0 };
	}

	const candidateIds = pool.map((entry) => entry.employee.id);
	const projectRows = await repo.getProjectEvidence(candidateIds);

	const requiredSkillIds = new Set(resolved.requirements.map((r) => r.skillId));

	const relevantByEmployee = new Map<string, { id: string; name: string; domain: string; role: string }[]>();
	const relevanceByEmployee = new Map<string, number>();
	const domainCountByEmployee = new Map<string, number>();

	for (const row of projectRows) {
		const relevance = relevanceOf(row.technologyIds, requiredSkillIds);
		if (relevance > 0) {
			const list = relevantByEmployee.get(row.employeeId) ?? [];
			list.push({
				id: row.projectId,
				name: row.projectName,
				domain: row.domain ?? "",
				role: row.role,
			});
			relevantByEmployee.set(row.employeeId, list);
			relevanceByEmployee.set(
				row.employeeId,
				(relevanceByEmployee.get(row.employeeId) ?? 0) + relevance,
			);
		}
		if (resolved.domain && row.domain === resolved.domain) {
			domainCountByEmployee.set(
				row.employeeId,
				(domainCountByEmployee.get(row.employeeId) ?? 0) + 1,
			);
		}
	}

	/**
	 * PASS 1 - score the 90 points that do not depend on the pool.
	 *
	 * The top of this ranking becomes the reference set for collaboration:
	 * "has this person shipped with the people who will actually be on the
	 * team", rather than "does this person know anybody at all".
	 */
	const provisional = pool
		.map((entry) => ({
			id: entry.employee.id,
			score: scoreCandidate({
				requirements: resolved.requirements,
				matchedSkills: entry.matchedSkills,
				projectRelevance: relevanceByEmployee.get(entry.employee.id) ?? 0,
				yearsOfExperience: entry.employee.yearsOfExperience,
				domainProjectCount: domainCountByEmployee.get(entry.employee.id) ?? 0,
				collaborationStrength: 0,
			}).total,
		}))
		.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

	const shortlistIds = provisional.slice(0, shortlistSize(request.teamSize)).map((entry) => entry.id);

	// PASS 2 - collaboration between every candidate and that shortlist.
	const collaborations = await repo.getCollaborationWithReference(candidateIds, shortlistIds);

	const collaboratorsByEmployee = new Map<string, { name: string; projectsTogether: number }[]>();
	for (const link of collaborations) {
		const list = collaboratorsByEmployee.get(link.aId) ?? [];
		list.push({ name: link.bName, projectsTogether: link.projectsTogether });
		collaboratorsByEmployee.set(link.aId, list);
	}

	const candidates: CandidateMatch[] = pool.map((entry) => {
		const relevantProjects = relevantByEmployee.get(entry.employee.id) ?? [];
		const domainProjectCount = domainCountByEmployee.get(entry.employee.id) ?? 0;
		const collaboratorsInPool = (collaboratorsByEmployee.get(entry.employee.id) ?? []).sort(
			(a, b) => b.projectsTogether - a.projectsTogether,
		);

		const { total, ...breakdown } = scoreCandidate({
			requirements: resolved.requirements,
			matchedSkills: entry.matchedSkills,
			projectRelevance: relevanceByEmployee.get(entry.employee.id) ?? 0,
			yearsOfExperience: entry.employee.yearsOfExperience,
			domainProjectCount,
			collaborationStrength: collaboratorsInPool.reduce((sum, peer) => sum + peer.projectsTogether, 0),
		});

		const matchedIds = new Set(entry.matchedSkills.map((skill) => skill.skillId));

		return {
			employee: entry.employee,
			score: total,
			breakdown,
			evidence: {
				matchedSkills: entry.matchedSkills
					.map((skill) => ({
						name: skill.name,
						proficiency: skill.proficiency,
						required: skill.required,
						meets: skill.meets,
					}))
					.sort((a, b) => Number(b.meets) - Number(a.meets) || b.proficiency - a.proficiency),
				missingSkills: resolved.requirements
					.filter((requirement) => !matchedIds.has(requirement.skillId))
					.map((requirement) => requirement.skillName),
				relevantProjects: relevantProjects.slice(0, 5),
				domainProjectCount,
				collaboratorsInPool: collaboratorsInPool.slice(0, 5),
			},
		};
	});

	candidates.sort(
		(a, b) =>
			b.score - a.score ||
			b.breakdown.skillMatch - a.breakdown.skillMatch ||
			a.employee.name.localeCompare(b.employee.name),
	);

	return {
		...resolved,
		candidates: candidates.slice(0, request.limit),
		poolSize: pool.length,
	};
}

/**
 * Team recommendation - a different problem from ranking individuals.
 *
 * Taking the top N by score staffs five people with the same strengths. This
 * is a greedy set-cover instead: after the strongest candidate, each pick is
 * the one that adds the most UNCOVERED required skill, with score and existing
 * collaboration as tie-breakers.
 *
 * Greedy set cover is not optimal - a exhaustive search would be, and for a
 * team of five from a pool of seventy that is 12 million combinations on a
 * 0.5 vCPU instance. Greedy gets within a few percent instantly, and the
 * coverage figure shown to the user is measured rather than assumed.
 */
export async function recommendTeam(request: StaffingRequest): Promise<TeamRecommendation | null> {
	const result = await findCandidates({ ...request, limit: 40 });
	if (!result || result.candidates.length === 0) return null;

	const requirements = result.requirements;
	const teamSize = Math.min(request.teamSize, result.candidates.length);

	const covered = new Set<string>();
	const selected: TeamRecommendation["members"] = [];
	const remaining = [...result.candidates];

	while (selected.length < teamSize && remaining.length > 0) {
		let bestIndex = 0;
		let bestGain = -1;
		let bestScore = -1;

		remaining.forEach((candidate, index) => {
			const meets = candidate.evidence.matchedSkills.filter((skill) => skill.meets);
			const gain = meets.filter((skill) => !covered.has(skill.name)).length;

			// Collaboration with people already picked breaks ties, so a team
			// that has shipped together is preferred at equal capability.
			const alreadyPickedNames = new Set(selected.map((member) => member.employee.name));
			const connection = candidate.evidence.collaboratorsInPool.filter((peer) =>
				alreadyPickedNames.has(peer.name),
			).length;
			const tieBreak = candidate.score + connection * 2;

			if (gain > bestGain || (gain === bestGain && tieBreak > bestScore)) {
				bestIndex = index;
				bestGain = gain;
				bestScore = tieBreak;
			}
		});

		const [chosen] = remaining.splice(bestIndex, 1);
		const meets = chosen.evidence.matchedSkills.filter((skill) => skill.meets);
		const newlyCovered = meets.filter((skill) => !covered.has(skill.name)).map((s) => s.name);
		meets.forEach((skill) => covered.add(skill.name));

		selected.push({
			employee: chosen.employee,
			score: chosen.score,
			coversSkills: newlyCovered,
			primarySkill:
				[...meets].sort((a, b) => b.proficiency - a.proficiency)[0]?.name ??
				chosen.evidence.matchedSkills[0]?.name ??
				"-",
		});
	}

	const selectedIds = selected.map((member) => member.employee.id);
	const poolCoverage = await repo.getPoolCoverage(requirements, selectedIds);

	const coverage: SkillCoverageRow[] = poolCoverage.map((row) => ({
		skill: row.skill,
		requiredProficiency: row.requiredProficiency,
		covered: row.covered,
		total: selected.length,
		coveragePercent: row.covered > 0 ? 100 : 0,
		gap: row.covered > 0 ? 0 : 1,
		suggestions: row.holders.slice(0, 3),
	}));

	const skillsCovered = coverage.filter((row) => row.covered > 0).length;
	const skillCoveragePercent =
		coverage.length === 0 ? 0 : Math.round((skillsCovered / coverage.length) * 100);

	const collaborations = await repo.getCollaborationWithinPool(selectedIds);
	const nameById = new Map(selected.map((member) => [member.employee.id, member.employee.name]));

	const collaborationPairs: TeamRecommendation["collaborationPairs"] = [];
	for (let i = 0; i < selected.length; i += 1) {
		for (let j = i + 1; j < selected.length; j += 1) {
			const a = selected[i].employee.id;
			const b = selected[j].employee.id;
			const link = collaborations.find(
				(row) => (row.aId === a && row.bId === b) || (row.aId === b && row.bId === a),
			);
			const projectsTogether = link?.projectsTogether ?? 0;
			collaborationPairs.push({
				a: nameById.get(a) ?? a,
				b: nameById.get(b) ?? b,
				projectsTogether,
				strength: projectsTogether >= 3 ? "Strong" : projectsTogether >= 1 ? "Moderate" : "None",
			});
		}
	}
	collaborationPairs.sort((a, b) => b.projectsTogether - a.projectsTogether);

	const domainExperienceCount = result.candidates
		.filter((candidate) => selectedIds.includes(candidate.employee.id))
		.filter((candidate) => candidate.evidence.domainProjectCount > 0).length;

	return {
		members: selected,
		skillCoveragePercent,
		coverage,
		collaborationPairs,
		domainExperienceCount,
		domain: result.domain,
	};
}

/** The relationally-awkward query, surfaced as its own feature. */
export async function getConnectedQualifiedCandidates(projectId: string) {
	const resolved = await repo.getProjectRequirements(projectId);
	if (!resolved) return null;

	const rows = await repo.getQualifiedConnectedCandidates(
		resolved.requirements,
		resolved.domain,
		2,
		20,
	);

	return { domain: resolved.domain, rows };
}

export async function getMultiHopCandidates(projectId: string, limit = 10) {
	return repo.getMultiHopCandidates(projectId, limit);
}
