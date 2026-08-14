import type { EmployeeFilters } from "@/lib/validations/schemas";

/**
 * Employee directory and profile queries.
 *
 * See ./README-cognodb.md for the openCypher differences these are written
 * around. The short version: never re-use a bound node inside a later pattern,
 * and never test membership with a pattern predicate.
 */

/**
 * The directory filter is the one place a query's SHAPE varies, because a
 * skill or role filter needs an extra MATCH that must not be present
 * otherwise - an unused OPTIONAL MATCH would multiply rows.
 *
 * Only fixed fragments are assembled. Every value the user supplied stays a
 * bound parameter, so this is not string interpolation of input.
 */
export function buildListEmployees(filters: EmployeeFilters): string {
	const matches: string[] = ["MATCH (e:Employee)"];
	const where: string[] = [];

	if (filters.skill) {
		matches.push("MATCH (e)-[:HAS_SKILL]->(filterSkill:Skill)");
		where.push("filterSkill.name = $skill");
	}
	if (filters.role) {
		matches.push("MATCH (e)-[:HAS_ROLE]->(filterRole:Role)");
		where.push("filterRole.name = $role");
	}

	if (filters.search) where.push("toLower(e.name) CONTAINS toLower($search)");
	if (filters.department) where.push("e.department = $department");
	if (filters.seniority) where.push("e.seniority = $seniority");
	if (filters.availability) where.push("e.availability = $availability");
	if (filters.location) where.push("e.location = $location");
	if (filters.minExperience !== undefined) where.push("e.yearsOfExperience >= $minExperience");

	const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

	const order =
		filters.sort === "experience"
			? "e.yearsOfExperience DESC, e.name ASC"
			: filters.sort === "seniority"
				? "seniorityRank DESC, e.yearsOfExperience DESC"
				: "e.name ASC";

	return `
${matches.join("\n")}
${whereClause}
WITH DISTINCT e
WITH e, CASE e.seniority
	WHEN 'Principal' THEN 5 WHEN 'Lead' THEN 4 WHEN 'Senior' THEN 3
	WHEN 'Mid' THEN 2 ELSE 1 END AS seniorityRank
ORDER BY ${order}
SKIP $offset
LIMIT $limit
OPTIONAL MATCH (e)-[:WORKED_ON]->(worked:Project)
WITH e, count(DISTINCT worked) AS projectCount
OPTIONAL MATCH (e)-[hs:HAS_SKILL]->(s:Skill)
WITH e, projectCount, s, hs
ORDER BY hs.proficiency DESC, s.name ASC
WITH e, projectCount,
	collect(CASE WHEN s IS NULL THEN NULL ELSE {name: s.name, proficiency: hs.proficiency} END) AS allSkills
RETURN e AS employee, projectCount, allSkills[0..4] AS topSkills
`.trim();
}

/** Count for the same filter set, so the directory can show a real total. */
export function buildCountEmployees(filters: EmployeeFilters): string {
	const matches: string[] = ["MATCH (e:Employee)"];
	const where: string[] = [];

	if (filters.skill) {
		matches.push("MATCH (e)-[:HAS_SKILL]->(filterSkill:Skill)");
		where.push("filterSkill.name = $skill");
	}
	if (filters.role) {
		matches.push("MATCH (e)-[:HAS_ROLE]->(filterRole:Role)");
		where.push("filterRole.name = $role");
	}
	if (filters.search) where.push("toLower(e.name) CONTAINS toLower($search)");
	if (filters.department) where.push("e.department = $department");
	if (filters.seniority) where.push("e.seniority = $seniority");
	if (filters.availability) where.push("e.availability = $availability");
	if (filters.location) where.push("e.location = $location");
	if (filters.minExperience !== undefined) where.push("e.yearsOfExperience >= $minExperience");

	return `
${matches.join("\n")}
${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
RETURN count(DISTINCT e) AS total
`.trim();
}

export const EMPLOYEE_CORE = `
MATCH (e:Employee {id: $employeeId})
RETURN e AS employee
`.trim();

/**
 * Skills with the relationship properties that make them useful.
 *
 * The proficiency and recency live on HAS_SKILL, not on the Skill node -
 * a skill node is shared by 84 people and cannot carry anyone's proficiency.
 */
export const EMPLOYEE_SKILLS = `
MATCH (e:Employee {id: $employeeId})-[hs:HAS_SKILL]->(s:Skill)
RETURN s AS skill,
	hs.proficiency AS proficiency,
	hs.years AS years,
	hs.lastUsed AS lastUsed
`.trim();

/**
 * Project history, each with the client and the skills that project used.
 *
 * Two hops out from the employee: WORKED_ON to the project, then FOR_CLIENT
 * and USED_TECHNOLOGY from there. Collected per project so one row comes back
 * per engagement rather than one per skill.
 */
export const EMPLOYEE_PROJECTS = `
MATCH (e:Employee {id: $employeeId})-[wo:WORKED_ON]->(p:Project)
OPTIONAL MATCH (p)-[:FOR_CLIENT]->(c:Client)
OPTIONAL MATCH (p)-[:USED_TECHNOLOGY]->(tech:Skill)
WITH p, wo, c, collect(DISTINCT tech.name) AS skillsUsed
RETURN p AS project,
	c AS client,
	wo.role AS role,
	wo.startDate AS startDate,
	wo.endDate AS endDate,
	wo.responsibility AS responsibility,
	skillsUsed
ORDER BY wo.startDate DESC
`.trim();

/**
 * Co-workers, matched UNDIRECTED.
 *
 * WORKED_WITH is stored once per pair (a->b) because storing both directions
 * would double-count every aggregation. Matching with `-[w:WORKED_WITH]-`
 * makes direction irrelevant at read time.
 */
export const EMPLOYEE_COLLABORATORS = `
MATCH (e:Employee {id: $employeeId})-[w:WORKED_WITH]-(peer:Employee)
WITH peer, w
ORDER BY w.projectsTogether DESC, peer.name ASC
LIMIT $limit
MATCH (peer)-[:WORKED_ON]->(shared:Project)<-[:WORKED_ON]-(me:Employee)
WHERE me.id = $employeeId
WITH peer, w, collect(DISTINCT shared.name) AS sharedProjectNames
RETURN peer AS employee,
	w.projectsTogether AS projectsTogether,
	w.lastProject AS lastProject,
	sharedProjectNames
`.trim();

export const EMPLOYEE_CERTIFICATIONS = `
MATCH (e:Employee {id: $employeeId})-[:HOLDS_CERTIFICATION]->(c:Certification)
RETURN c AS certification
ORDER BY c.name ASC
`.trim();

export const EMPLOYEE_TEAMS_AND_ROLES = `
MATCH (e:Employee {id: $employeeId})
OPTIONAL MATCH (e)-[:MEMBER_OF]->(t:Team)
WITH e, collect(DISTINCT t) AS teams
OPTIONAL MATCH (e)-[:HAS_ROLE]->(r:Role)
RETURN teams, collect(DISTINCT r) AS roles
`.trim();

/**
 * Domain experience is DERIVED, not stored.
 *
 * There is no (Employee)-[:HAS_DOMAIN_EXPERIENCE]->(Domain) edge in this
 * model. Storing one would be a denormalisation that goes stale the moment a
 * project moves domain. Walking Employee -> Project -> Domain is two hops and
 * is always correct.
 */
export const EMPLOYEE_DOMAINS = `
MATCH (e:Employee {id: $employeeId})-[:WORKED_ON]->(p:Project)-[:IN_DOMAIN]->(d:Domain)
RETURN d.name AS name, count(DISTINCT p) AS projectCount
ORDER BY projectCount DESC, name ASC
`.trim();

/** Filter option values, read from the graph rather than hardcoded in the UI. */
export const EMPLOYEE_FILTER_OPTIONS = `
MATCH (e:Employee)
WITH collect(DISTINCT e.department) AS departments,
	collect(DISTINCT e.location) AS locations,
	collect(DISTINCT e.seniority) AS seniorities
MATCH (r:Role)
WITH departments, locations, seniorities, collect(DISTINCT r.name) AS roles
MATCH (s:Skill)
RETURN departments, locations, seniorities, roles, collect(DISTINCT s.name) AS skills
`.trim();
