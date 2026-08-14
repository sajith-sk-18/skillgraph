import { z } from "zod";

import { PROFICIENCY_MAX, PROFICIENCY_MIN } from "@/types/domain";

/**
 * Validation at every boundary that accepts outside input.
 *
 * Parameterised Cypher already makes injection a non-issue - the driver never
 * interpolates values into the query text. These schemas exist for a different
 * reason: a malformed id should be rejected as a 400 before it costs a round
 * trip to a 0.5 vCPU database instance.
 */

/** Seed ids are of the form EMP001, PRJ012, SKL004. */
export const idSchema = z
	.string()
	.trim()
	.min(4)
	.max(12)
	.regex(/^[A-Z]{2,5}\d{3,4}$/, "Not a valid identifier");

const searchSchema = z.string().trim().max(80).default("");

const pageLimit = (fallback: number, max: number) =>
	z.coerce.number().int().min(1).max(max).default(fallback);

export const employeeFiltersSchema = z.object({
	search: searchSchema,
	department: z.string().trim().max(60).optional(),
	seniority: z.enum(["Junior", "Mid", "Senior", "Lead", "Principal"]).optional(),
	availability: z.enum(["Available", "Partially Available", "Allocated"]).optional(),
	location: z.string().trim().max(60).optional(),
	skill: z.string().trim().max(60).optional(),
	role: z.string().trim().max(60).optional(),
	minExperience: z.coerce.number().int().min(0).max(40).optional(),
	sort: z.enum(["name", "experience", "seniority"]).default("name"),
	limit: pageLimit(60, 200),
	offset: z.coerce.number().int().min(0).max(5000).default(0),
});

export type EmployeeFilters = z.infer<typeof employeeFiltersSchema>;

export const projectFiltersSchema = z.object({
	search: searchSchema,
	domain: z.string().trim().max(60).optional(),
	status: z.enum(["Planned", "Active", "Completed", "On Hold"]).optional(),
	clientId: idSchema.optional(),
	skill: z.string().trim().max(60).optional(),
	limit: pageLimit(60, 200),
	offset: z.coerce.number().int().min(0).max(5000).default(0),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;

export const skillFiltersSchema = z.object({
	search: searchSchema,
	category: z.string().trim().max(60).optional(),
	sort: z.enum(["name", "employees", "projects", "proficiency"]).default("employees"),
	limit: pageLimit(80, 200),
});

const proficiencySchema = z.coerce
	.number()
	.int()
	.min(PROFICIENCY_MIN)
	.max(PROFICIENCY_MAX);

export const skillRequirementSchema = z.object({
	skillId: idSchema,
	requiredProficiency: proficiencySchema,
	requiredYears: z.coerce.number().int().min(0).max(20).default(0),
});

/** Shared by the create-project form and the ad-hoc staffing request. */
export const createProjectSchema = z.object({
	name: z.string().trim().min(3, "Give the project a name").max(120),
	description: z.string().trim().max(600).default(""),
	domain: z.string().trim().min(2, "Pick a domain").max(60),
	clientId: idSchema,
	location: z.string().trim().max(60).default("Dubai"),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
		.optional()
		.or(z.literal("")),
	teamSize: z.coerce.number().int().min(1).max(30),
	requiredSkills: z
		.array(skillRequirementSchema)
		.min(1, "A project needs at least one required skill")
		.max(15),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Staffing runs either against a saved project or a hypothetical requirement. */
export const staffingRequestSchema = z
	.object({
		projectId: idSchema.optional(),
		domain: z.string().trim().max(60).optional(),
		teamSize: z.coerce.number().int().min(1).max(15).default(5),
		limit: pageLimit(12, 40),
		requiredSkills: z.array(skillRequirementSchema).max(15).optional(),
		onlyAvailable: z.coerce.boolean().default(false),
	})
	.refine((value) => value.projectId || (value.requiredSkills?.length ?? 0) > 0, {
		message: "Select a project or specify at least one required skill",
		path: ["projectId"],
	});

export type StaffingRequest = z.infer<typeof staffingRequestSchema>;

export const graphExplorerSchema = z.object({
	nodeId: z.string().trim().min(2).max(60),
	depth: z.coerce.number().int().min(1).max(3).default(1),
	// A hub node such as a popular skill can have hundreds of edges. This cap
	// is what stops the explorer trying to render the whole database.
	limit: pageLimit(60, 150),
	labels: z.string().trim().max(200).optional(),
});

export const globalSearchSchema = z.object({
	q: z.string().trim().min(1, "Type something to search").max(60),
	limit: pageLimit(5, 20),
});
