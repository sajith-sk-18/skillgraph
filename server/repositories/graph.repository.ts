import "server-only";

import type { Node as Neo4jNode, Path } from "neo4j-driver";

import { readRecords, toInt } from "@/lib/db/neo4j";
import * as Q from "@/server/queries/graph.queries";
import type { GraphData, NodeLabel, SearchHit } from "@/types/graph";

import { asGraphNode, collectGraph, compact, toPlain } from "./mappers";

const number = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" ? plain : fallback;
};

export async function getNeighborhood(
	nodeId: string,
	depth: number,
	limit: number,
	labels: NodeLabel[],
): Promise<GraphData> {
	const cypher = Q.buildNeighborhood(depth, labels.length > 0);
	const records = await readRecords(cypher, {
		nodeId,
		limit: toInt(limit),
		...(labels.length > 0 ? { labels } : {}),
	});

	const paths = records.map((record) => record.get("path") as Path);
	const { nodes, relationships } = collectGraph(paths);

	const centerRecords = await readRecords(Q.GRAPH_CENTER, { nodeId });
	const centerNode = centerRecords[0]?.get("center") as Neo4jNode | undefined;
	const center = centerNode ? asGraphNode(centerNode) : null;

	// A node with no edges still has to render, so the centre is added even
	// when the traversal came back empty.
	if (center && !nodes.some((node) => node.id === center.id)) nodes.unshift(center);

	return {
		nodes,
		relationships,
		center,
		// The cap was reached, so there is more graph than is being shown.
		truncated: records.length >= limit,
	};
}

export interface NodeDetail {
	node: ReturnType<typeof asGraphNode>;
	label: NodeLabel;
	connections: { type: string; count: number }[];
}

export async function getNodeDetail(nodeId: string): Promise<NodeDetail | null> {
	const records = await readRecords(Q.GRAPH_NODE_DETAIL, { nodeId });
	const record = records[0];
	const node = record?.get("node") as Neo4jNode | undefined;
	if (!node) return null;

	return {
		node: asGraphNode(node),
		label: String(toPlain(record.get("label")) ?? "Employee") as NodeLabel,
		connections: compact(
			(toPlain(record.get("connections")) as { type: string; count: number }[] | null) ?? [],
		).sort((a, b) => b.count - a.count),
	};
}

/**
 * Global search.
 *
 * The `detail` line differs by label - a job title for a person, a domain for
 * a project - so the caller does not have to know which properties each label
 * carries.
 */
export async function search(query: string, limit: number): Promise<SearchHit[]> {
	const records = await readRecords(Q.GLOBAL_SEARCH, { q: query, limit: toInt(limit * 5) });

	return records.map((record) => {
		const label = String(toPlain(record.get("label")) ?? "") as NodeLabel;
		const value = (key: string): string => String(toPlain(record.get(key)) ?? "");

		const detail =
			label === "Employee"
				? [value("jobTitle"), value("department")].filter(Boolean).join(" · ")
				: label === "Project"
					? [value("domain"), value("status")].filter(Boolean).join(" · ")
					: label === "Skill"
						? value("category")
						: label === "Client"
							? value("industry")
							: value("department");

		return { id: value("id"), label, name: value("name"), detail };
	});
}

export interface StartingPoints {
	employees: SearchHit[];
	projects: SearchHit[];
	skills: SearchHit[];
	clients: SearchHit[];
	teams: SearchHit[];
}

export async function getStartingPoints(): Promise<StartingPoints> {
	const records = await readRecords(Q.EXPLORER_STARTING_POINTS, {});
	const record = records[0];
	const list = (key: string): SearchHit[] =>
		compact((toPlain(record?.get(key)) as SearchHit[] | null) ?? []).sort((a, b) =>
			a.name.localeCompare(b.name),
		);

	return {
		employees: list("employees"),
		projects: list("projects"),
		skills: list("skills"),
		clients: list("clients"),
		teams: list("teams"),
	};
}

export { number as toNumber };
