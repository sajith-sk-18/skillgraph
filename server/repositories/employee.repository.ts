import "server-only";

import type { Node as Neo4jNode } from "neo4j-driver";

import { readRecords, toInt } from "@/lib/db/neo4j";
import type { EmployeeFilters } from "@/lib/validations/schemas";
import * as Q from "@/server/queries/employee.queries";
import type {
	Certification,
	Collaborator,
	Employee,
	EmployeeSkill,
	EmployeeSummary,
	ProjectExperience,
	Role,
	Team,
} from "@/types/domain";

import {
	asCertification,
	asClient,
	asEmployee,
	asProject,
	asRole,
	asSkill,
	asTeam,
	compact,
	optional,
	toPlain,
} from "./mappers";

/**
 * Employee reads.
 *
 * The repository knows how to speak to the driver and nothing else - no
 * scoring, no ranking, no business rules. Those live in the service layer so
 * they can be tested without a database.
 */

const number = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" ? plain : fallback;
};

export async function listEmployees(filters: EmployeeFilters): Promise<EmployeeSummary[]> {
	const records = await readRecords(Q.buildListEmployees(filters), {
		...filters,
		limit: toInt(filters.limit),
		offset: toInt(filters.offset),
		minExperience: filters.minExperience === undefined ? undefined : toInt(filters.minExperience),
	});

	return records.map((record) => ({
		...asEmployee(record.get("employee") as Neo4jNode),
		projectCount: number(record.get("projectCount")),
		topSkills: compact(
			(toPlain(record.get("topSkills")) as { name: string; proficiency: number }[] | null) ?? [],
		),
	}));
}

export async function countEmployees(filters: EmployeeFilters): Promise<number> {
	const records = await readRecords(Q.buildCountEmployees(filters), {
		...filters,
		minExperience: filters.minExperience === undefined ? undefined : toInt(filters.minExperience),
	});
	return number(records[0]?.get("total"));
}

export async function getEmployee(employeeId: string): Promise<Employee | null> {
	const records = await readRecords(Q.EMPLOYEE_CORE, { employeeId });
	const node = records[0]?.get("employee") as Neo4jNode | undefined;
	return node ? asEmployee(node) : null;
}

export async function getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
	const records = await readRecords(Q.EMPLOYEE_SKILLS, { employeeId });
	return records.map((record) => ({
		skill: asSkill(record.get("skill") as Neo4jNode),
		proficiency: number(record.get("proficiency")),
		years: number(record.get("years")),
		lastUsed: String(toPlain(record.get("lastUsed")) ?? ""),
	}));
}

export async function getEmployeeProjects(employeeId: string): Promise<ProjectExperience[]> {
	const records = await readRecords(Q.EMPLOYEE_PROJECTS, { employeeId });
	return records.map((record) => ({
		project: asProject(record.get("project") as Neo4jNode),
		client: optional(record.get("client") as Neo4jNode | null, asClient),
		role: String(toPlain(record.get("role")) ?? ""),
		startDate: String(toPlain(record.get("startDate")) ?? ""),
		endDate: (toPlain(record.get("endDate")) as string | null) ?? null,
		responsibility: String(toPlain(record.get("responsibility")) ?? ""),
		skillsUsed: compact((toPlain(record.get("skillsUsed")) as string[] | null) ?? []),
	}));
}

export async function getEmployeeCollaborators(
	employeeId: string,
	limit = 24,
): Promise<Collaborator[]> {
	const records = await readRecords(Q.EMPLOYEE_COLLABORATORS, {
		employeeId,
		limit: toInt(limit),
	});
	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		projectsTogether: number(record.get("projectsTogether")),
		lastProject: String(toPlain(record.get("lastProject")) ?? ""),
		sharedProjectNames: compact(
			(toPlain(record.get("sharedProjectNames")) as string[] | null) ?? [],
		),
	}));
}

export async function getEmployeeCertifications(employeeId: string): Promise<Certification[]> {
	const records = await readRecords(Q.EMPLOYEE_CERTIFICATIONS, { employeeId });
	return records.map((record) => asCertification(record.get("certification") as Neo4jNode));
}

export async function getEmployeeTeamsAndRoles(
	employeeId: string,
): Promise<{ teams: Team[]; roles: Role[] }> {
	const records = await readRecords(Q.EMPLOYEE_TEAMS_AND_ROLES, { employeeId });
	const record = records[0];
	if (!record) return { teams: [], roles: [] };

	return {
		teams: compact((record.get("teams") as (Neo4jNode | null)[]) ?? []).map(asTeam),
		roles: compact((record.get("roles") as (Neo4jNode | null)[]) ?? []).map(asRole),
	};
}

export async function getEmployeeDomains(
	employeeId: string,
): Promise<{ name: string; projectCount: number }[]> {
	const records = await readRecords(Q.EMPLOYEE_DOMAINS, { employeeId });
	return records.map((record) => ({
		name: String(toPlain(record.get("name")) ?? ""),
		projectCount: number(record.get("projectCount")),
	}));
}

export interface EmployeeFilterOptions {
	departments: string[];
	locations: string[];
	seniorities: string[];
	roles: string[];
	skills: string[];
}

export async function getEmployeeFilterOptions(): Promise<EmployeeFilterOptions> {
	const records = await readRecords(Q.EMPLOYEE_FILTER_OPTIONS, {});
	const record = records[0];
	const list = (key: string): string[] =>
		compact((toPlain(record?.get(key)) as string[] | null) ?? []).sort((a, b) => a.localeCompare(b));

	return {
		departments: list("departments"),
		locations: list("locations"),
		seniorities: list("seniorities"),
		roles: list("roles"),
		skills: list("skills"),
	};
}
