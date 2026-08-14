"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
	Background,
	Controls,
	MarkerType,
	ReactFlow,
	useEdgesState,
	useNodesState,
	type Edge,
	type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type { GraphData, GraphNode, NodeLabel } from "@/types/graph";

/**
 * Renders a GraphData payload from CognoDB.
 *
 * Nothing here knows what an Employee is - it draws whatever labels and
 * relationship types the traversal returned, so adding a node label to the
 * model needs no change in this file.
 */

const LABEL_STYLE: Record<NodeLabel, { bg: string; border: string; text: string }> = {
	Employee: { bg: "#eef2ff", border: "#6366f1", text: "#3730a3" },
	Skill: { bg: "#f5f3ff", border: "#a855f7", text: "#6b21a8" },
	Project: { bg: "#ecfeff", border: "#06b6d4", text: "#155e75" },
	Client: { bg: "#fff7ed", border: "#f59e0b", text: "#92400e" },
	Team: { bg: "#f0fdf4", border: "#22c55e", text: "#166534" },
	Role: { bg: "#fdf2f8", border: "#ec4899", text: "#9d174d" },
	Certification: { bg: "#fefce8", border: "#eab308", text: "#854d0e" },
	Domain: { bg: "#f1f5f9", border: "#64748b", text: "#334155" },
};

/**
 * Radial layout by hop distance from the centre.
 *
 * React Flow does not lay out graphs, and a force simulation is both heavier
 * and non-deterministic - the same query would draw differently on every
 * render, which makes a demo hard to narrate. Breadth-first rings are stable
 * and make the "one hop away / two hops away" structure legible, which is the
 * whole point of the view.
 */
function layout(data: GraphData): Map<string, { x: number; y: number }> {
	const positions = new Map<string, { x: number; y: number }>();
	const centerId = data.center?.id ?? data.nodes[0]?.id;
	if (!centerId) return positions;

	const adjacency = new Map<string, Set<string>>();
	for (const node of data.nodes) adjacency.set(node.id, new Set());
	for (const edge of data.relationships) {
		adjacency.get(edge.source)?.add(edge.target);
		adjacency.get(edge.target)?.add(edge.source);
	}

	const depth = new Map<string, number>([[centerId, 0]]);
	const queue = [centerId];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		for (const neighbour of adjacency.get(current) ?? []) {
			if (!depth.has(neighbour)) {
				depth.set(neighbour, (depth.get(current) ?? 0) + 1);
				queue.push(neighbour);
			}
		}
	}

	const rings = new Map<number, string[]>();
	for (const node of data.nodes) {
		// Anything the traversal returned but did not connect sits on the outer ring.
		const ring = depth.get(node.id) ?? 3;
		rings.set(ring, [...(rings.get(ring) ?? []), node.id]);
	}

	positions.set(centerId, { x: 0, y: 0 });

	for (const [ring, ids] of Array.from(rings.entries())) {
		if (ring === 0) continue;
		const radius = ring * 260;
		const step = (2 * Math.PI) / Math.max(ids.length, 1);
		ids.forEach((id, index) => {
			// Offset each ring so nodes do not line up spoke-on-spoke.
			const angle = index * step + ring * 0.4;
			positions.set(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.72 });
		});
	}

	return positions;
}

function toFlowNodes(data: GraphData, positions: Map<string, { x: number; y: number }>): Node[] {
	return data.nodes.map((node) => {
		const style = LABEL_STYLE[node.label] ?? LABEL_STYLE.Domain;
		const isCenter = node.id === data.center?.id;

		return {
			id: node.id,
			position: positions.get(node.id) ?? { x: 0, y: 0 },
			data: { label: node.name, graphNode: node },
			type: "default",
			style: {
				background: style.bg,
				border: `${isCenter ? 2.5 : 1.5}px solid ${style.border}`,
				color: style.text,
				borderRadius: 10,
				padding: "8px 12px",
				fontSize: 11,
				fontWeight: isCenter ? 700 : 500,
				width: 170,
				textAlign: "center" as const,
				boxShadow: isCenter ? `0 0 0 4px ${style.border}22` : "none",
			},
		};
	});
}

function toFlowEdges(data: GraphData): Edge[] {
	return data.relationships.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		label: edge.type,
		labelStyle: { fontSize: 9, fill: "#64748b", fontWeight: 600 },
		labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
		labelBgPadding: [4, 2] as [number, number],
		labelBgBorderRadius: 4,
		style: { stroke: "#cbd5e1", strokeWidth: 1.4 },
		markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1", width: 14, height: 14 },
	}));
}

export function GraphCanvas({
	data,
	onNodeClick,
	className,
	height = 520,
}: {
	data: GraphData;
	onNodeClick?: (node: GraphNode) => void;
	className?: string;
	height?: number;
}) {
	const positions = useMemo(() => layout(data), [data]);
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toFlowNodes(data, positions));
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(data));

	// The payload changes when the user expands a node or changes depth.
	useEffect(() => {
		setNodes(toFlowNodes(data, positions));
		setEdges(toFlowEdges(data));
	}, [data, positions, setNodes, setEdges]);

	const handleNodeClick = useCallback(
		(_event: unknown, node: Node) => {
			const graphNode = (node.data as { graphNode?: GraphNode }).graphNode;
			if (graphNode && onNodeClick) onNodeClick(graphNode);
		},
		[onNodeClick],
	);

	return (
		<div
			className={className}
			style={{ height }}
			role="application"
			aria-label={`Graph of ${data.nodes.length} connected entities`}
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeClick={handleNodeClick}
				fitView
				fitViewOptions={{ padding: 0.2 }}
				minZoom={0.15}
				maxZoom={2}
				proOptions={{ hideAttribution: true }}
				nodesConnectable={false}
				nodesDraggable
				elementsSelectable
			>
				<Background gap={20} size={1} color="#e2e8f0" />
				<Controls showInteractive={false} />
			</ReactFlow>
		</div>
	);
}

/** The colour key, exported so pages can render it beside the canvas. */
export function GraphLegend({ labels }: { labels: NodeLabel[] }) {
	return (
		<ul className="flex flex-wrap gap-2">
			{labels.map((label) => {
				const style = LABEL_STYLE[label] ?? LABEL_STYLE.Domain;
				return (
					<li key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span
							aria-hidden
							className="h-2.5 w-2.5 rounded-sm border"
							style={{ background: style.bg, borderColor: style.border }}
						/>
						{label}
					</li>
				);
			})}
		</ul>
	);
}
