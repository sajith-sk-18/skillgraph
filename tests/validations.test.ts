import { describe, expect, it } from "vitest";

import {
	createProjectSchema,
	employeeFiltersSchema,
	globalSearchSchema,
	graphExplorerSchema,
	idSchema,
	staffingRequestSchema,
} from "@/lib/validations/schemas";

/**
 * Boundary validation.
 *
 * Parameterised Cypher already makes injection a non-issue - the driver never
 * interpolates values into query text. These schemas exist for a different
 * reason: a malformed request should be rejected as a 400 before it costs a
 * round trip to a 0.5 vCPU database instance.
 */

describe("idSchema", () => {
	it("accepts the id formats the seed generates", () => {
		for (const id of ["EMP001", "SKL028", "PRJ020", "CLI012", "TEAM010", "CERT010"]) {
			expect(idSchema.parse(id)).toBe(id);
		}
	});

	it("rejects anything that could only be an attempt at something else", () => {
		for (const bad of ["", "emp001", "EMP 001", "EMP001; MATCH (n)", "../../etc/passwd", "E".repeat(40)]) {
			expect(() => idSchema.parse(bad)).toThrow();
		}
	});
});

describe("employeeFiltersSchema", () => {
	it("defaults an empty query to a bounded, ordered page", () => {
		const parsed = employeeFiltersSchema.parse({});
		expect(parsed.limit).toBe(60);
		expect(parsed.offset).toBe(0);
		expect(parsed.sort).toBe("name");
		expect(parsed.search).toBe("");
	});

	it("coerces numbers arriving as query strings", () => {
		const parsed = employeeFiltersSchema.parse({ limit: "25", minExperience: "6" });
		expect(parsed.limit).toBe(25);
		expect(parsed.minExperience).toBe(6);
	});

	it("refuses an unbounded page size", () => {
		expect(() => employeeFiltersSchema.parse({ limit: "100000" })).toThrow();
		expect(() => employeeFiltersSchema.parse({ limit: "0" })).toThrow();
	});

	it("rejects an unknown sort key rather than passing it toward Cypher", () => {
		expect(() => employeeFiltersSchema.parse({ sort: "yearsOfExperience DESC; MATCH" })).toThrow();
	});

	it("rejects a seniority outside the known set", () => {
		expect(() => employeeFiltersSchema.parse({ seniority: "Overlord" })).toThrow();
	});
});

describe("graphExplorerSchema", () => {
	it("hard-caps traversal depth", () => {
		expect(graphExplorerSchema.parse({ nodeId: "EMP001", depth: "3" }).depth).toBe(3);
		expect(() => graphExplorerSchema.parse({ nodeId: "EMP001", depth: "9" })).toThrow();
	});

	it("caps how many paths a single expansion can request", () => {
		// The depth is interpolated into the query text, so this schema is the
		// only thing standing between a URL and an unbounded traversal.
		expect(graphExplorerSchema.parse({ nodeId: "EMP001" }).limit).toBe(60);
		expect(() => graphExplorerSchema.parse({ nodeId: "EMP001", limit: "99999" })).toThrow();
	});
});

describe("staffingRequestSchema", () => {
	it("accepts a saved project", () => {
		const parsed = staffingRequestSchema.parse({ projectId: "PRJ001" });
		expect(parsed.teamSize).toBe(5);
	});

	it("accepts an ad-hoc requirement with no project", () => {
		const parsed = staffingRequestSchema.parse({
			requiredSkills: [{ skillId: "SKL001", requiredProficiency: 8, requiredYears: 3 }],
		});
		expect(parsed.requiredSkills).toHaveLength(1);
	});

	it("refuses a request that specifies neither", () => {
		expect(() => staffingRequestSchema.parse({})).toThrow();
		expect(() => staffingRequestSchema.parse({ teamSize: 5 })).toThrow();
	});

	it("keeps proficiency inside the documented 1-10 scale", () => {
		expect(() =>
			staffingRequestSchema.parse({
				requiredSkills: [{ skillId: "SKL001", requiredProficiency: 11, requiredYears: 0 }],
			}),
		).toThrow();
	});
});

describe("createProjectSchema", () => {
	const valid = {
		name: "Regional Payments Platform",
		description: "A payments hub",
		domain: "FinTech",
		clientId: "CLI009",
		location: "Dubai",
		startDate: "2026-09-01",
		teamSize: 6,
		requiredSkills: [{ skillId: "SKL007", requiredProficiency: 8, requiredYears: 3 }],
	};

	it("accepts a well-formed project", () => {
		expect(createProjectSchema.parse(valid).name).toBe(valid.name);
	});

	it("requires at least one skill - a project with no requirement cannot be staffed", () => {
		expect(() => createProjectSchema.parse({ ...valid, requiredSkills: [] })).toThrow();
	});

	it("rejects a malformed date rather than writing it to the graph", () => {
		expect(() => createProjectSchema.parse({ ...valid, startDate: "01/09/2026" })).toThrow();
	});

	it("allows an empty end date for open-ended work", () => {
		expect(createProjectSchema.parse({ ...valid, endDate: "" }).endDate).toBe("");
	});

	it("rejects a client id that is not an id", () => {
		expect(() => createProjectSchema.parse({ ...valid, clientId: "Apex Payments" })).toThrow();
	});
});

describe("globalSearchSchema", () => {
	it("requires something to search for", () => {
		expect(() => globalSearchSchema.parse({ q: "" })).toThrow();
	});

	it("bounds the query length", () => {
		expect(() => globalSearchSchema.parse({ q: "x".repeat(200) })).toThrow();
	});
});
