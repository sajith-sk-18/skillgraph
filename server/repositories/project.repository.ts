import "server-only";

import type { Node as Neo4jNode } from "neo4j-driver";

import { readRecords, toInt, writeRecords } from "@/lib/db/neo4j";
import type { CreateProjectInput, ProjectFilters } from "@/lib/validations/schemas";
import * as Q from "@/server/queries/project.queries";
import type {
	Employee,
	Project,
	ProjectDetail,
	ProjectSummary,
	Skill,
	SkillRequirement,
} from "@/types/domain";

import { asClient, asEmployee, asProject, asSkill, compact, optional, toPlain } from "./mappers";

const number = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" ? plain : fallback;
};

export async function listProjects(filters: ProjectFilters): Promise<ProjectSummary[]> {
	const records = await readRecords(Q.buildListProjects(filters), {
		...filters,
		limit: toInt(filters.limit),
		offset: toInt(filters.offset),
	});

	return records.map((record) => ({
		...asProject(record.get("project") as Neo4jNode),
		client: optional(record.get("client") as Neo4jNode | null, asClient),
		teamCount: number(record.get("teamCount")),
		requiredSkills: compact(
			(toPlain(record.get("requiredSkills")) as
				| { name: string; requiredProficiency: number }[]
				| null) ?? [],
		),
	}));
}

export async function countProjects(filters: ProjectFilters): Promise<number> {
	const records = await readRecords(Q.buildCountProjects(filters), filters);
	return number(records[0]?.get("total"));
}

export async function getProject(
	projectId: string,
): Promise<{ project: Project; client: ReturnType<typeof asClient> | null } | null> {
	const records = await readRecords(Q.PROJECT_CORE, { projectId });
	const node = records[0]?.get("project") as Neo4jNode | undefined;
	if (!node) return null;

	return {
		project: asProject(node),
		client: optional(records[0].get("client") as Neo4jNode | null, asClient),
	};
}

export async function getProjectRequiredSkills(projectId: string): Promise<SkillRequirement[]> {
	const records = await readRecords(Q.PROJECT_REQUIRED_SKILLS, { projectId });
	return records.map((record) => {
		const skill = asSkill(record.get("skill") as Neo4jNode);
		return {
			skillId: skill.id,
			skillName: skill.name,
			requiredProficiency: number(record.get("requiredProficiency")),
			requiredYears: number(record.get("requiredYears")),
		};
	});
}

export async function getProjectTechnologies(projectId: string): Promise<Skill[]> {
	const records = await readRecords(Q.PROJECT_TECHNOLOGIES, { projectId });
	return records.map((record) => asSkill(record.get("skill") as Neo4jNode));
}

export async function getProjectTeam(
	projectId: string,
): Promise<{ employee: Employee; role: string }[]> {
	const records = await readRecords(Q.PROJECT_TEAM, { projectId });
	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		role: String(toPlain(record.get("role")) ?? ""),
	}));
}

export async function getProjectTeamIds(projectId: string): Promise<string[]> {
	const records = await readRecords(Q.PROJECT_TEAM_IDS, { projectId });
	return compact((toPlain(records[0]?.get("teamIds")) as string[] | null) ?? []);
}

export interface SkillCoverageRaw {
	skill: string;
	requiredProficiency: number;
	covered: number;
}

export async function getProjectSkillCoverage(
	projectId: string,
	teamIds: string[],
): Promise<SkillCoverageRaw[]> {
	const records = await readRecords(Q.PROJECT_SKILL_COVERAGE, { projectId, teamIds });
	return records.map((record) => ({
		skill: String(toPlain(record.get("skill")) ?? ""),
		requiredProficiency: number(record.get("requiredProficiency")),
		covered: number(record.get("covered")),
	}));
}

export async function getProjectGapSuggestions(
	projectId: string,
	teamIds: string[],
): Promise<Map<string, { id: string; name: string; proficiency: number }[]>> {
	const records = await readRecords(Q.PROJECT_GAP_SUGGESTIONS, { projectId, teamIds });
	const map = new Map<string, { id: string; name: string; proficiency: number }[]>();
	for (const record of records) {
		map.set(
			String(toPlain(record.get("skill")) ?? ""),
			compact(
				(toPlain(record.get("suggestions")) as
					| { id: string; name: string; proficiency: number }[]
					| null) ?? [],
			),
		);
	}
	return map;
}

export interface ProjectFilterOptions {
	domains: string[];
	statuses: string[];
	clients: { id: string; name: string }[];
	skills: string[];
}

export async function getProjectFilterOptions(): Promise<ProjectFilterOptions> {
	const records = await readRecords(Q.PROJECT_FILTER_OPTIONS, {});
	const record = records[0];
	return {
		domains: compact((toPlain(record?.get("domains")) as string[] | null) ?? []).sort(),
		statuses: compact((toPlain(record?.get("statuses")) as string[] | null) ?? []).sort(),
		clients: compact(
			(toPlain(record?.get("clients")) as { id: string; name: string }[] | null) ?? [],
		).sort((a, b) => a.name.localeCompare(b.name)),
		skills: compact((toPlain(record?.get("skills")) as string[] | null) ?? []).sort(),
	};
}

/**
 * Allocates the next PRJ id.
 *
 * `max(p.id)` works because the seed ids are zero-padded and therefore sort
 * lexicographically in the same order as numerically. Not a general-purpose id
 * strategy - a real system would use a sequence or a UUID - and the README
 * says so.
 */
export async function nextProjectId(): Promise<string> {
	const records = await readRecords(Q.NEXT_PROJECT_ID, {});
	const maxId = String(toPlain(records[0]?.get("maxId")) ?? "PRJ000");
	const numeric = Number.parseInt(maxId.replace(/\D/g, ""), 10) || 0;
	return `PRJ${String(numeric + 1).padStart(3, "0")}`;
}

export async function createProject(
	id: string,
	input: CreateProjectInput,
	status: string,
): Promise<Project | null> {
	const records = await writeRecords(Q.CREATE_PROJECT, {
		id,
		name: input.name,
		description: input.description,
		status,
		startDate: input.startDate,
		endDate: input.endDate || null,
		domain: input.domain,
		location: input.location,
		teamSize: toInt(input.teamSize),
		clientId: input.clientId,
		requiredSkills: input.requiredSkills.map((skill) => ({
			skillId: skill.skillId,
			requiredProficiency: toInt(skill.requiredProficiency),
			requiredYears: toInt(skill.requiredYears),
		})),
	});

	const node = records[0]?.get("project") as Neo4jNode | undefined;
	return node ? asProject(node) : null;
}

export type { ProjectDetail };
