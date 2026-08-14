# CognoDB openCypher notes

CognoDB speaks openCypher over Bolt 5.0-5.4, which is close to Neo4j's Cypher
but not identical. Three differences cost real debugging time on this project
and every query in `server/queries/` is written around them.

**They fail silently.** None of these raise an error. The query returns *a*
result - just the wrong one - so only a live assertion catches them. That is
why `scripts/verify-queries.ts` runs against the real instance rather than a
mock.

---

### 1. `OPTIONAL MATCH` between two already-bound nodes re-binds instead of testing

```cypher
MATCH (a:Employee {id: $a})
MATCH (b:Employee {id: $b})
OPTIONAL MATCH (a)-[r:WORKED_WITH]-(b)   -- does NOT test a-b
```

Instead of checking whether the relationship exists, `b` is re-bound to every
node reachable from `a`. One row becomes N x M.

**Workaround:** collect the ids first and filter with `IN`.

```cypher
MATCH (a)-[r:WORKED_WITH]-(peer:Employee)
WHERE peer.id IN $candidateIds
```

### 2. A pattern predicate over two bound nodes returns zero rows

```cypher
MATCH (e:Employee), (p:Project)
WHERE (e)-[:WORKED_ON]->(p)   -- returns NOTHING, silently
```

This does not filter - it eliminates every row. The same id-list technique
fixes it.

### 3. A `WHERE` attached to an `OPTIONAL MATCH` does not filter

The one that cost the most here, because it produces a *plausible* wrong
answer rather than an obviously broken one.

```cypher
MATCH (p:Project {id: $projectId})-[:HAS_TEAM_MEMBER]->(e:Employee)
OPTIONAL MATCH (e)-[wo:WORKED_ON]->(same:Project)
WHERE same.id = $projectId          -- ignored
RETURN e, wo.role
```

`same` binds to **every** project each person ever worked on. A nine-person
team returned 35 rows. The same shape silently inflated skill-gap coverage:
everyone in the company who held a skill was counted as though they were on
the project, so a gap analysis reported full coverage of skills nobody on the
team actually had.

Measured behaviour on this instance:

| Form | Result |
|---|---|
| `MATCH … WHERE <node property>` | correct |
| `OPTIONAL MATCH … WHERE <relationship property>` | correct |
| `OPTIONAL MATCH … WHERE <node property>` | **not filtered** |

**Workarounds, in order of preference:**

1. Put the constraint in the node pattern - `(p:Project {id: $projectId})` -
   so no `WHERE` is needed at all.
2. Use a plain `MATCH` when only matching rows are wanted.
3. Keep the `OPTIONAL MATCH` and move the condition into the aggregation:
   `count(DISTINCT CASE WHEN … THEN holder END)`. This preserves the optional
   semantics - a required skill nobody holds still returns a row with zero -
   while filtering reliably.

### 4. `ORDER BY` before `LIMIT` on a large match can drop the connection

Sorting a large intermediate result exhausts the free `c0` tier (0.5 vCPU /
256 MB) and the driver reports a closed connection rather than a query error.

**Workaround:** `LIMIT` first, then order the small set - either in a later
`WITH` or in the service layer. Ranking that involves weighting is done in
TypeScript for this reason, which also makes it unit-testable.

---

### Consequences for how queries here are written

- Bound nodes are never re-used inside a later pattern. Scalars such as
  `$domainName` are passed instead of re-matching a bound `Domain` node.
- Membership tests always go through a collected id list.
- Aggregation happens before any `ORDER BY` that could see a large row count.
- Filters that change the *shape* of a query (an optional `MATCH` for a skill
  filter) are assembled from fixed fragments. Every dynamic **value** remains a
  bound parameter - no value is ever concatenated into query text.
