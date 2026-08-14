/**
 * Dashboard and analytics.
 *
 * Every number below is an aggregation over the live graph. Nothing is cached,
 * pre-computed or hardcoded - "top skills" is a count over HAS_SKILL, and
 * "most connected employees" is a degree count over WORKED_WITH.
 *
 * See ./README-cognodb.md.
 */

/**
 * Headline counts.
 *
 * Each label is counted in its own aggregation step. Matching several labels
 * in one pattern would produce a cross product - 84 employees x 20 projects
 * rows to compute two numbers.
 */
export const DASHBOARD_STATS = `
MATCH (e:Employee)
WITH count(e) AS totalEmployees,
	count(CASE WHEN e.availability = 'Available' THEN 1 END) AS availableEmployees
MATCH (s:Skill)
WITH totalEmployees, availableEmployees, count(s) AS totalSkills
MATCH (p:Project)
WITH totalEmployees, availableEmployees, totalSkills,
	count(p) AS totalProjects,
	count(CASE WHEN p.status = 'Active' THEN 1 END) AS activeProjects,
	count(CASE WHEN p.status = 'Planned' THEN 1 END) AS plannedProjects
MATCH (t:Team)
WITH totalEmployees, availableEmployees, totalSkills, totalProjects, activeProjects, plannedProjects,
	count(t) AS totalTeams
MATCH (c:Client)
WITH totalEmployees, availableEmployees, totalSkills, totalProjects, activeProjects, plannedProjects,
	totalTeams, count(c) AS totalClients
MATCH (n)
WITH totalEmployees, availableEmployees, totalSkills, totalProjects, activeProjects, plannedProjects,
	totalTeams, totalClients, count(n) AS totalNodes
MATCH ()-[r]->()
RETURN totalEmployees, availableEmployees, totalSkills, totalProjects, activeProjects,
	plannedProjects, totalTeams, totalClients, totalNodes, count(r) AS totalRelationships
`.trim();

export const EMPLOYEES_BY_DEPARTMENT = `
MATCH (e:Employee)
RETURN e.department AS label, count(e) AS value
ORDER BY value DESC, label ASC
`.trim();

export const EMPLOYEES_BY_SENIORITY = `
MATCH (e:Employee)
WITH e.seniority AS label, count(e) AS value
RETURN label, value,
	CASE label
		WHEN 'Junior' THEN 1 WHEN 'Mid' THEN 2 WHEN 'Senior' THEN 3
		WHEN 'Lead' THEN 4 ELSE 5 END AS rank
ORDER BY rank ASC
`.trim();

export const EMPLOYEES_BY_AVAILABILITY = `
MATCH (e:Employee)
RETURN e.availability AS label, count(e) AS value
ORDER BY value DESC
`.trim();

export const TOP_SKILLS = `
MATCH (e:Employee)-[hs:HAS_SKILL]->(s:Skill)
WITH s, count(e) AS value, avg(hs.proficiency) AS averageProficiency
ORDER BY value DESC, s.name ASC
LIMIT $limit
RETURN s.name AS label, s.category AS category, value, averageProficiency
`.trim();

export const PROJECTS_BY_DOMAIN = `
MATCH (p:Project)-[:IN_DOMAIN]->(d:Domain)
RETURN d.name AS label, count(p) AS value
ORDER BY value DESC, label ASC
`.trim();

/**
 * Skills by department - a two-hop aggregation.
 *
 *   Department (a property of Employee) <- Employee -HAS_SKILL-> Skill
 *
 * There is no Department node; department is an employee attribute, so this
 * groups on the property rather than traversing to a node.
 */
export const SKILLS_BY_DEPARTMENT = `
MATCH (e:Employee)-[:HAS_SKILL]->(s:Skill)
WITH e.department AS department, s.category AS category, count(*) AS value
ORDER BY department ASC, value DESC
RETURN department, category, value
`.trim();

export const MOST_EXPERIENCED = `
MATCH (e:Employee)
WITH e
ORDER BY e.yearsOfExperience DESC, e.name ASC
LIMIT $limit
OPTIONAL MATCH (e)-[:WORKED_ON]->(p:Project)
RETURN e AS employee, count(DISTINCT p) AS projectCount
`.trim();

/**
 * Most connected employees - degree centrality over WORKED_WITH.
 *
 * The kind of question a graph answers directly and a relational schema
 * answers with a self-join over the assignment table grouped twice.
 */
export const MOST_CONNECTED = `
MATCH (e:Employee)-[w:WORKED_WITH]-(peer:Employee)
WITH e, count(DISTINCT peer) AS connections, sum(w.projectsTogether) AS sharedProjects
ORDER BY connections DESC, sharedProjects DESC, e.name ASC
LIMIT $limit
RETURN e AS employee, connections, sharedProjects
`.trim();

/**
 * Organisation-wide skill supply against project demand.
 *
 * Answers "which skills are we short of?" by comparing how many people hold a
 * skill against how many projects ask for it.
 */
export const SKILL_SUPPLY_VS_DEMAND = `
MATCH (s:Skill)
OPTIONAL MATCH (e:Employee)-[hs:HAS_SKILL]->(s)
WITH s, count(DISTINCT CASE WHEN hs.proficiency >= 7 THEN e END) AS strongHolders
OPTIONAL MATCH (p:Project)-[:REQUIRED_SKILL]->(s)
WITH s, strongHolders, count(DISTINCT p) AS demand
WHERE demand > 0
RETURN s.name AS label, s.category AS category, strongHolders, demand
ORDER BY demand DESC, strongHolders ASC
`.trim();

export const MOST_COLLABORATIVE_TEAMS = `
MATCH (e:Employee)-[:MEMBER_OF]->(t:Team)
WITH t, collect(e.id) AS memberIds, count(e) AS headcount
MATCH (a:Employee)-[w:WORKED_WITH]-(b:Employee)
WHERE a.id IN memberIds AND b.id IN memberIds AND a.id < b.id
RETURN t.name AS label,
	t.department AS department,
	headcount,
	count(w) AS internalConnections,
	sum(w.projectsTogether) AS sharedProjects
ORDER BY internalConnections DESC, label ASC
`.trim();
