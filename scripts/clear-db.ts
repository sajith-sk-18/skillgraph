/**
 * Removes every node and relationship from the configured CognoDB instance.
 *
 * Run with:  npm run clear
 *
 * Deleting in batches rather than one `MATCH (n) DETACH DELETE n`: on the free
 * tier a single transaction large enough to hold the whole graph can exhaust
 * the instance's memory and drop the connection mid-delete, which leaves the
 * database half-emptied and the script with no idea how far it got.
 */

import { createDriver, int, run } from "./db";

const BATCH_SIZE = 500;

async function main() {
	const driver = createDriver();

	try {
		await driver.verifyConnectivity();
		console.log(`Connected to ${process.env.COGNODB_URI}`);

		const before = await run(driver, "MATCH (n) RETURN count(n) AS nodes");
		const nodeCount = before.records[0]?.get("nodes")?.toNumber?.() ?? 0;

		if (nodeCount === 0) {
			console.log("Database is already empty.");
			return;
		}

		console.log(`Deleting ${nodeCount} nodes and their relationships...`);

		let remaining = nodeCount;
		while (remaining > 0) {
			const result = await run(
				driver,
				`
				MATCH (n)
				WITH n LIMIT $size
				DETACH DELETE n
				RETURN count(n) AS deleted
				`,
				{ size: int(BATCH_SIZE) },
			);
			const deleted = result.records[0]?.get("deleted")?.toNumber?.() ?? 0;
			if (deleted === 0) break;
			remaining -= deleted;
			console.log(`  deleted ${deleted}, ~${Math.max(0, remaining)} to go`);
		}

		const after = await run(driver, "MATCH (n) RETURN count(n) AS nodes");
		console.log(`Done. Nodes remaining: ${after.records[0].get("nodes").toString()}`);
	} finally {
		await driver.close();
	}
}

main().catch((error) => {
	console.error("Clear failed:", error instanceof Error ? error.message : error);
	process.exit(1);
});
