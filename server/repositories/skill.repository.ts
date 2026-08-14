import "server-only";

import type { Node as Neo4jNode } from "neo4j-driver";

import { readRecords, toInt } from "@/lib/db/neo4j";
import * as Q from "@/server/queries/skill.queries";
import type { Employee, Project, Skill, SkillSummary } from "@/types/domain";

import { asEmployee, asProject, asSkill, toPlain } from "./mappers";

const number = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" ? plain : fallback;
};

export async function listSkills(): Promise<SkillSummary[]> {
	const records = await readRecords(Q.LIST_SKILLS, {});
	return records.map((record) => ({
		...asSkill(record.get("skill") as Neo4jNode),
		employeeCount: number(record.get("employeeCount")),
		projectCount: number(record.get("projectCount")),
		averageProficiency: Number(number(record.get("averageProficiency")).toFixed(1)),
	}));
}

export async function getSkill(skillId: string): Promise<SkillSummary | null> {
	const records = await readRecords(Q.SKILL_CORE, { skillId });
	const node = records[0]?.get("skill") as Neo4jNode | undefined;
	if (!node) return null;

	return {
		...asSkill(node),
		employeeCount: number(records[0].get("employeeCount")),
		projectCount: number(records[0].get("projectCount")),
		averageProficiency: Number(number(records[0].get("averageProficiency")).toFixed(1)),
	};
}

export async function getSkillTopEmployees(
	skillId: string,
	limit = 10,
): Promise<{ employee: Employee; proficiency: number; years: number }[]> {
	const records = await readRecords(Q.SKILL_TOP_EMPLOYEES, { skillId, limit: toInt(limit) });
	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		proficiency: number(record.get("proficiency")),
		years: number(record.get("years")),
	}));
}

export async function getSkillProjects(skillId: string, limit = 12): Promise<Project[]> {
	const records = await readRecords(Q.SKILL_PROJECTS, { skillId, limit: toInt(limit) });
	return records.map((record) => asProject(record.get("project") as Neo4jNode));
}

export async function getRelatedSkills(
	skillId: string,
	limit = 8,
): Promise<{ name: string; coOccurrences: number }[]> {
	const records = await readRecords(Q.SKILL_RELATED, { skillId, limit: toInt(limit) });
	return records.map((record) => ({
		name: String(toPlain(record.get("name")) ?? ""),
		coOccurrences: number(record.get("coOccurrences")),
	}));
}

export async function getSkillCategories(): Promise<string[]> {
	const records = await readRecords(Q.SKILL_CATEGORIES, {});
	return ((toPlain(records[0]?.get("categories")) as string[] | null) ?? []).sort();
}

export async function findSkillByName(name: string): Promise<Skill | null> {
	const records = await readRecords(Q.SKILL_BY_NAME, { name });
	const node = records[0]?.get("skill") as Neo4jNode | undefined;
	return node ? asSkill(node) : null;
}
