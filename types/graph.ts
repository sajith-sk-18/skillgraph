/**
 * Shapes for the graph explorer and the employee network view.
 *
 * Deliberately generic: the explorer renders whatever the traversal returns
 * rather than knowing about Employees or Projects, so adding a node label to
 * the model does not mean touching the visualisation.
 */

export const NODE_LABELS = [
	"Employee",
	"Skill",
	"Project",
	"Client",
	"Team",
	"Role",
	"Certification",
	"Domain",
] as const;

export type NodeLabel = (typeof NODE_LABELS)[number];

export interface GraphNode {
	id: string;
	label: NodeLabel;
	name: string;
	properties: Record<string, string | number | boolean | null>;
}

export interface GraphRelationship {
	id: string;
	type: string;
	source: string;
	target: string;
	properties: Record<string, string | number | boolean | null>;
}

export interface GraphData {
	nodes: GraphNode[];
	relationships: GraphRelationship[];
	center: GraphNode | null;
	truncated: boolean;
}

export interface SearchHit {
	id: string;
	label: NodeLabel;
	name: string;
	detail: string;
}

export interface SearchResults {
	employees: SearchHit[];
	projects: SearchHit[];
	skills: SearchHit[];
	clients: SearchHit[];
	teams: SearchHit[];
	total: number;
}
