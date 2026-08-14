/**
 * Staffing - the queries behind "who should work on this project?".
 *
 * The scoring pipeline is deliberately SPLIT into focused queries that each
 * gather one kind of evidence, rather than one query that also does the
 * arithmetic. Two reasons:
 *
 *   1. Weighted scoring in Cypher cannot be unit-tested without a live
 *      database. In TypeScript it is a pure function over the evidence, and
 *      tests/staffing.service.test.ts pins every weight.
 *   2. On the free c0 tier a single query doing traversal AND aggregation AND
 *      ordering over the whole employee set is exactly the shape that drops
 *      the connection.
 *
 * The graph still does all the RELATIONSHIP work. TypeScript only does
 * arithmetic on what the traversals return.
 *
 * See ./README-cognodb.md for the openCypher differences these avoid.
 */

/** Requirements and domain for a saved project, so staffing can run from an id. */
export const PROJECT_REQUIREMENTS = `
MATCH (p:Project {id: $projectId})
MATCH (p)-[req:REQUIRED_SKILL]->(s:Skill)
WITH p, collect({
	skillId: s.id,
	skillName: s.name,
	requiredProficiency: req.requiredProficiency,
	requiredYears: req.requiredYears
}) AS requirements
RETURN p AS project, p.domain AS domain, requirements
`.trim();

/**
 * EVIDENCE 1 - skill match.
 *
 * One row per employee holding at least one required skill, with the
 * proficiency and recency that live on HAS_SKILL. `meets` is computed here
 * because the bar differs per skill and comes from REQUIRED_SKILL.
 *
 * Bounded by the size of the workforce, so no LIMIT is needed - an employee
 * can appear at most once.
 */
export const CANDIDATE_SKILL_EVIDENCE = `
UNWIND $requirements AS reqRow
MATCH (s:Skill {id: reqRow.skillId})<-[hs:HAS_SKILL]-(e:Employee)
WITH e, collect({
	skillId: s.id,
	name: s.name,
	proficiency: hs.proficiency,
	years: hs.years,
	lastUsed: hs.lastUsed,
	required: reqRow.requiredProficiency,
	requiredYears: reqRow.requiredYears,
	meets: (hs.proficiency >= reqRow.requiredProficiency AND hs.years >= reqRow.requiredYears)
}) AS matchedSkills
RETURN e AS employee, matchedSkills
`.trim();

/**
 * EVIDENCE 2 - delivery history, two hops out.
 *
 *   Employee -WORKED_ON-> Project -IN_DOMAIN-> Domain
 *   Employee -WORKED_ON-> Project -USED_TECHNOLOGY-> Skill
 *
 * Domain experience is derived here rather than stored on the employee. The
 * service decides which of these projects count as "relevant" by intersecting
 * the technologies with the requirement list.
 */
export const CANDIDATE_PROJECT_EVIDENCE = `
UNWIND $candidateIds AS candidateId
MATCH (e:Employee {id: candidateId})-[wo:WORKED_ON]->(p:Project)
OPTIONAL MATCH (p)-[:IN_DOMAIN]->(d:Domain)
OPTIONAL MATCH (p)-[:USED_TECHNOLOGY]->(tech:Skill)
WITH e, p, wo, d, collect(DISTINCT tech.id) AS technologyIds
RETURN e.id AS employeeId,
	p.id AS projectId,
	p.name AS projectName,
	p.status AS projectStatus,
	d.name AS domain,
	wo.role AS role,
	technologyIds
`.trim();

/**
 * EVIDENCE 3 - collaboration WITHIN the candidate pool.
 *
 * This is the query that cannot use a pattern predicate. Writing
 * `WHERE (a)-[:WORKED_WITH]->(b)` over two bound employees returns zero rows
 * on CognoDB, silently. Matching the relationship and filtering the far end
 * against a collected id list is the reliable form.
 *
 * Matched undirected because WORKED_WITH is stored once per pair.
 */
export const CANDIDATE_COLLABORATION = `
MATCH (a:Employee)-[w:WORKED_WITH]-(b:Employee)
WHERE a.id IN $candidateIds AND b.id IN $candidateIds AND a.id < b.id
RETURN a.id AS aId, a.name AS aName,
	b.id AS bId, b.name AS bName,
	w.projectsTogether AS projectsTogether,
	w.lastProject AS lastProject
`.trim();

/**
 * Collaboration between every candidate and a REFERENCE set - the shortlist of
 * people most likely to actually be staffed.
 *
 * Scoring collaboration against the whole candidate pool made the component
 * worthless: with 69 people holding at least one required skill, almost
 * everyone had worked with three of them, so every candidate scored 10/10 and
 * the component ranked nothing.
 *
 * Measured against the shortlist it answers the question that matters - "has
 * this person shipped with the people who are actually going on this team?"
 *
 * `a.id < b.id` is deliberately absent: the two sets differ, so ordering the
 * ids would drop the pairs where the candidate happens to sort second.
 */
export const CANDIDATE_COLLABORATION_WITH_REFERENCE = `
MATCH (a:Employee)-[w:WORKED_WITH]-(b:Employee)
WHERE a.id IN $candidateIds AND b.id IN $referenceIds AND a.id <> b.id
RETURN a.id AS aId, a.name AS aName,
	b.id AS bId, b.name AS bName,
	w.projectsTogether AS projectsTogether,
	w.lastProject AS lastProject
`.trim();

/**
 * THE RELATIONALLY-AWKWARD QUERY
 *
 * "Find people who clear the bar on at least N required skills, AND have
 *  already delivered in this project's domain, AND have previously worked
 *  alongside another person who also clears the bar."
 *
 * The third clause is what makes this awkward outside a graph: it is
 * SELF-REFERENTIAL. The filter for a candidate depends on their relationship
 * to other members of the result set being computed. In SQL that is a
 * self-joining CTE over employee_skills, project_assignments, projects and a
 * collaboration table derived from project_assignments joined to itself - and
 * the query stops resembling the question.
 *
 * Here the qualified set is collected once and the same walk continues into
 * it. Five hops, one statement:
 *
 *   Skill <-HAS_SKILL- Employee -WORKED_ON-> Project -IN_DOMAIN-> Domain
 *                          |
 *                     WORKED_WITH
 *                          v
 *                   another qualified Employee
 */
export const QUALIFIED_CONNECTED_CANDIDATES = `
UNWIND $requirements AS reqRow
MATCH (s:Skill {id: reqRow.skillId})<-[hs:HAS_SKILL]-(candidate:Employee)
WHERE hs.proficiency >= reqRow.requiredProficiency
WITH candidate, count(DISTINCT s) AS skillsMet
WHERE skillsMet >= $minSkills
WITH collect({id: candidate.id, met: skillsMet}) AS qualified,
	collect(candidate.id) AS qualifiedIds
UNWIND qualified AS q
WITH qualifiedIds, q.id AS candidateId, q.met AS skillsMet
MATCH (c:Employee {id: candidateId})-[:WORKED_ON]->(prior:Project)-[:IN_DOMAIN]->(d:Domain)
WHERE d.name = $domainName
MATCH (c)-[w:WORKED_WITH]-(peer:Employee)
WHERE peer.id IN qualifiedIds AND peer.id <> candidateId
RETURN c AS employee,
	skillsMet,
	count(DISTINCT prior) AS domainProjects,
	collect(DISTINCT prior.name) AS domainProjectNames,
	collect(DISTINCT {name: peer.name, projectsTogether: w.projectsTogether}) AS qualifiedPeers
LIMIT $limit
`.trim();

/**
 * THE MULTI-HOP CANDIDATE QUERY
 *
 * A single traversal that collects, for everyone clearing the bar on a
 * required skill, their matched skills, their whole delivery history and
 * everyone they have worked with.
 *
 * Each OPTIONAL MATCH is aggregated before the next one begins. Chaining two
 * un-aggregated OPTIONAL MATCHes would produce a cross product of projects x
 * co-workers - hundreds of rows per employee to describe a handful of facts.
 */
export const CANDIDATE_MULTI_HOP = `
MATCH (p:Project {id: $projectId})-[req:REQUIRED_SKILL]->(skill:Skill)
MATCH (employee:Employee)-[hs:HAS_SKILL]->(skill)
WHERE hs.proficiency >= req.requiredProficiency
WITH employee, count(DISTINCT skill) AS skillsMet, collect(DISTINCT skill.name) AS matchedSkills
ORDER BY skillsMet DESC, employee.name ASC
LIMIT $limit
OPTIONAL MATCH (employee)-[:WORKED_ON]->(previous:Project)
WITH employee, skillsMet, matchedSkills, collect(DISTINCT previous.name) AS previousProjects
OPTIONAL MATCH (employee)-[:WORKED_WITH]-(coworker:Employee)
WITH employee, skillsMet, matchedSkills, previousProjects,
	collect(DISTINCT coworker.name) AS coworkers
RETURN employee, skillsMet, matchedSkills, previousProjects, coworkers
`.trim();

/**
 * Skills the candidate pool can offer, used to score team skill coverage.
 *
 * The pool membership and proficiency tests are inside the aggregation for the
 * same reason as PROJECT_SKILL_COVERAGE: a WHERE on an OPTIONAL MATCH does not
 * filter here, so every holder in the company would be counted as if they were
 * in the shortlist.
 */
export const POOL_SKILL_COVERAGE = `
UNWIND $requirements AS reqRow
MATCH (s:Skill {id: reqRow.skillId})
OPTIONAL MATCH (e:Employee)-[hs:HAS_SKILL]->(s)
RETURN s.name AS skill,
	reqRow.requiredProficiency AS requiredProficiency,
	count(DISTINCT CASE
		WHEN e.id IN $candidateIds AND hs.proficiency >= reqRow.requiredProficiency
		THEN e END) AS covered,
	collect(DISTINCT CASE
		WHEN e.id IN $candidateIds AND hs.proficiency >= reqRow.requiredProficiency
		THEN {id: e.id, name: e.name, proficiency: hs.proficiency} END) AS holders
`.trim();
