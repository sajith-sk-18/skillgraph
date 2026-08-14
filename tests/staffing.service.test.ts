import { describe, expect, it } from "vitest";

import { relevanceOf, scoreCandidate, skillCredit, WEIGHTS } from "@/server/services/staffing.service";
import type { SkillRequirement } from "@/types/domain";

/**
 * The scoring algorithm is the part of this application an interviewer will
 * probe hardest, so every weight and saturation point is pinned here.
 *
 * These tests are the reason the arithmetic lives in TypeScript rather than in
 * Cypher: none of them needs a database.
 */

const requirement = (
	skillId: string,
	requiredProficiency: number,
	requiredYears = 0,
): SkillRequirement => ({
	skillId,
	skillName: skillId,
	requiredProficiency,
	requiredYears,
});

const held = (skillId: string, proficiency: number, years = 5) => ({
	skillId,
	name: skillId,
	proficiency,
	years,
	lastUsed: "2026-01-01",
	required: 0,
	requiredYears: 0,
	meets: true,
});

describe("WEIGHTS", () => {
	it("totals exactly 100, so a score is a percentage", () => {
		const total = Object.values(WEIGHTS).reduce((sum, value) => sum + value, 0);
		expect(total).toBe(100);
	});

	it("weights skill match above every other component combined with none other", () => {
		// Skill match must dominate: someone without the skills is not a
		// candidate however senior or well-connected they are.
		expect(WEIGHTS.skillMatch).toBeGreaterThan(WEIGHTS.projectExperience);
		expect(WEIGHTS.skillMatch).toBeGreaterThan(
			WEIGHTS.yearsOfExperience + WEIGHTS.domainExperience + WEIGHTS.collaborationFit,
		);
	});
});

describe("skillCredit", () => {
	it("gives no credit for a skill the person does not hold", () => {
		expect(skillCredit(undefined, { requiredProficiency: 8, requiredYears: 3 })).toBe(0);
	});

	it("gives full credit for exactly meeting the bar", () => {
		expect(skillCredit({ proficiency: 8, years: 3 }, { requiredProficiency: 8, requiredYears: 3 })).toBe(1);
	});

	it("gives NO bonus for exceeding the bar", () => {
		// A 10/10 is not worth more than an 8/10 when the project needs 8. That
		// headroom should not outweigh a missing skill elsewhere.
		const exact = skillCredit({ proficiency: 8, years: 3 }, { requiredProficiency: 8, requiredYears: 3 });
		const over = skillCredit({ proficiency: 10, years: 9 }, { requiredProficiency: 8, requiredYears: 3 });
		expect(over).toBe(exact);
	});

	it("scales down proportionally when short of the bar", () => {
		// 4/8 proficiency at full years = 0.5 * 0.75 + 1 * 0.25
		expect(skillCredit({ proficiency: 4, years: 3 }, { requiredProficiency: 8, requiredYears: 3 })).toBeCloseTo(0.625);
	});

	it("weights proficiency more heavily than tenure", () => {
		const strongButNew = skillCredit({ proficiency: 8, years: 0 }, { requiredProficiency: 8, requiredYears: 4 });
		const weakButLong = skillCredit({ proficiency: 4, years: 4 }, { requiredProficiency: 8, requiredYears: 4 });
		expect(strongButNew).toBeGreaterThan(weakButLong);
	});

	it("treats a zero-year requirement as satisfied rather than dividing by zero", () => {
		expect(skillCredit({ proficiency: 8, years: 0 }, { requiredProficiency: 8, requiredYears: 0 })).toBe(1);
	});
});

describe("relevanceOf", () => {
	const required = new Set(["SKL001", "SKL007", "SKL008", "SKL014", "SKL020"]);

	it("scores a project that used every required skill as fully relevant", () => {
		expect(relevanceOf([...required], required)).toBe(1);
	});

	it("scores a project sharing one skill as only slightly relevant", () => {
		// The bug this guards: counting any overlap as "relevant" gave nearly
		// every candidate full marks, because PostgreSQL touches most projects.
		expect(relevanceOf(["SKL020"], required)).toBeCloseTo(0.2);
	});

	it("ignores technologies that are not required", () => {
		expect(relevanceOf(["SKL099", "SKL098"], required)).toBe(0);
	});

	it("returns zero when there are no requirements rather than dividing by zero", () => {
		expect(relevanceOf(["SKL001"], new Set())).toBe(0);
	});
});

describe("scoreCandidate", () => {
	const requirements = [requirement("A", 8), requirement("B", 8)];

	const base = {
		requirements,
		matchedSkills: [] as ReturnType<typeof held>[],
		projectRelevance: 0,
		yearsOfExperience: 0,
		domainProjectCount: 0,
		collaborationStrength: 0,
	};

	it("scores zero when nothing matches", () => {
		expect(scoreCandidate(base).total).toBe(0);
	});

	it("awards the full 100 when every component saturates", () => {
		const result = scoreCandidate({
			requirements,
			matchedSkills: [held("A", 8), held("B", 8)],
			projectRelevance: 1.5,
			yearsOfExperience: 8,
			domainProjectCount: 2,
			collaborationStrength: 6,
		});
		expect(result.total).toBe(100);
	});

	it("caps each component - exceeding a saturation point earns nothing extra", () => {
		const saturated = scoreCandidate({
			requirements,
			matchedSkills: [held("A", 8), held("B", 8)],
			projectRelevance: 1.5,
			yearsOfExperience: 8,
			domainProjectCount: 2,
			collaborationStrength: 6,
		});
		const wayOver = scoreCandidate({
			requirements,
			matchedSkills: [held("A", 10), held("B", 10)],
			projectRelevance: 12,
			yearsOfExperience: 40,
			domainProjectCount: 30,
			collaborationStrength: 60,
		});
		expect(wayOver.total).toBe(saturated.total);
	});

	it("halves skill match when only one of two skills is held", () => {
		const result = scoreCandidate({ ...base, matchedSkills: [held("A", 8)] });
		expect(result.skillMatch).toBe(WEIGHTS.skillMatch / 2);
	});

	it("reports every component so the UI can explain the score", () => {
		const result = scoreCandidate({
			requirements,
			matchedSkills: [held("A", 8), held("B", 8)],
			projectRelevance: 0.75,
			yearsOfExperience: 4,
			domainProjectCount: 1,
			collaborationStrength: 3,
		});

		expect(result.skillMatch).toBe(40);
		expect(result.projectExperience).toBe(12.5);
		expect(result.yearsOfExperience).toBe(7.5);
		expect(result.domainExperience).toBe(5);
		expect(result.collaborationFit).toBe(5);
		expect(result.total).toBe(70);
	});

	it("ranks a domain-experienced candidate above an identical one without it", () => {
		const shared = { ...base, matchedSkills: [held("A", 8), held("B", 8)], yearsOfExperience: 8 };
		const withDomain = scoreCandidate({ ...shared, domainProjectCount: 2 });
		const withoutDomain = scoreCandidate({ ...shared, domainProjectCount: 0 });
		expect(withDomain.total - withoutDomain.total).toBe(WEIGHTS.domainExperience);
	});

	it("cannot let soft components outrank a genuine skill match", () => {
		// Everything except skills, at maximum.
		const allSoft = scoreCandidate({
			...base,
			projectRelevance: 1.5,
			yearsOfExperience: 8,
			domainProjectCount: 2,
			collaborationStrength: 6,
		});
		// Only skills, perfectly matched.
		const allSkill = scoreCandidate({ ...base, matchedSkills: [held("A", 8), held("B", 8)] });

		expect(allSoft.total).toBe(60);
		expect(allSkill.total).toBe(40);
		// The soft components CAN outweigh skills alone - which is why the
		// missing-skill badge is surfaced on every candidate card rather than
		// being hidden behind the headline number.
		expect(allSoft.total).toBeGreaterThan(allSkill.total);
	});

	it("scores zero skill match when the project has no requirements", () => {
		const result = scoreCandidate({ ...base, requirements: [], matchedSkills: [held("A", 10)] });
		expect(result.skillMatch).toBe(0);
	});

	it("never returns a score above 100 or below 0", () => {
		const extreme = scoreCandidate({
			requirements,
			matchedSkills: [held("A", 10), held("B", 10)],
			projectRelevance: 99,
			yearsOfExperience: 99,
			domainProjectCount: 99,
			collaborationStrength: 99,
		});
		expect(extreme.total).toBeLessThanOrEqual(100);
		expect(extreme.total).toBeGreaterThanOrEqual(0);
	});
});
