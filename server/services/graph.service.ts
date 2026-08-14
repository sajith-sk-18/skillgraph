import "server-only";

import * as repo from "@/server/repositories/graph.repository";
import type { GraphData, NodeLabel, SearchHit, SearchResults } from "@/types/graph";
import { NODE_LABELS } from "@/types/graph";

/** Turns the comma-separated `labels` query parameter into validated labels. */
export function parseLabels(raw: string | undefined): NodeLabel[] {
	if (!raw) return [];
	const allowed = new Set<string>(NODE_LABELS);
	return raw
		.split(",")
		.map((value) => value.trim())
		.filter((value): value is NodeLabel => allowed.has(value));
}

export async function getNeighborhood(
	nodeId: string,
	depth: number,
	limit: number,
	labels: NodeLabel[],
): Promise<GraphData> {
	return repo.getNeighborhood(nodeId, depth, limit, labels);
}

export const getNodeDetail = repo.getNodeDetail;
export const getStartingPoints = repo.getStartingPoints;

/**
 * Groups search hits by label so the UI can render sections.
 *
 * The query over-fetches and the cap is applied per group here - otherwise a
 * search for "e" returns twenty employees and no projects, which reads as
 * "there are no matching projects".
 */
export async function search(query: string, perGroup: number): Promise<SearchResults> {
	const hits = await repo.search(query, perGroup);

	const group = (label: NodeLabel): SearchHit[] =>
		hits.filter((hit) => hit.label === label).slice(0, perGroup);

	const employees = group("Employee");
	const projects = group("Project");
	const skills = group("Skill");
	const clients = group("Client");
	const teams = group("Team");

	return {
		employees,
		projects,
		skills,
		clients,
		teams,
		total: employees.length + projects.length + skills.length + clients.length + teams.length,
	};
}
