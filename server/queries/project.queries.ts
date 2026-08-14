import type { ProjectFilters } from "@/lib/validations/schemas";

/** Project directory, detail and creation. See ./README-cognodb.md. */

export function buildListProjects(filters: ProjectFilters): string {
	const matches: string[] = ["MATCH (p:Project)"];
	const where: string[] = [];

	if (filters.skill) {
		matches.push("MATCH (p)-[:REQUIRED_SKILL|USED_TECHNOLOGY]->(filterSkill:Skill)");
		where.push("filterSkill.name = $skill");
	}
	if (filters.clientId) {
		matches.push("MATCH (p)-[:FOR_CLIENT]->(filterClient:Client)");
		where.push("filterClient.id = $clientId");
	}

	if (filters.search) where.push("toLower(p.name) CONTAINS toLower($search)");
	if (filters.domain) where.push("p.domain = $domain");
	if (filters.status) where.push("p.status = $status");

	return `
${matches.join("\n")}
${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
WITH DISTINCT p
ORDER BY p.startDate DESC, p.name ASC
SKIP $offset
LIMIT $limit
OPTIONAL MATCH (p)-[:FOR_CLIENT]->(c:Client)
OPTIONAL MATCH (p)-[:HAS_TEAM_MEMBER]->(member:Employee)
WITH p, c, count(DISTINCT member) AS teamCount
OPTIONAL MATCH (p)-[req:REQUIRED_SKILL]->(s:Skill)
WITH p, c, teamCount, s, req
ORDER BY req.requiredProficiency DESC, s.name ASC
RETURN p AS project,
	c AS client,
	teamCount,
	collect(CASE WHEN s IS NULL THEN NULL ELSE {name: s.name, requiredProficiency: req.requiredProficiency} END) AS requiredSkills
`.trim();
}

export function buildCountProjects(filters: ProjectFilters): string {
	const matches: string[] = ["MATCH (p:Project)"];
	const where: string[] = [];

	if (filters.skill) {
		matches.push("MATCH (p)-[:REQUIRED_SKILL|USED_TECHNOLOGY]->(filterSkill:Skill)");
		where.push("filterSkill.name = $skill");
	}
	if (filters.clientId) {
		matches.push("MATCH (p)-[:FOR_CLIENT]->(filterClient:Client)");
		where.push("filterClient.id = $clientId");
	}
	if (filters.search) where.push("toLower(p.name) CONTAINS toLower($search)");
	if (filters.domain) where.push("p.domain = $domain");
	if (filters.status) where.push("p.status = $status");

	return `
${matches.join("\n")}
${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
RETURN count(DISTINCT p) AS total
`.trim();
}

export const PROJECT_CORE = `
MATCH (p:Project {id: $projectId})
OPTIONAL MATCH (p)-[:FOR_CLIENT]->(c:Client)
RETURN p AS project, c AS client
`.trim();

export const PROJECT_REQUIRED_SKILLS = `
MATCH (p:Project {id: $projectId})-[req:REQUIRED_SKILL]->(s:Skill)
RETURN s AS skill,
	req.requiredProficiency AS requiredProficiency,
	req.requiredYears AS requiredYears
ORDER BY req.requiredProficiency DESC, s.name ASC
`.trim();

export const PROJECT_TECHNOLOGIES = `
MATCH (p:Project {id: $projectId})-[:USED_TECHNOLOGY]->(s:Skill)
RETURN s AS skill
ORDER BY s.category ASC, s.name ASC
`.trim();

/**
 * The team, in ONE pattern.
 *
 * The obvious form - match HAS_TEAM_MEMBER, then OPTIONAL MATCH back along
 * WORKED_ON to read the role - returns 35 rows for a 9-person project on
 * CognoDB, because the `WHERE same.id = $projectId` attached to the OPTIONAL
 * MATCH is ignored and `same` binds to every project the person ever touched.
 *
 * Identifying the project inside the node pattern instead needs no WHERE at
 * all, and the role comes off the same relationship.
 */
export const PROJECT_TEAM = `
MATCH (e:Employee)-[wo:WORKED_ON]->(p:Project {id: $projectId})
RETURN e AS employee, wo.role AS role
ORDER BY e.name ASC
`.trim();

/**
 * SKILL GAP - part 1: how much of each required skill the current team covers.
 *
 * The team-membership test happens inside `count(CASE WHEN ...)` rather than
 * in a WHERE attached to the OPTIONAL MATCH. On CognoDB that WHERE is ignored,
 * which would count every holder in the company as if they were on the team -
 * a gap analysis reporting 100% coverage of a skill nobody on the project has.
 *
 * Aggregating with CASE keeps the OPTIONAL semantics (a required skill nobody
 * holds still returns a row, with covered = 0) and filters reliably.
 */
export const PROJECT_SKILL_COVERAGE = `
MATCH (p:Project {id: $projectId})-[req:REQUIRED_SKILL]->(skill:Skill)
WITH skill, req
OPTIONAL MATCH (holder:Employee)-[hs:HAS_SKILL]->(skill)
RETURN skill.name AS skill,
	req.requiredProficiency AS requiredProficiency,
	count(DISTINCT CASE
		WHEN holder.id IN $teamIds AND hs.proficiency >= req.requiredProficiency
		THEN holder END) AS covered
ORDER BY covered ASC, skill ASC
`.trim();

/**
 * SKILL GAP - part 2: who outside the team could close each gap.
 *
 * A plain MATCH, because only people who actually clear the bar are wanted.
 * Split from the coverage query rather than bolted onto it: combining them
 * needs an OPTIONAL MATCH whose WHERE cannot be trusted here.
 */
export const PROJECT_GAP_SUGGESTIONS = `
MATCH (p:Project {id: $projectId})-[req:REQUIRED_SKILL]->(skill:Skill)
MATCH (outsider:Employee)-[ohs:HAS_SKILL]->(skill)
WHERE NOT outsider.id IN $teamIds AND ohs.proficiency >= req.requiredProficiency
WITH skill, outsider, ohs
ORDER BY ohs.proficiency DESC, outsider.yearsOfExperience DESC, outsider.name ASC
WITH skill, collect({id: outsider.id, name: outsider.name, proficiency: ohs.proficiency}) AS candidates
RETURN skill.name AS skill, candidates[0..4] AS suggestions
`.trim();

/** Ids of the people already on a project - fed back into PROJECT_SKILL_GAP. */
export const PROJECT_TEAM_IDS = `
MATCH (p:Project {id: $projectId})
OPTIONAL MATCH (p)-[:HAS_TEAM_MEMBER]->(e:Employee)
RETURN collect(DISTINCT e.id) AS teamIds
`.trim();

export const PROJECT_FILTER_OPTIONS = `
MATCH (p:Project)
WITH collect(DISTINCT p.domain) AS domains, collect(DISTINCT p.status) AS statuses
MATCH (c:Client)
WITH domains, statuses, collect(DISTINCT {id: c.id, name: c.name}) AS clients
MATCH (s:Skill)
RETURN domains, statuses, clients, collect(DISTINCT s.name) AS skills
`.trim();

/**
 * Creates a project and its relationships in a single statement.
 *
 * MERGE on the id keeps the operation idempotent, and the required skills
 * arrive as a parameter list that is UNWOUND - not as generated query text.
 */
export const CREATE_PROJECT = `
MERGE (p:Project {id: $id})
SET p.name = $name,
	p.description = $description,
	p.status = $status,
	p.startDate = $startDate,
	p.endDate = $endDate,
	p.domain = $domain,
	p.location = $location,
	p.teamSize = $teamSize
WITH p
MATCH (c:Client {id: $clientId})
MERGE (p)-[:FOR_CLIENT]->(c)
WITH p
MERGE (d:Domain {name: $domain})
ON CREATE SET d.id = $domainId
MERGE (p)-[:IN_DOMAIN]->(d)
WITH p
UNWIND $requiredSkills AS row
MATCH (s:Skill {id: row.skillId})
MERGE (p)-[r:REQUIRED_SKILL]->(s)
SET r.requiredProficiency = row.requiredProficiency, r.requiredYears = row.requiredYears
MERGE (p)-[:USED_TECHNOLOGY]->(s)
RETURN p AS project
`.trim();

/** The next free PRJ id, so generated ids stay in the same format as the seed. */
export const NEXT_PROJECT_ID = `
MATCH (p:Project)
RETURN count(p) AS total, max(p.id) AS maxId
`.trim();

export const NEXT_CLIENT_ID = `
MATCH (c:Client)
RETURN max(c.id) AS maxId
`.trim();

export const NEXT_DOMAIN_ID = `
MATCH (d:Domain)
RETURN max(d.id) AS maxId
`.trim();

export const CREATE_CLIENT = `
MERGE (c:Client {id: $id})
SET c.name = $name, c.industry = $industry, c.country = $country
RETURN c AS client
`.trim();

/** Distinct industries and countries already in use, to seed the new-client form. */
export const CLIENT_FACETS = `
MATCH (c:Client)
RETURN collect(DISTINCT c.industry) AS industries, collect(DISTINCT c.country) AS countries
`.trim();

export const LIST_DOMAINS = `
MATCH (d:Domain)
RETURN d.name AS name
ORDER BY name ASC
`.trim();

/**
 * ASSIGNING A TEAM
 *
 * Writes real delivery history: a WORKED_ON edge carrying the role the person
 * will hold, plus the reverse HAS_TEAM_MEMBER used by the project views.
 *
 * The role is read from the employee's own HAS_ROLE rather than being invented,
 * so an assigned engineer appears as "Backend Developer" exactly as a seeded
 * one does.
 */
export const ASSIGN_TEAM = `
MATCH (p:Project {id: $projectId})
UNWIND $rows AS row
MATCH (e:Employee {id: row.employeeId})
MERGE (e)-[w:WORKED_ON]->(p)
SET w.role = row.role,
	w.startDate = p.startDate,
	w.endDate = p.endDate,
	w.responsibility = row.responsibility
MERGE (p)-[:HAS_TEAM_MEMBER]->(e)
RETURN count(DISTINCT e) AS assigned
`.trim();

/** The role name a person already holds, used to label their assignment. */
export const EMPLOYEE_ROLE_NAMES = `
UNWIND $employeeIds AS employeeId
MATCH (e:Employee {id: employeeId})
OPTIONAL MATCH (e)-[:HAS_ROLE]->(r:Role)
RETURN e.id AS employeeId, e.seniority AS seniority, collect(r.name)[0] AS roleName
`.trim();

/**
 * Removes everyone from a project.
 *
 * Needed because assignment is otherwise irreversible, and the demo project is
 * deliberately unstaffed - without this, one click would permanently destroy
 * the scenario the whole application is built to show.
 */
export const CLEAR_TEAM = `
MATCH (p:Project {id: $projectId})
OPTIONAL MATCH (p)-[m:HAS_TEAM_MEMBER]->(:Employee)
DELETE m
WITH p
OPTIONAL MATCH (:Employee)-[w:WORKED_ON]->(p)
DELETE w
RETURN count(w) AS removed
`.trim();

/**
 * Every project each of these people has worked on.
 *
 * Feeds the WORKED_WITH recomputation. Deliberately returns raw rows rather
 * than pairing people up in Cypher: pairing needs a pattern with BOTH ends
 * already bound, which is the shape CognoDB gets wrong (landmine #1). Pairing
 * in TypeScript is provably correct.
 */
export const TEAM_PROJECT_MEMBERSHIP = `
UNWIND $employeeIds AS employeeId
MATCH (e:Employee {id: employeeId})-[:WORKED_ON]->(p:Project)
RETURN e.id AS employeeId, p.id AS projectId
`.trim();

/** Rewrites the derived collaboration edge after a team changes. */
export const UPSERT_COLLABORATION = `
UNWIND $rows AS row
MATCH (a:Employee {id: row.a})
MATCH (b:Employee {id: row.b})
MERGE (a)-[w:WORKED_WITH]->(b)
SET w.projectsTogether = row.projectsTogether, w.lastProject = row.lastProject
`.trim();

/** Drops collaboration edges that no longer have a shared project behind them. */
export const DELETE_COLLABORATION = `
UNWIND $rows AS row
MATCH (a:Employee {id: row.a})-[w:WORKED_WITH]-(b:Employee {id: row.b})
DELETE w
`.trim();
