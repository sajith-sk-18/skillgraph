import { describe, expect, it } from "vitest";

import { buildCountEmployees, buildListEmployees } from "@/server/queries/employee.queries";
import { buildNeighborhood } from "@/server/queries/graph.queries";
import { buildCountProjects, buildListProjects } from "@/server/queries/project.queries";
import type { EmployeeFilters, ProjectFilters } from "@/lib/validations/schemas";

/**
 * The query builders are the ONLY place this application assembles Cypher text
 * rather than sending a fixed string with bound parameters. That makes them the
 * only place an injection could exist, so they get their own tests.
 *
 * The contract: a builder may vary the SHAPE of a query from fixed fragments,
 * but no value supplied by a user may ever appear in the query text.
 */

const HOSTILE = "x' OR 1=1 //";
const DESTRUCTIVE = "'; MATCH (n) DETACH DELETE n; //";

const employeeFilters = (over: Partial<EmployeeFilters> = {}): EmployeeFilters =>
	({
		search: "",
		sort: "name",
		limit: 60,
		offset: 0,
		...over,
	}) as EmployeeFilters;

const projectFilters = (over: Partial<ProjectFilters> = {}): ProjectFilters =>
	({ search: "", limit: 60, offset: 0, ...over }) as ProjectFilters;

describe("no user value reaches query text", () => {
	const hostileEmployee = employeeFilters({
		search: HOSTILE,
		department: DESTRUCTIVE,
		seniority: HOSTILE as EmployeeFilters["seniority"],
		availability: DESTRUCTIVE as EmployeeFilters["availability"],
		location: HOSTILE,
		skill: DESTRUCTIVE,
		role: HOSTILE,
		minExperience: 5,
	});

	const hostileProject = projectFilters({
		search: HOSTILE,
		domain: DESTRUCTIVE,
		status: HOSTILE as ProjectFilters["status"],
		clientId: DESTRUCTIVE,
		skill: HOSTILE,
	});

	const generated: [string, string][] = [
		["buildListEmployees", buildListEmployees(hostileEmployee)],
		["buildCountEmployees", buildCountEmployees(hostileEmployee)],
		["buildListProjects", buildListProjects(hostileProject)],
		["buildCountProjects", buildCountProjects(hostileProject)],
	];

	it.each(generated)("%s never embeds the supplied values", (_name, cypher) => {
		expect(cypher).not.toContain(HOSTILE);
		expect(cypher).not.toContain(DESTRUCTIVE);
		expect(cypher).not.toContain("OR 1=1");
		expect(cypher).not.toContain("DETACH DELETE");
	});

	/**
	 * Absence of the hostile string is necessary but not sufficient - a builder
	 * that silently dropped the filter would also pass. These assert the value
	 * was ROUTED to a bound parameter, using the placeholders each builder
	 * actually owns.
	 */
	it("routes every employee filter to a bound parameter", () => {
		const cypher = buildListEmployees(hostileEmployee);
		for (const placeholder of [
			"$search",
			"$department",
			"$seniority",
			"$availability",
			"$location",
			"$skill",
			"$role",
			"$minExperience",
		]) {
			expect(cypher).toContain(placeholder);
		}
	});

	it("routes every project filter to a bound parameter", () => {
		const cypher = buildListProjects(hostileProject);
		for (const placeholder of ["$search", "$domain", "$status", "$clientId", "$skill"]) {
			expect(cypher).toContain(placeholder);
		}
	});
});

describe("buildListEmployees", () => {
	it("adds no filtering clause when nothing is filtered", () => {
		const cypher = buildListEmployees(employeeFilters());
		expect(cypher).not.toContain("WHERE");
		// An unused OPTIONAL MATCH for the skill filter would multiply rows.
		expect(cypher).not.toContain("filterSkill");
	});

	it("adds a joining MATCH only when a skill filter is present", () => {
		expect(buildListEmployees(employeeFilters({ skill: "React" }))).toContain(
			"MATCH (e)-[:HAS_SKILL]->(filterSkill:Skill)",
		);
	});

	it("puts every predicate in a SINGLE WHERE clause", () => {
		// Two WHERE clauses on one MATCH is a syntax error, and was a real bug.
		const cypher = buildListEmployees(
			employeeFilters({ skill: "React", role: "Frontend Developer", department: "Engineering" }),
		);
		expect(cypher.match(/WHERE/g)).toHaveLength(1);
	});

	it("only ever orders by a known column", () => {
		for (const sort of ["name", "experience", "seniority"] as const) {
			const cypher = buildListEmployees(employeeFilters({ sort }));
			expect(cypher).toMatch(/ORDER BY (e\.name|e\.yearsOfExperience|seniorityRank)/);
		}
	});
});

describe("buildNeighborhood", () => {
	it("accepts only depths 1 to 3", () => {
		for (const depth of [1, 2, 3]) expect(() => buildNeighborhood(depth, false)).not.toThrow();
	});

	/**
	 * The depth is interpolated into the query because Cypher has no parameter
	 * for a variable-length bound. This guard is therefore the only thing
	 * between a URL and an unbounded traversal, so it is tested directly rather
	 * than relying on the Zod schema upstream.
	 */
	it("rejects any other depth, including non-integers", () => {
		for (const depth of [0, -1, 4, 9, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => buildNeighborhood(depth, false)).toThrow();
		}
	});

	it("adds the label filter only when asked", () => {
		expect(buildNeighborhood(1, false)).not.toContain("$labels");
		expect(buildNeighborhood(1, true)).toContain("$labels");
	});

	it("keeps the node id a bound parameter", () => {
		expect(buildNeighborhood(2, false)).toContain("$nodeId");
	});
});
