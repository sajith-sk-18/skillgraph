import "server-only";

import { isInt, type Node as Neo4jNode, type Path, type Relationship } from "neo4j-driver";

import type { GraphNode, GraphRelationship, NodeLabel } from "@/types/graph";
import type {
	Certification,
	Client,
	Employee,
	Project,
	Role,
	Skill,
	Team,
} from "@/types/domain";

/**
 * The boundary where driver types stop.
 *
 * Everything above this file deals in plain objects. That is not tidiness:
 * neo4j `Integer` and `Node` instances cannot be serialised across the
 * Server/Client Component boundary, so a driver type that escapes here becomes
 * a runtime error in a component that has no idea what a driver is.
 */

type Primitive = string | number | boolean | null;

/**
 * Recursively converts driver values to plain JavaScript.
 *
 * neo4j returns 64-bit integers as `Integer` objects because JavaScript
 * numbers lose precision beyond 2^53. Nothing in this dataset comes close to
 * that, so converting to `number` is safe and makes every downstream
 * comparison behave normally.
 */
export function toPlain(value: unknown): unknown {
	if (value === null || value === undefined) return null;
	if (isInt(value)) return value.toNumber();
	if (Array.isArray(value)) return value.map(toPlain);
	if (typeof value === "object" && !(value instanceof Date)) {
		const source = value as Record<string, unknown>;
		// A driver Node/Relationship carries its data under `properties`.
		if ("properties" in source && "labels" in source) return toPlain(source.properties);
		const result: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(source)) result[key] = toPlain(entry);
		return result;
	}
	return value;
}

const props = (node: Neo4jNode | Relationship): Record<string, unknown> =>
	toPlain(node.properties) as Record<string, unknown>;

const str = (value: unknown, fallback = ""): string =>
	value === null || value === undefined ? fallback : String(value);

const int = (value: unknown, fallback = 0): number => {
	const plain = toPlain(value);
	return typeof plain === "number" && Number.isFinite(plain) ? plain : fallback;
};

/** Optional string - distinguishes "no end date" from the empty string. */
const nullableStr = (value: unknown): string | null => {
	const plain = toPlain(value);
	return plain === null || plain === "" ? null : String(plain);
};

export const asEmployee = (node: Neo4jNode): Employee => {
	const p = props(node);
	return {
		id: str(p.id),
		name: str(p.name),
		email: str(p.email),
		jobTitle: str(p.jobTitle),
		department: str(p.department),
		location: str(p.location),
		yearsOfExperience: int(p.yearsOfExperience),
		availability: str(p.availability, "Allocated") as Employee["availability"],
		seniority: str(p.seniority, "Mid") as Employee["seniority"],
		bio: str(p.bio),
	};
};

export const asSkill = (node: Neo4jNode): Skill => {
	const p = props(node);
	return {
		id: str(p.id),
		name: str(p.name),
		category: str(p.category),
		description: str(p.description),
	};
};

export const asProject = (node: Neo4jNode): Project => {
	const p = props(node);
	return {
		id: str(p.id),
		name: str(p.name),
		description: str(p.description),
		status: str(p.status, "Planned") as Project["status"],
		startDate: str(p.startDate),
		endDate: nullableStr(p.endDate),
		domain: str(p.domain),
		location: str(p.location),
		teamSize: int(p.teamSize),
	};
};

export const asClient = (node: Neo4jNode): Client => {
	const p = props(node);
	return {
		id: str(p.id),
		name: str(p.name),
		industry: str(p.industry),
		country: str(p.country),
	};
};

export const asTeam = (node: Neo4jNode): Team => {
	const p = props(node);
	return { id: str(p.id), name: str(p.name), department: str(p.department) };
};

export const asRole = (node: Neo4jNode): Role => {
	const p = props(node);
	return { id: str(p.id), name: str(p.name), category: str(p.category) };
};

export const asCertification = (node: Neo4jNode): Certification => {
	const p = props(node);
	return {
		id: str(p.id),
		name: str(p.name),
		issuer: str(p.issuer),
		level: str(p.level),
	};
};

/** `null` in, `null` out - OPTIONAL MATCH legitimately returns nothing. */
export function optional<T>(node: Neo4jNode | null | undefined, map: (n: Neo4jNode) => T): T | null {
	return node ? map(node) : null;
}

/** Drops the nulls that `collect(CASE WHEN ... END)` leaves behind. */
export function compact<T>(values: (T | null | undefined)[]): T[] {
	return values.filter((value): value is T => value !== null && value !== undefined);
}

// ---------------------------------------------------------------------------
// Graph explorer
// ---------------------------------------------------------------------------

/**
 * A node for the explorer, label-agnostic.
 *
 * `name` is resolved rather than assumed: every label in this model has a
 * `name`, but falling back to the id keeps the visualisation from rendering
 * blank circles if that ever stops being true.
 */
export function asGraphNode(node: Neo4jNode): GraphNode {
	const p = props(node);
	const label = (node.labels?.[0] ?? "Employee") as NodeLabel;
	return {
		id: str(p.id, String(node.identity)),
		label,
		name: str(p.name, str(p.id, "Unknown")),
		properties: Object.fromEntries(
			Object.entries(p).map(([key, value]) => [key, (toPlain(value) ?? null) as Primitive]),
		),
	};
}

export function asGraphRelationship(
	relationship: Relationship,
	startId: string,
	endId: string,
): GraphRelationship {
	return {
		id: String(relationship.identity),
		type: relationship.type,
		source: startId,
		target: endId,
		properties: Object.fromEntries(
			Object.entries(props(relationship)).map(([key, value]) => [
				key,
				(toPlain(value) ?? null) as Primitive,
			]),
		),
	};
}

/**
 * Flattens paths into a de-duplicated node/relationship set.
 *
 * A depth-2 traversal returns many paths that share their early segments, so
 * the same node arrives dozens of times. De-duplicating by id here means the
 * visualisation receives each entity once - the difference between a readable
 * graph and an unreadable one.
 */
export function collectGraph(paths: Path[]): {
	nodes: GraphNode[];
	relationships: GraphRelationship[];
} {
	const nodes = new Map<string, GraphNode>();
	const relationships = new Map<string, GraphRelationship>();

	for (const path of paths) {
		for (const segment of path.segments) {
			const start = asGraphNode(segment.start);
			const end = asGraphNode(segment.end);
			nodes.set(start.id, start);
			nodes.set(end.id, end);

			// The driver's relationship carries internal identities; the graph
			// is keyed on business ids, so the ends are re-resolved here.
			const relationship = asGraphRelationship(segment.relationship, start.id, end.id);
			relationships.set(relationship.id, relationship);
		}
	}

	return { nodes: Array.from(nodes.values()), relationships: Array.from(relationships.values()) };
}
