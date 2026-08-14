import "server-only";

import type { Node as Neo4jNode } from "neo4j-driver";

import { readRecords, toInt } from "@/lib/db/neo4j";
import * as Q from "@/server/queries/staffing.queries";
import type { Employee, Project, SkillRequirement } from "@/types/domain";

import { asEmployee, asProject, compact, toPlain } from "./mappers";

/**
 * Raw evidence for the staffing algorithm.
 *
 * Nothing here is scored. The repository returns what the graph knows; the
 * service turns it into a ranking.
 */

const number = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" ? plain : fallback;
};

/** Shape the Cypher expects for a requirement - integers must be driver ints. */
export const asRequirementParams = (requirements: SkillRequirement[]) =>
	requirements.map((requirement) => ({
		skillId: requirement.skillId,
		requiredProficiency: toInt(requirement.requiredProficiency),
		requiredYears: toInt(requirement.requiredYears),
	}));

export async function getProjectRequirements(projectId: string): Promise<{
	project: Project;
	domain: string;
	requirements: SkillRequirement[];
} | null> {
	const records = await readRecords(Q.PROJECT_REQUIREMENTS, { projectId });
	const record = records[0];
	if (!record) return null;

	const raw = (toPlain(record.get("requirements")) as
		| {
				skillId: string;
				skillName: string;
				requiredProficiency: number;
				requiredYears: number;
		  }[]
		| null) ?? [];

	return {
		project: asProject(record.get("project") as Neo4jNode),
		domain: String(toPlain(record.get("domain")) ?? ""),
		requirements: compact(raw),
	};
}

export interface SkillEvidence {
	employee: Employee;
	matchedSkills: {
		skillId: string;
		name: string;
		proficiency: number;
		years: number;
		lastUsed: string;
		required: number;
		requiredYears: number;
		meets: boolean;
	}[];
}

export async function getSkillEvidence(requirements: SkillRequirement[]): Promise<SkillEvidence[]> {
	const records = await readRecords(Q.CANDIDATE_SKILL_EVIDENCE, {
		requirements: asRequirementParams(requirements),
	});

	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		matchedSkills: compact(
			(toPlain(record.get("matchedSkills")) as SkillEvidence["matchedSkills"] | null) ?? [],
		),
	}));
}

export interface ProjectEvidenceRow {
	employeeId: string;
	projectId: string;
	projectName: string;
	projectStatus: string;
	domain: string | null;
	role: string;
	technologyIds: string[];
}

export async function getProjectEvidence(candidateIds: string[]): Promise<ProjectEvidenceRow[]> {
	if (candidateIds.length === 0) return [];

	const records = await readRecords(Q.CANDIDATE_PROJECT_EVIDENCE, { candidateIds });
	return records.map((record) => ({
		employeeId: String(toPlain(record.get("employeeId")) ?? ""),
		projectId: String(toPlain(record.get("projectId")) ?? ""),
		projectName: String(toPlain(record.get("projectName")) ?? ""),
		projectStatus: String(toPlain(record.get("projectStatus")) ?? ""),
		domain: (toPlain(record.get("domain")) as string | null) ?? null,
		role: String(toPlain(record.get("role")) ?? ""),
		technologyIds: compact((toPlain(record.get("technologyIds")) as string[] | null) ?? []),
	}));
}

export interface CollaborationRow {
	aId: string;
	aName: string;
	bId: string;
	bName: string;
	projectsTogether: number;
	lastProject: string;
}

const asCollaborationRow = (record: {
	get: (key: string) => unknown;
}): CollaborationRow => ({
	aId: String(toPlain(record.get("aId")) ?? ""),
	aName: String(toPlain(record.get("aName")) ?? ""),
	bId: String(toPlain(record.get("bId")) ?? ""),
	bName: String(toPlain(record.get("bName")) ?? ""),
	projectsTogether: number(record.get("projectsTogether")),
	lastProject: String(toPlain(record.get("lastProject")) ?? ""),
});

/** Unique pairs within one set - used for the team compatibility matrix. */
export async function getCollaborationWithinPool(
	candidateIds: string[],
): Promise<CollaborationRow[]> {
	if (candidateIds.length < 2) return [];

	const records = await readRecords(Q.CANDIDATE_COLLABORATION, { candidateIds });
	return records.map(asCollaborationRow);
}

/** Directed candidate -> reference links, used for the collaboration score. */
export async function getCollaborationWithReference(
	candidateIds: string[],
	referenceIds: string[],
): Promise<CollaborationRow[]> {
	if (candidateIds.length === 0 || referenceIds.length === 0) return [];

	const records = await readRecords(Q.CANDIDATE_COLLABORATION_WITH_REFERENCE, {
		candidateIds,
		referenceIds,
	});
	return records.map(asCollaborationRow);
}

export interface ConnectedCandidate {
	employee: Employee;
	skillsMet: number;
	domainProjects: number;
	domainProjectNames: string[];
	qualifiedPeers: { name: string; projectsTogether: number }[];
}

/** The relationally-awkward query - all three constraints in one traversal. */
export async function getQualifiedConnectedCandidates(
	requirements: SkillRequirement[],
	domainName: string,
	minSkills = 2,
	limit = 20,
): Promise<ConnectedCandidate[]> {
	const records = await readRecords(Q.QUALIFIED_CONNECTED_CANDIDATES, {
		requirements: asRequirementParams(requirements),
		domainName,
		minSkills: toInt(minSkills),
		limit: toInt(limit),
	});

	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		skillsMet: number(record.get("skillsMet")),
		domainProjects: number(record.get("domainProjects")),
		domainProjectNames: compact((toPlain(record.get("domainProjectNames")) as string[] | null) ?? []),
		qualifiedPeers: compact(
			(toPlain(record.get("qualifiedPeers")) as
				| { name: string; projectsTogether: number }[]
				| null) ?? [],
		),
	}));
}

export interface MultiHopCandidate {
	employee: Employee;
	skillsMet: number;
	matchedSkills: string[];
	previousProjects: string[];
	coworkers: string[];
}

export async function getMultiHopCandidates(
	projectId: string,
	limit = 10,
): Promise<MultiHopCandidate[]> {
	const records = await readRecords(Q.CANDIDATE_MULTI_HOP, {
		projectId,
		limit: toInt(limit),
	});

	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		skillsMet: number(record.get("skillsMet")),
		matchedSkills: compact((toPlain(record.get("matchedSkills")) as string[] | null) ?? []),
		previousProjects: compact((toPlain(record.get("previousProjects")) as string[] | null) ?? []),
		coworkers: compact((toPlain(record.get("coworkers")) as string[] | null) ?? []),
	}));
}

export interface PoolCoverageRow {
	skill: string;
	requiredProficiency: number;
	covered: number;
	holders: { id: string; name: string; proficiency: number }[];
}

export async function getPoolCoverage(
	requirements: SkillRequirement[],
	candidateIds: string[],
): Promise<PoolCoverageRow[]> {
	const records = await readRecords(Q.POOL_SKILL_COVERAGE, {
		requirements: asRequirementParams(requirements),
		candidateIds,
	});

	return records.map((record) => ({
		skill: String(toPlain(record.get("skill")) ?? ""),
		requiredProficiency: number(record.get("requiredProficiency")),
		covered: number(record.get("covered")),
		holders: compact(
			(toPlain(record.get("holders")) as { id: string; name: string; proficiency: number }[] | null) ??
				[],
		),
	}));
}
