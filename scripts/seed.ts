/**
 * Loads the SkillGraph demo dataset into CognoDB.
 *
 * Run with:  npm run seed
 *
 * Safe to re-run: every write uses MERGE on a stable id, so a second run
 * updates in place rather than duplicating the graph.
 *
 * ALL DATA IS FICTIONAL - see scripts/seed-data.ts.
 */

import {
	ASSIGNMENTS,
	CERTIFICATIONS,
	CLIENTS,
	COLLABORATIONS,
	DOMAINS,
	EMPLOYEES,
	PROJECTS,
	ROLES,
	SKILLS,
	TEAMS,
} from "./seed-data";
import { batch, createDriver, int, run } from "./db";

/**
 * Uniqueness constraints double as indexes for id lookups, which is what
 * almost every query in the app starts with. If CognoDB rejects the syntax we
 * carry on - the dataset is small enough that a scan is survivable, and an
 * invented workaround would be worse than a documented limitation.
 */
async function applyConstraints(driver: ReturnType<typeof createDriver>) {
	const labels = ["Employee", "Skill", "Project", "Client", "Team", "Role", "Certification", "Domain"];
	let applied = 0;
	let rejected = 0;

	for (const label of labels) {
		try {
			await run(
				driver,
				`CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`,
			);
			applied += 1;
		} catch {
			rejected += 1;
		}
	}

	if (rejected === 0) {
		console.log(`  uniqueness constraints           ${applied}`);
	} else {
		console.log(
			`  uniqueness constraints           ${applied} applied, ${rejected} rejected by CognoDB (documented in README)`,
		);
	}
}

async function main() {
	const driver = createDriver();

	try {
		await driver.verifyConnectivity();
		console.log(`Connected to ${process.env.COGNODB_URI}\n`);

		const existing = await run(driver, "MATCH (n) RETURN count(n) AS c");
		const count = existing.records[0].get("c").toNumber();
		if (count > 0) {
			console.log(`Note: ${count} nodes already present. MERGE will update them in place.`);
			console.log("Run `npm run clear` first for a clean load.\n");
		}

		console.log("Schema");
		await applyConstraints(driver);

		console.log("\nReference nodes");

		await batch(driver, "Skill", SKILLS, `
			UNWIND $rows AS row
			MERGE (s:Skill {id: row.id})
			SET s.name = row.name, s.category = row.category, s.description = row.description
		`);

		await batch(driver, "Client", CLIENTS, `
			UNWIND $rows AS row
			MERGE (c:Client {id: row.id})
			SET c.name = row.name, c.industry = row.industry, c.country = row.country
		`);

		await batch(driver, "Team", TEAMS, `
			UNWIND $rows AS row
			MERGE (t:Team {id: row.id})
			SET t.name = row.name, t.department = row.department
		`);

		await batch(driver, "Role", ROLES, `
			UNWIND $rows AS row
			MERGE (r:Role {id: row.id})
			SET r.name = row.name, r.category = row.category
		`);

		await batch(driver, "Certification", CERTIFICATIONS, `
			UNWIND $rows AS row
			MERGE (c:Certification {id: row.id})
			SET c.name = row.name, c.issuer = row.issuer, c.level = row.level
		`);

		await batch(
			driver,
			"Domain",
			DOMAINS.map((name, index) => ({ id: `DOM${String(index + 1).padStart(3, "0")}`, name })),
			`
			UNWIND $rows AS row
			MERGE (d:Domain {id: row.id})
			SET d.name = row.name
		`,
		);

		console.log("\nPeople");

		await batch(
			driver,
			"Employee",
			EMPLOYEES.map((e) => ({
				id: e.id,
				name: e.name,
				email: e.email,
				jobTitle: e.jobTitle,
				department: e.department,
				location: e.location,
				yearsOfExperience: int(e.yearsOfExperience),
				availability: e.availability,
				seniority: e.seniority,
				bio: e.bio,
			})),
			`
			UNWIND $rows AS row
			MERGE (e:Employee {id: row.id})
			SET e.name = row.name,
				e.email = row.email,
				e.jobTitle = row.jobTitle,
				e.department = row.department,
				e.location = row.location,
				e.yearsOfExperience = row.yearsOfExperience,
				e.availability = row.availability,
				e.seniority = row.seniority,
				e.bio = row.bio
		`,
		);

		/**
		 * The proficiency, years and lastUsed live on the RELATIONSHIP, not on
		 * either node. "Sara knows Python" is nearly useless; "Sara has used
		 * Python at 9/10 for six years, most recently last month" is what the
		 * staffing algorithm actually scores.
		 */
		await batch(
			driver,
			"HAS_SKILL",
			EMPLOYEES.flatMap((e) =>
				e.skills.map((s) => ({
					employeeId: e.id,
					skillId: s.skillId,
					proficiency: int(s.proficiency),
					years: int(s.years),
					lastUsed: s.lastUsed,
				})),
			),
			`
			UNWIND $rows AS row
			MATCH (e:Employee {id: row.employeeId})
			MATCH (s:Skill {id: row.skillId})
			MERGE (e)-[r:HAS_SKILL]->(s)
			SET r.proficiency = row.proficiency, r.years = row.years, r.lastUsed = row.lastUsed
		`,
		);

		await batch(
			driver,
			"MEMBER_OF",
			EMPLOYEES.map((e) => ({ employeeId: e.id, teamId: e.teamId })),
			`
			UNWIND $rows AS row
			MATCH (e:Employee {id: row.employeeId})
			MATCH (t:Team {id: row.teamId})
			MERGE (e)-[:MEMBER_OF]->(t)
		`,
		);

		await batch(
			driver,
			"HAS_ROLE",
			EMPLOYEES.map((e) => ({ employeeId: e.id, roleId: e.roleId })),
			`
			UNWIND $rows AS row
			MATCH (e:Employee {id: row.employeeId})
			MATCH (r:Role {id: row.roleId})
			MERGE (e)-[:HAS_ROLE]->(r)
		`,
		);

		await batch(
			driver,
			"HOLDS_CERTIFICATION",
			EMPLOYEES.flatMap((e) =>
				e.certificationIds.map((certificationId) => ({ employeeId: e.id, certificationId })),
			),
			`
			UNWIND $rows AS row
			MATCH (e:Employee {id: row.employeeId})
			MATCH (c:Certification {id: row.certificationId})
			MERGE (e)-[:HOLDS_CERTIFICATION]->(c)
		`,
		);

		console.log("\nProjects");

		await batch(
			driver,
			"Project",
			PROJECTS.map((p) => ({
				id: p.id,
				name: p.name,
				description: p.description,
				status: p.status,
				startDate: p.startDate,
				endDate: p.endDate,
				domain: p.domain,
				location: p.location,
				teamSize: int(p.teamSize),
			})),
			`
			UNWIND $rows AS row
			MERGE (p:Project {id: row.id})
			SET p.name = row.name,
				p.description = row.description,
				p.status = row.status,
				p.startDate = row.startDate,
				p.endDate = row.endDate,
				p.domain = row.domain,
				p.location = row.location,
				p.teamSize = row.teamSize
		`,
		);

		await batch(
			driver,
			"FOR_CLIENT",
			PROJECTS.map((p) => ({ projectId: p.id, clientId: p.clientId })),
			`
			UNWIND $rows AS row
			MATCH (p:Project {id: row.projectId})
			MATCH (c:Client {id: row.clientId})
			MERGE (p)-[:FOR_CLIENT]->(c)
		`,
		);

		await batch(
			driver,
			"IN_DOMAIN",
			PROJECTS.map((p) => ({ projectId: p.id, domain: p.domain })),
			`
			UNWIND $rows AS row
			MATCH (p:Project {id: row.projectId})
			MATCH (d:Domain {name: row.domain})
			MERGE (p)-[:IN_DOMAIN]->(d)
		`,
		);

		await batch(
			driver,
			"REQUIRED_SKILL",
			PROJECTS.flatMap((p) =>
				p.requiredSkills.map((s) => ({
					projectId: p.id,
					skillId: s.skillId,
					proficiency: int(s.proficiency),
					years: int(s.years),
				})),
			),
			`
			UNWIND $rows AS row
			MATCH (p:Project {id: row.projectId})
			MATCH (s:Skill {id: row.skillId})
			MERGE (p)-[r:REQUIRED_SKILL]->(s)
			SET r.requiredProficiency = row.proficiency, r.requiredYears = row.years
		`,
		);

		await batch(
			driver,
			"USED_TECHNOLOGY",
			PROJECTS.flatMap((p) => p.technologyIds.map((skillId) => ({ projectId: p.id, skillId }))),
			`
			UNWIND $rows AS row
			MATCH (p:Project {id: row.projectId})
			MATCH (s:Skill {id: row.skillId})
			MERGE (p)-[:USED_TECHNOLOGY]->(s)
		`,
		);

		console.log("\nDelivery history");

		await batch(
			driver,
			"WORKED_ON",
			ASSIGNMENTS.map((a) => ({
				employeeId: a.employeeId,
				projectId: a.projectId,
				role: a.role,
				startDate: a.startDate,
				endDate: a.endDate,
				responsibility: a.responsibility,
			})),
			`
			UNWIND $rows AS row
			MATCH (e:Employee {id: row.employeeId})
			MATCH (p:Project {id: row.projectId})
			MERGE (e)-[r:WORKED_ON]->(p)
			SET r.role = row.role,
				r.startDate = row.startDate,
				r.endDate = row.endDate,
				r.responsibility = row.responsibility
			MERGE (p)-[:HAS_TEAM_MEMBER]->(e)
		`,
		);

		/**
		 * Stored in ONE direction only and always matched undirected, as
		 * `(a)-[:WORKED_WITH]-(b)`. Writing both directions would double-count
		 * every aggregation over collaboration.
		 */
		await batch(
			driver,
			"WORKED_WITH (derived)",
			COLLABORATIONS.map((c) => ({
				a: c.a,
				b: c.b,
				projectsTogether: int(c.projectsTogether),
				lastProject: c.lastProject,
			})),
			`
			UNWIND $rows AS row
			MATCH (a:Employee {id: row.a})
			MATCH (b:Employee {id: row.b})
			MERGE (a)-[r:WORKED_WITH]->(b)
			SET r.projectsTogether = row.projectsTogether, r.lastProject = row.lastProject
		`,
		);

		const nodes = await run(driver, "MATCH (n) RETURN count(n) AS c");
		const rels = await run(driver, "MATCH ()-[r]->() RETURN count(r) AS c");
		const labels = await run(
			driver,
			"MATCH (n) RETURN labels(n)[0] AS label, count(n) AS c ORDER BY c DESC",
		);

		console.log("\nGraph loaded");
		for (const record of labels.records) {
			console.log(`  ${String(record.get("label")).padEnd(34)} ${record.get("c").toString()}`);
		}
		console.log(`\n  ${"TOTAL NODES".padEnd(34)} ${nodes.records[0].get("c").toString()}`);
		console.log(`  ${"TOTAL RELATIONSHIPS".padEnd(34)} ${rels.records[0].get("c").toString()}`);
		console.log("\nAll records are fictional demo data.");
	} finally {
		await driver.close();
	}
}

main().catch((error) => {
	console.error("\nSeed failed:", error instanceof Error ? error.message : error);
	process.exit(1);
});
