/** Graph explorer traversal and global search. See ./README-cognodb.md. */

/**
 * Neighbourhood expansion around any node.
 *
 * The depth is interpolated into the query text because Cypher does not accept
 * a parameter for a variable-length bound - `-[*1..$depth]-` is a syntax
 * error. It is safe here because `depth` has already been narrowed to the
 * integers 1, 2 or 3 by graphExplorerSchema, and this function re-asserts that
 * before building anything. The node id remains a bound parameter.
 *
 * Returning whole paths and flattening them in the repository is deliberate:
 * one traversal produces both the nodes and the relationships between them, so
 * the explorer never has to make a second call to find out how two nodes
 * connect.
 */
export function buildNeighborhood(depth: number, filterLabels: boolean): string {
	if (![1, 2, 3].includes(depth)) {
		throw new Error(`Unsupported traversal depth: ${depth}`);
	}

	const labelClause = filterLabels
		? "WHERE any(l IN labels(neighbour) WHERE l IN $labels)"
		: "";

	return `
MATCH (center) WHERE center.id = $nodeId
MATCH path = (center)-[*1..${depth}]-(neighbour)
${labelClause}
WITH path
LIMIT $limit
RETURN path
`.trim();
}

/** The centre node on its own, so a node with no edges still renders. */
export const GRAPH_CENTER = `
MATCH (center) WHERE center.id = $nodeId
RETURN center
LIMIT 1
`.trim();

/**
 * Global search across every entity a user might look for.
 *
 * Scans nodes rather than using a full-text index: CognoDB's free tier holds a
 * few hundred nodes, so a scan costs less than maintaining an index would.
 * This is the one query that would need revisiting at real scale, and the
 * README says so.
 */
export const GLOBAL_SEARCH = `
MATCH (n)
WHERE (n:Employee OR n:Project OR n:Skill OR n:Client OR n:Team)
	AND toLower(n.name) CONTAINS toLower($q)
WITH n, labels(n)[0] AS label
ORDER BY size(n.name) ASC, n.name ASC
RETURN label,
	n.id AS id,
	n.name AS name,
	n.jobTitle AS jobTitle,
	n.department AS department,
	n.domain AS domain,
	n.category AS category,
	n.industry AS industry,
	n.status AS status
LIMIT $limit
`.trim();

/** Details for a node clicked in the explorer, whatever its label. */
export const GRAPH_NODE_DETAIL = `
MATCH (n) WHERE n.id = $nodeId
OPTIONAL MATCH (n)-[r]-(other)
WITH n, type(r) AS relType, count(*) AS relCount
WITH n, collect(CASE WHEN relType IS NULL THEN NULL ELSE {type: relType, count: relCount} END) AS connections
RETURN n AS node, labels(n)[0] AS label, connections
`.trim();

/** Seed options for the explorer's entity picker. */
export const EXPLORER_STARTING_POINTS = `
MATCH (e:Employee)
WITH collect({id: e.id, name: e.name, label: 'Employee', detail: e.jobTitle})[0..40] AS employees
MATCH (p:Project)
WITH employees, collect({id: p.id, name: p.name, label: 'Project', detail: p.domain})[0..30] AS projects
MATCH (s:Skill)
WITH employees, projects, collect({id: s.id, name: s.name, label: 'Skill', detail: s.category})[0..30] AS skills
MATCH (c:Client)
WITH employees, projects, skills, collect({id: c.id, name: c.name, label: 'Client', detail: c.industry})[0..20] AS clients
MATCH (t:Team)
RETURN employees, projects, skills, clients,
	collect({id: t.id, name: t.name, label: 'Team', detail: t.department})[0..20] AS teams
`.trim();
