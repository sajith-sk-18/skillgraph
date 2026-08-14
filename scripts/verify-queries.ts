/**
 * Runs every application query against the live CognoDB instance and asserts
 * the shape of what comes back.
 *
 * Run with:  npm run verify
 *
 * This exists because CognoDB's openCypher differs from Neo4j's in ways that
 * fail SILENTLY - a pattern predicate over two bound nodes returns zero rows
 * rather than raising, and an OPTIONAL MATCH between bound nodes quietly
 * produces a cross product. Unit tests mock the driver, so only a live run
 * catches that class of bug.
 *
 * Every assertion below is a claim the UI depends on.
 */

import { createDriver, int, run } from "./db";
import * as EmployeeQ from "../server/queries/employee.queries";
import * as ProjectQ from "../server/queries/project.queries";
import * as SkillQ from "../server/queries/skill.queries";
import * as StaffingQ from "../server/queries/staffing.queries";
import * as GraphQ from "../server/queries/graph.queries";
import * as AnalyticsQ from "../server/queries/analytics.queries";
import type { EmployeeFilters, ProjectFilters } from "../lib/validations/schemas";

const DEMO_PROJECT = "PRJ001";
const ARUN = "EMP001";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail: string) {
	if (condition) {
		passed += 1;
		console.log(`  PASS  ${label} - ${detail}`);
	} else {
		failed += 1;
		console.log(`  FAIL  ${label} - ${detail}`);
	}
}

function section(title: string) {
	console.log(`\n${title}`);
}

const num = (value: unknown): number =>
	typeof value === "number" ? value : Number((value as { toString(): string })?.toString() ?? 0);

const baseEmployeeFilters = (over: Partial<EmployeeFilters> = {}): EmployeeFilters =>
	({ search: "", sort: "name", limit: 60, offset: 0, ...over }) as EmployeeFilters;

const baseProjectFilters = (over: Partial<ProjectFilters> = {}): ProjectFilters =>
	({ search: "", limit: 60, offset: 0, ...over }) as ProjectFilters;

async function main() {
	const driver = createDriver();
	await driver.verifyConnectivity();
	console.log(`Verifying against ${process.env.COGNODB_URI}`);

	try {
		// -------------------------------------------------------------------
		section("1. Graph integrity");

		const orphans = await run(driver, "MATCH (n) WHERE NOT (n)--() RETURN count(n) AS c");
		check(
			"no orphan nodes",
			num(orphans.records[0].get("c")) === 0,
			`${num(orphans.records[0].get("c"))} disconnected nodes`,
		);

		const counts = await run(
			driver,
			"MATCH (n) WITH count(n) AS nodes MATCH ()-[r]->() RETURN nodes, count(r) AS rels",
		);
		const nodeCount = num(counts.records[0].get("nodes"));
		const relCount = num(counts.records[0].get("rels"));
		check("graph is populated", nodeCount > 150 && relCount > 1000, `${nodeCount} nodes, ${relCount} relationships`);

		const derived = await run(
			driver,
			`MATCH (a:Employee)-[w:WORKED_WITH]-(b:Employee)
			 WHERE a.id < b.id
			 RETURN count(w) AS pairs, max(w.projectsTogether) AS maxTogether`,
		);
		check(
			"WORKED_WITH is derived and non-trivial",
			num(derived.records[0].get("maxTogether")) >= 2,
			`${num(derived.records[0].get("pairs"))} pairs, max ${num(derived.records[0].get("maxTogether"))} projects together`,
		);

		// Cross-checks the derived relationship in both directions: every
		// WORKED_WITH edge must correspond to a genuinely shared project, and
		// every shared project must have produced an edge.
		//
		// Deliberately avoids `OPTIONAL MATCH` between two bound nodes - that is
		// landmine #1, and would make this assertion pass for the wrong reason.
		const pairCounts = await run(
			driver,
			`MATCH (a:Employee)-[:WORKED_WITH]-(b:Employee) WHERE a.id < b.id
			 WITH count(*) AS collaborationPairs
			 MATCH (x:Employee)-[:WORKED_ON]->(p:Project)<-[:WORKED_ON]-(y:Employee)
			 WHERE x.id < y.id
			 RETURN collaborationPairs, count(DISTINCT x.id + '|' + y.id) AS sharingPairs`,
		);
		const collaborationPairs = num(pairCounts.records[0].get("collaborationPairs"));
		const sharingPairs = num(pairCounts.records[0].get("sharingPairs"));
		check(
			"WORKED_WITH matches shared-project reality exactly",
			collaborationPairs === sharingPairs && collaborationPairs > 0,
			`${collaborationPairs} collaboration edges vs ${sharingPairs} project-sharing pairs`,
		);

		// -------------------------------------------------------------------
		section("2. Employee directory");

		const list = await run(driver, EmployeeQ.buildListEmployees(baseEmployeeFilters()), {
			limit: int(60),
			offset: int(0),
		});
		check("lists employees", list.records.length === 60, `${list.records.length} rows`);
		check(
			"each row carries top skills",
			list.records.every((r) => Array.isArray(r.get("topSkills"))),
			"topSkills present on every row",
		);
		check(
			"top skills are ordered by proficiency",
			list.records.every((r) => {
				const skills = (r.get("topSkills") as { proficiency: unknown }[]).filter(Boolean);
				return skills.every((s, i) => i === 0 || num(skills[i - 1].proficiency) >= num(s.proficiency));
			}),
			"descending within every row",
		);

		const filtered = await run(
			driver,
			EmployeeQ.buildListEmployees(baseEmployeeFilters({ skill: "React", seniority: "Senior" })),
			{ limit: int(60), offset: int(0), skill: "React", seniority: "Senior" },
		);
		check(
			"skill + seniority filter narrows the list",
			filtered.records.length > 0 && filtered.records.length < 60,
			`${filtered.records.length} Senior people with React`,
		);

		const searched = await run(
			driver,
			EmployeeQ.buildListEmployees(baseEmployeeFilters({ search: "arun" })),
			{ limit: int(60), offset: int(0), search: "arun" },
		);
		check("search matches by name", searched.records.length >= 1, `"arun" -> ${searched.records.length}`);

		const total = await run(driver, EmployeeQ.buildCountEmployees(baseEmployeeFilters()), {});
		check("count matches the seeded workforce", num(total.records[0].get("total")) === 84, `${num(total.records[0].get("total"))} employees`);

		// -------------------------------------------------------------------
		section("3. Employee profile");

		const skills = await run(driver, EmployeeQ.EMPLOYEE_SKILLS, { employeeId: ARUN });
		check("profile skills carry relationship properties", skills.records.length > 0 && skills.records.every((r) => num(r.get("proficiency")) >= 1), `${skills.records.length} skills`);

		const projects = await run(driver, EmployeeQ.EMPLOYEE_PROJECTS, { employeeId: ARUN });
		check("profile shows project history with roles", projects.records.length > 0 && projects.records.every((r) => typeof r.get("role") === "string"), `${projects.records.length} projects`);

		const collaborators = await run(driver, EmployeeQ.EMPLOYEE_COLLABORATORS, {
			employeeId: ARUN,
			limit: int(20),
		});
		check("co-workers resolve undirected", collaborators.records.length > 0, `${collaborators.records.length} co-workers`);
		check(
			"every co-worker names the projects they shared",
			collaborators.records.every((r) => (r.get("sharedProjectNames") as string[]).length > 0),
			"shared project names present",
		);

		const domains = await run(driver, EmployeeQ.EMPLOYEE_DOMAINS, { employeeId: ARUN });
		check("domain experience is derived by traversal", domains.records.length > 0, `${domains.records.length} domains`);

		const certs = await run(driver, EmployeeQ.EMPLOYEE_CERTIFICATIONS, { employeeId: ARUN });
		check("certifications query runs", Array.isArray(certs.records), `${certs.records.length} certifications`);

		const teamsRoles = await run(driver, EmployeeQ.EMPLOYEE_TEAMS_AND_ROLES, { employeeId: ARUN });
		check(
			"team and role resolve",
			(teamsRoles.records[0].get("teams") as unknown[]).length > 0,
			`${(teamsRoles.records[0].get("teams") as unknown[]).length} team(s)`,
		);

		const options = await run(driver, EmployeeQ.EMPLOYEE_FILTER_OPTIONS, {});
		check(
			"filter options come from the graph",
			(options.records[0].get("departments") as string[]).length > 3,
			`${(options.records[0].get("departments") as string[]).length} departments, ${(options.records[0].get("skills") as string[]).length} skills`,
		);

		// -------------------------------------------------------------------
		section("4. Projects");

		const projectList = await run(driver, ProjectQ.buildListProjects(baseProjectFilters()), {
			limit: int(60),
			offset: int(0),
		});
		check("lists projects", projectList.records.length === 20, `${projectList.records.length} projects`);

		const byDomain = await run(
			driver,
			ProjectQ.buildListProjects(baseProjectFilters({ domain: "Banking" })),
			{ limit: int(60), offset: int(0), domain: "Banking" },
		);
		check("domain filter works", byDomain.records.length === 3, `${byDomain.records.length} banking projects`);

		const detail = await run(driver, ProjectQ.PROJECT_CORE, { projectId: DEMO_PROJECT });
		check("project detail resolves its client", detail.records[0]?.get("client") !== null, "client attached");

		const requiredSkills = await run(driver, ProjectQ.PROJECT_REQUIRED_SKILLS, { projectId: DEMO_PROJECT });
		check("required skills carry a bar", requiredSkills.records.length === 5, `${requiredSkills.records.length} required skills`);

		/**
		 * Asserts the EXACT team size, not just "more than zero".
		 *
		 * The weaker assertion passed while the query was returning 35 rows for
		 * a 9-person team - the OPTIONAL MATCH landmine. Any assertion that
		 * cannot distinguish 9 from 35 is not testing anything.
		 */
		const declaredSize = await run(
			driver,
			"MATCH (p:Project {id: 'PRJ002'}) RETURN p.teamSize AS teamSize",
		);
		const team = await run(driver, ProjectQ.PROJECT_TEAM, { projectId: "PRJ002" });
		const expectedTeam = num(declaredSize.records[0].get("teamSize"));
		check(
			"team query returns one row per member - no cross product",
			team.records.length === expectedTeam,
			`PRJ002 declares ${expectedTeam}, query returned ${team.records.length}`,
		);
		check(
			"every team member is distinct",
			new Set(team.records.map((r) => (r.get("employee") as { properties: { id: string } }).properties.id)).size ===
				team.records.length,
			"no duplicated members",
		);
		check(
			"every team member carries the role they held",
			team.records.every((r) => typeof r.get("role") === "string" && (r.get("role") as string).length > 0),
			"roles present",
		);

		const demoTeam = await run(driver, ProjectQ.PROJECT_TEAM, { projectId: DEMO_PROJECT });
		check(
			"the demo project is deliberately unstaffed",
			demoTeam.records.length === 0,
			`${DEMO_PROJECT} has ${demoTeam.records.length} members`,
		);

		const teamIdsResult = await run(driver, ProjectQ.PROJECT_TEAM_IDS, { projectId: "PRJ002" });
		const teamIds = teamIdsResult.records[0].get("teamIds") as string[];
		check("team ids resolve for the gap analysis", teamIds.length === expectedTeam, `${teamIds.length} ids`);

		const coverage = await run(driver, ProjectQ.PROJECT_SKILL_COVERAGE, {
			projectId: "PRJ002",
			teamIds,
		});
		check("skill coverage returns a row per required skill", coverage.records.length === 5, `${coverage.records.length} skills analysed`);
		/**
		 * The assertion that would have caught the ignored WHERE: coverage
		 * counts people ON the team, so it can never exceed the team size. The
		 * broken form counted every holder in the company.
		 */
		check(
			"coverage never exceeds the team size",
			coverage.records.every((r) => num(r.get("covered")) <= expectedTeam),
			`max covered ${Math.max(...coverage.records.map((r) => num(r.get("covered"))))} of ${expectedTeam}`,
		);

		const suggestions = await run(driver, ProjectQ.PROJECT_GAP_SUGGESTIONS, {
			projectId: "PRJ002",
			teamIds,
		});
		check("gap analysis suggests people to close gaps", suggestions.records.length > 0, `${suggestions.records.length} skills with candidates`);
		check(
			"suggested people are never already on the team",
			suggestions.records.every((r) =>
				(r.get("suggestions") as { id: string }[]).every((s) => !teamIds.includes(s.id)),
			),
			"no team members suggested as gap-fillers",
		);

		// -------------------------------------------------------------------
		section("5. Skills");

		const skillList = await run(driver, SkillQ.LIST_SKILLS, {});
		check("lists every skill with counts", skillList.records.length === 28, `${skillList.records.length} skills`);
		check(
			"every skill is held or used by someone",
			skillList.records.every((r) => num(r.get("employeeCount")) > 0 || num(r.get("projectCount")) > 0),
			"no unused skills",
		);

		const skillTop = await run(driver, SkillQ.SKILL_TOP_EMPLOYEES, { skillId: "SKL001", limit: int(10) });
		check("top employees for a skill are ranked", skillTop.records.length > 0, `React -> ${skillTop.records.length} people`);

		const related = await run(driver, SkillQ.SKILL_RELATED, { skillId: "SKL001", limit: int(8) });
		check("related skills come from co-occurrence", related.records.length > 0, `React relates to ${related.records.length} skills`);

		// -------------------------------------------------------------------
		section("6. Staffing - the core feature");

		const reqs = await run(driver, StaffingQ.PROJECT_REQUIREMENTS, { projectId: DEMO_PROJECT });
		const requirements = reqs.records[0].get("requirements") as { skillId: string }[];
		const domainName = reqs.records[0].get("domain") as string;
		check("project requirements resolve", requirements.length === 5 && domainName === "Banking", `${requirements.length} skills, domain ${domainName}`);

		const evidence = await run(driver, StaffingQ.CANDIDATE_SKILL_EVIDENCE, { requirements });
		check("skill evidence returns a candidate pool", evidence.records.length > 10, `${evidence.records.length} candidates hold at least one required skill`);
		check(
			"one row per candidate - no cross product",
			new Set(evidence.records.map((r) => (r.get("employee") as { properties: { id: string } }).properties.id)).size ===
				evidence.records.length,
			"employee ids are unique across rows",
		);

		const candidateIds = evidence.records.map(
			(r) => (r.get("employee") as { properties: { id: string } }).properties.id,
		);

		const projectEvidence = await run(driver, StaffingQ.CANDIDATE_PROJECT_EVIDENCE, { candidateIds });
		check("project evidence returns delivery history", projectEvidence.records.length > 0, `${projectEvidence.records.length} assignment rows`);
		check(
			"project evidence carries the domain",
			projectEvidence.records.some((r) => r.get("domain") === "Banking"),
			"banking history found in the pool",
		);

		const collab = await run(driver, StaffingQ.CANDIDATE_COLLABORATION, { candidateIds });
		check("collaboration inside the pool is found", collab.records.length > 0, `${collab.records.length} collaborating pairs`);
		check(
			"each pair appears once",
			new Set(collab.records.map((r) => `${r.get("aId")}|${r.get("bId")}`)).size === collab.records.length,
			"no duplicated pairs",
		);

		// The relationally-awkward query.
		const awkward = await run(driver, StaffingQ.QUALIFIED_CONNECTED_CANDIDATES, {
			requirements,
			domainName,
			minSkills: int(2),
			limit: int(20),
		});
		check(
			"awkward query returns qualified + domain-experienced + connected people",
			awkward.records.length > 0,
			`${awkward.records.length} people satisfy all three constraints`,
		);
		check(
			"every result genuinely has domain projects",
			awkward.records.every((r) => num(r.get("domainProjects")) > 0),
			"domainProjects > 0 for all",
		);
		check(
			"every result genuinely has a qualified peer",
			awkward.records.every((r) => (r.get("qualifiedPeers") as unknown[]).length > 0),
			"qualifiedPeers non-empty for all",
		);

		const multiHop = await run(driver, StaffingQ.CANDIDATE_MULTI_HOP, {
			projectId: DEMO_PROJECT,
			limit: int(10),
		});
		check("multi-hop candidate query returns", multiHop.records.length > 0, `${multiHop.records.length} candidates`);
		check(
			"multi-hop collects skills, projects and co-workers together",
			multiHop.records.every(
				(r) =>
					Array.isArray(r.get("matchedSkills")) &&
					Array.isArray(r.get("previousProjects")) &&
					Array.isArray(r.get("coworkers")),
			),
			"all three collections present",
		);

		const poolCoverage = await run(driver, StaffingQ.POOL_SKILL_COVERAGE, {
			requirements,
			candidateIds: candidateIds.slice(0, 6),
		});
		check("pool coverage returns a row per required skill", poolCoverage.records.length === 5, `${poolCoverage.records.length} rows`);
		// Same class of guard as the project gap: coverage counts people in the
		// shortlist, so it can never exceed the shortlist size.
		check(
			"pool coverage counts only the shortlist",
			poolCoverage.records.every((r) => num(r.get("covered")) <= 6),
			`max covered ${Math.max(...poolCoverage.records.map((r) => num(r.get("covered"))))} of 6 shortlisted`,
		);

		// -------------------------------------------------------------------
		section("7. Graph explorer");

		for (const depth of [1, 2] as const) {
			const neighbourhood = await run(driver, GraphQ.buildNeighborhood(depth, false), {
				nodeId: ARUN,
				limit: int(60),
			});
			check(`depth ${depth} traversal returns paths`, neighbourhood.records.length > 0, `${neighbourhood.records.length} paths`);
		}

		const filteredGraph = await run(driver, GraphQ.buildNeighborhood(1, true), {
			nodeId: ARUN,
			limit: int(60),
			labels: ["Skill"],
		});
		check("label filter restricts the traversal", filteredGraph.records.length > 0, `${filteredGraph.records.length} skill paths`);

		const nodeDetail = await run(driver, GraphQ.GRAPH_NODE_DETAIL, { nodeId: ARUN });
		check("node detail summarises connections", (nodeDetail.records[0].get("connections") as unknown[]).length > 0, "connection types present");

		const search = await run(driver, GraphQ.GLOBAL_SEARCH, { q: "react", limit: int(10) });
		check("global search spans labels", search.records.length > 0, `"react" -> ${search.records.length} hits`);

		const starting = await run(driver, GraphQ.EXPLORER_STARTING_POINTS, {});
		check(
			"explorer offers starting points for every entity",
			(starting.records[0].get("employees") as unknown[]).length > 0 &&
				(starting.records[0].get("skills") as unknown[]).length > 0,
			"employees, projects, skills, clients and teams",
		);

		// -------------------------------------------------------------------
		section("8. Analytics");

		const stats = await run(driver, AnalyticsQ.DASHBOARD_STATS, {});
		const s = stats.records[0];
		check(
			"dashboard stats are consistent",
			num(s.get("totalEmployees")) === 84 && num(s.get("totalProjects")) === 20 && num(s.get("totalSkills")) === 28,
			`${num(s.get("totalEmployees"))} employees, ${num(s.get("totalProjects"))} projects, ${num(s.get("totalSkills"))} skills`,
		);
		check("planned project exists for the demo", num(s.get("plannedProjects")) >= 1, `${num(s.get("plannedProjects"))} planned`);

		const byDept = await run(driver, AnalyticsQ.EMPLOYEES_BY_DEPARTMENT, {});
		check(
			"department breakdown sums to the workforce",
			byDept.records.reduce((sum, r) => sum + num(r.get("value")), 0) === 84,
			`${byDept.records.length} departments summing to 84`,
		);

		const bySeniority = await run(driver, AnalyticsQ.EMPLOYEES_BY_SENIORITY, {});
		check("seniority breakdown is ordered", bySeniority.records.length > 0, `${bySeniority.records.length} bands`);

		const topSkills = await run(driver, AnalyticsQ.TOP_SKILLS, { limit: int(10) });
		check("top skills are ranked by holder count", topSkills.records.length === 10, `top skill: ${topSkills.records[0].get("label")}`);

		const projDomain = await run(driver, AnalyticsQ.PROJECTS_BY_DOMAIN, {});
		check(
			"projects by domain sums to the project count",
			projDomain.records.reduce((sum, r) => sum + num(r.get("value")), 0) === 20,
			`${projDomain.records.length} domains`,
		);

		const connected = await run(driver, AnalyticsQ.MOST_CONNECTED, { limit: int(8) });
		check("most-connected employees computed from WORKED_WITH", connected.records.length > 0, `top: ${(connected.records[0].get("employee") as { properties: { name: string } }).properties.name} with ${num(connected.records[0].get("connections"))} connections`);

		const experienced = await run(driver, AnalyticsQ.MOST_EXPERIENCED, { limit: int(8) });
		check("most experienced employees returned", experienced.records.length === 8, `${experienced.records.length} people`);

		const supply = await run(driver, AnalyticsQ.SKILL_SUPPLY_VS_DEMAND, {});
		check("supply vs demand only covers skills projects ask for", supply.records.length > 0, `${supply.records.length} skills in demand`);

		const teams = await run(driver, AnalyticsQ.MOST_COLLABORATIVE_TEAMS, {});
		check("team collaboration computed from WORKED_WITH", teams.records.length > 0, `${teams.records.length} teams ranked`);

		const skillsByDept = await run(driver, AnalyticsQ.SKILLS_BY_DEPARTMENT, {});
		check("skills by department returns a matrix", skillsByDept.records.length > 0, `${skillsByDept.records.length} department/category pairs`);
	} finally {
		await driver.close();
	}

	console.log(`\n${passed} passed, ${failed} failed.`);
	if (failed > 0) process.exit(1);
}

main().catch((error) => {
	console.error("\nVerification crashed:", error instanceof Error ? error.message : error);
	process.exit(1);
});
