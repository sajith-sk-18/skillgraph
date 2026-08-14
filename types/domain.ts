/**
 * Domain shapes returned by the service layer.
 *
 * These are plain, serialisable objects. Driver types (Integer, Node, Path)
 * never escape the repository layer - they cannot cross the Server/Client
 * Component boundary, and leaking them makes every consumer driver-aware.
 */

export type Seniority = "Junior" | "Mid" | "Senior" | "Lead" | "Principal";
export type Availability = "Available" | "Partially Available" | "Allocated";
export type ProjectStatus = "Planned" | "Active" | "Completed" | "On Hold";

/** Proficiency is 1-10 throughout. See README "Proficiency scale". */
export const PROFICIENCY_MIN = 1;
export const PROFICIENCY_MAX = 10;

export interface Employee {
	id: string;
	name: string;
	email: string;
	jobTitle: string;
	department: string;
	location: string;
	yearsOfExperience: number;
	availability: Availability;
	seniority: Seniority;
	bio: string;
}

export interface Skill {
	id: string;
	name: string;
	category: string;
	description: string;
}

export interface Client {
	id: string;
	name: string;
	industry: string;
	country: string;
}

export interface Project {
	id: string;
	name: string;
	description: string;
	status: ProjectStatus;
	startDate: string;
	endDate: string | null;
	domain: string;
	location: string;
	teamSize: number;
}

export interface Team {
	id: string;
	name: string;
	department: string;
}

export interface Role {
	id: string;
	name: string;
	category: string;
}

export interface Certification {
	id: string;
	name: string;
	issuer: string;
	level: string;
}

export interface Domain {
	id: string;
	name: string;
}

/** `HAS_SKILL` carries the interesting data - the node alone says little. */
export interface EmployeeSkill {
	skill: Skill;
	proficiency: number;
	years: number;
	lastUsed: string;
}

/** `WORKED_ON` records what the person actually did, not just that they were there. */
export interface ProjectExperience {
	project: Project;
	client: Client | null;
	role: string;
	startDate: string;
	endDate: string | null;
	responsibility: string;
	skillsUsed: string[];
}

/** Derived from shared project history by the seed script - never hand-authored. */
export interface Collaborator {
	employee: Employee;
	projectsTogether: number;
	lastProject: string;
	sharedProjectNames: string[];
}

export interface SkillRequirement {
	skillId: string;
	skillName: string;
	requiredProficiency: number;
	requiredYears: number;
}

export interface EmployeeSummary extends Employee {
	topSkills: { name: string; proficiency: number }[];
	projectCount: number;
}

export interface EmployeeProfile extends Employee {
	skills: EmployeeSkill[];
	projects: ProjectExperience[];
	collaborators: Collaborator[];
	certifications: Certification[];
	teams: Team[];
	roles: Role[];
	domains: { name: string; projectCount: number }[];
}

export interface ProjectSummary extends Project {
	client: Client | null;
	requiredSkills: { name: string; requiredProficiency: number }[];
	teamCount: number;
}

export interface ProjectDetail extends Project {
	client: Client | null;
	requiredSkills: SkillRequirement[];
	technologies: Skill[];
	team: { employee: Employee; role: string }[];
}

export interface SkillSummary extends Skill {
	employeeCount: number;
	projectCount: number;
	averageProficiency: number;
}

export interface SkillDetail extends SkillSummary {
	topEmployees: { employee: Employee; proficiency: number; years: number }[];
	projects: Project[];
	relatedSkills: { name: string; coOccurrences: number }[];
}

/**
 * A candidate with the evidence that produced the score.
 *
 * Every component is surfaced in the UI. A recommendation a manager cannot
 * interrogate is a recommendation they will not act on.
 */
export interface CandidateMatch {
	employee: Employee;
	score: number;
	breakdown: {
		skillMatch: number;
		projectExperience: number;
		yearsOfExperience: number;
		domainExperience: number;
		collaborationFit: number;
	};
	evidence: {
		matchedSkills: { name: string; proficiency: number; required: number; meets: boolean }[];
		missingSkills: string[];
		relevantProjects: { id: string; name: string; domain: string; role: string }[];
		domainProjectCount: number;
		collaboratorsInPool: { name: string; projectsTogether: number }[];
	};
}

export interface SkillCoverageRow {
	skill: string;
	requiredProficiency: number;
	covered: number;
	total: number;
	coveragePercent: number;
	gap: number;
	suggestions: { id: string; name: string; proficiency: number }[];
}

export interface TeamRecommendation {
	members: {
		employee: Employee;
		score: number;
		coversSkills: string[];
		primarySkill: string;
	}[];
	skillCoveragePercent: number;
	coverage: SkillCoverageRow[];
	collaborationPairs: {
		a: string;
		b: string;
		projectsTogether: number;
		strength: "Strong" | "Moderate" | "None";
	}[];
	domainExperienceCount: number;
	domain: string;
}
