import "server-only";

import type { z } from "zod";

import type { skillFiltersSchema } from "@/lib/validations/schemas";
import * as repo from "@/server/repositories/skill.repository";
import type { SkillDetail, SkillSummary } from "@/types/domain";

type SkillFilters = z.infer<typeof skillFiltersSchema>;

/**
 * The catalogue is fetched whole and filtered here.
 *
 * 28 skills is small enough that a round trip per filter combination costs
 * more than sorting in memory. This is the one place in the app that does not
 * push filtering to the database, and it is a deliberate trade rather than an
 * oversight - at a few thousand skills it would move back into Cypher.
 */
export async function listSkills(filters: SkillFilters): Promise<SkillSummary[]> {
	const all = await repo.listSkills();

	const search = filters.search.toLowerCase();
	const filtered = all.filter((skill) => {
		if (search && !skill.name.toLowerCase().includes(search)) return false;
		if (filters.category && skill.category !== filters.category) return false;
		return true;
	});

	const sorted = [...filtered].sort((a, b) => {
		switch (filters.sort) {
			case "employees":
				return b.employeeCount - a.employeeCount || a.name.localeCompare(b.name);
			case "projects":
				return b.projectCount - a.projectCount || a.name.localeCompare(b.name);
			case "proficiency":
				return b.averageProficiency - a.averageProficiency || a.name.localeCompare(b.name);
			default:
				return a.name.localeCompare(b.name);
		}
	});

	return sorted.slice(0, filters.limit);
}

export async function getSkillDetail(skillId: string): Promise<SkillDetail | null> {
	const skill = await repo.getSkill(skillId);
	if (!skill) return null;

	const [topEmployees, projects, relatedSkills] = await Promise.all([
		repo.getSkillTopEmployees(skillId),
		repo.getSkillProjects(skillId),
		repo.getRelatedSkills(skillId),
	]);

	return { ...skill, topEmployees, projects, relatedSkills };
}

export const getCategories = repo.getSkillCategories;
export const findSkillByName = repo.findSkillByName;
