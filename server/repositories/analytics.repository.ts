import "server-only";

import type { Node as Neo4jNode } from "neo4j-driver";

import { readRecords, toInt } from "@/lib/db/neo4j";
import * as Q from "@/server/queries/analytics.queries";
import type { Employee } from "@/types/domain";

import { asEmployee, toPlain } from "./mappers";

const number = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" ? plain : fallback;
};

const text = (value: unknown): string => String(toPlain(value) ?? "");

export interface DashboardStats {
	totalEmployees: number;
	availableEmployees: number;
	totalSkills: number;
	totalProjects: number;
	activeProjects: number;
	plannedProjects: number;
	totalTeams: number;
	totalClients: number;
	totalNodes: number;
	totalRelationships: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const records = await readRecords(Q.DASHBOARD_STATS, {});
	const record = records[0];
	const value = (key: string) => number(record?.get(key));

	return {
		totalEmployees: value("totalEmployees"),
		availableEmployees: value("availableEmployees"),
		totalSkills: value("totalSkills"),
		totalProjects: value("totalProjects"),
		activeProjects: value("activeProjects"),
		plannedProjects: value("plannedProjects"),
		totalTeams: value("totalTeams"),
		totalClients: value("totalClients"),
		totalNodes: value("totalNodes"),
		totalRelationships: value("totalRelationships"),
	};
}

export interface CountRow {
	label: string;
	value: number;
}

const countRows = async (cypher: string, params = {}): Promise<CountRow[]> => {
	const records = await readRecords(cypher, params);
	return records.map((record) => ({
		label: text(record.get("label")),
		value: number(record.get("value")),
	}));
};

export const getEmployeesByDepartment = () => countRows(Q.EMPLOYEES_BY_DEPARTMENT);
export const getEmployeesBySeniority = () => countRows(Q.EMPLOYEES_BY_SENIORITY);
export const getEmployeesByAvailability = () => countRows(Q.EMPLOYEES_BY_AVAILABILITY);
export const getProjectsByDomain = () => countRows(Q.PROJECTS_BY_DOMAIN);

export interface TopSkillRow extends CountRow {
	category: string;
	averageProficiency: number;
}

export async function getTopSkills(limit = 10): Promise<TopSkillRow[]> {
	const records = await readRecords(Q.TOP_SKILLS, { limit: toInt(limit) });
	return records.map((record) => ({
		label: text(record.get("label")),
		category: text(record.get("category")),
		value: number(record.get("value")),
		averageProficiency: Number(number(record.get("averageProficiency")).toFixed(1)),
	}));
}

export interface SkillsByDepartmentRow {
	department: string;
	category: string;
	value: number;
}

export async function getSkillsByDepartment(): Promise<SkillsByDepartmentRow[]> {
	const records = await readRecords(Q.SKILLS_BY_DEPARTMENT, {});
	return records.map((record) => ({
		department: text(record.get("department")),
		category: text(record.get("category")),
		value: number(record.get("value")),
	}));
}

export async function getMostExperienced(
	limit = 8,
): Promise<{ employee: Employee; projectCount: number }[]> {
	const records = await readRecords(Q.MOST_EXPERIENCED, { limit: toInt(limit) });
	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		projectCount: number(record.get("projectCount")),
	}));
}

export async function getMostConnected(
	limit = 8,
): Promise<{ employee: Employee; connections: number; sharedProjects: number }[]> {
	const records = await readRecords(Q.MOST_CONNECTED, { limit: toInt(limit) });
	return records.map((record) => ({
		employee: asEmployee(record.get("employee") as Neo4jNode),
		connections: number(record.get("connections")),
		sharedProjects: number(record.get("sharedProjects")),
	}));
}

export interface SupplyDemandRow {
	label: string;
	category: string;
	strongHolders: number;
	demand: number;
}

export async function getSkillSupplyVsDemand(): Promise<SupplyDemandRow[]> {
	const records = await readRecords(Q.SKILL_SUPPLY_VS_DEMAND, {});
	return records.map((record) => ({
		label: text(record.get("label")),
		category: text(record.get("category")),
		strongHolders: number(record.get("strongHolders")),
		demand: number(record.get("demand")),
	}));
}

export interface TeamCollaborationRow {
	label: string;
	department: string;
	headcount: number;
	internalConnections: number;
	sharedProjects: number;
}

export async function getMostCollaborativeTeams(): Promise<TeamCollaborationRow[]> {
	const records = await readRecords(Q.MOST_COLLABORATIVE_TEAMS, {});
	return records.map((record) => ({
		label: text(record.get("label")),
		department: text(record.get("department")),
		headcount: number(record.get("headcount")),
		internalConnections: number(record.get("internalConnections")),
		sharedProjects: number(record.get("sharedProjects")),
	}));
}
