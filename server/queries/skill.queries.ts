/** Skill catalogue and skill detail. See ./README-cognodb.md. */

/**
 * Every figure here is an aggregation over relationships, not a stored
 * counter. "How many people know React" is `count` over HAS_SKILL, so it can
 * never drift out of step with the graph.
 */
export const LIST_SKILLS = `
MATCH (s:Skill)
OPTIONAL MATCH (holder:Employee)-[hs:HAS_SKILL]->(s)
WITH s, count(DISTINCT holder) AS employeeCount, avg(hs.proficiency) AS averageProficiency
OPTIONAL MATCH (p:Project)-[:REQUIRED_SKILL|USED_TECHNOLOGY]->(s)
WITH s, employeeCount, averageProficiency, count(DISTINCT p) AS projectCount
RETURN s AS skill, employeeCount, projectCount, averageProficiency
`.trim();

export const SKILL_CORE = `
MATCH (s:Skill {id: $skillId})
OPTIONAL MATCH (holder:Employee)-[hs:HAS_SKILL]->(s)
WITH s, count(DISTINCT holder) AS employeeCount, avg(hs.proficiency) AS averageProficiency
OPTIONAL MATCH (p:Project)-[:REQUIRED_SKILL|USED_TECHNOLOGY]->(s)
RETURN s AS skill, employeeCount, averageProficiency, count(DISTINCT p) AS projectCount
`.trim();

export const SKILL_TOP_EMPLOYEES = `
MATCH (e:Employee)-[hs:HAS_SKILL]->(s:Skill {id: $skillId})
WITH e, hs
ORDER BY hs.proficiency DESC, hs.years DESC, e.name ASC
LIMIT $limit
RETURN e AS employee, hs.proficiency AS proficiency, hs.years AS years
`.trim();

export const SKILL_PROJECTS = `
MATCH (p:Project)-[:REQUIRED_SKILL|USED_TECHNOLOGY]->(s:Skill {id: $skillId})
WITH DISTINCT p
ORDER BY p.startDate DESC
LIMIT $limit
RETURN p AS project
`.trim();

/**
 * Skills that appear alongside this one in the same person's profile.
 *
 * A two-hop traversal - Skill <- Employee -> Skill - that answers "what else
 * do people who know this tend to know?" without any pre-computed matrix.
 */
export const SKILL_RELATED = `
MATCH (s:Skill {id: $skillId})<-[:HAS_SKILL]-(e:Employee)-[:HAS_SKILL]->(other:Skill)
WHERE other.id <> $skillId
WITH other, count(DISTINCT e) AS coOccurrences
ORDER BY coOccurrences DESC, other.name ASC
LIMIT $limit
RETURN other.name AS name, coOccurrences
`.trim();

export const SKILL_CATEGORIES = `
MATCH (s:Skill)
RETURN collect(DISTINCT s.category) AS categories
`.trim();

export const SKILL_BY_NAME = `
MATCH (s:Skill)
WHERE toLower(s.name) = toLower($name)
RETURN s AS skill
LIMIT 1
`.trim();
