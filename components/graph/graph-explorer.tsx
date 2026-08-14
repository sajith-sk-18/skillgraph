"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { NODE_LABELS, type GraphData, type GraphNode, type NodeLabel, type SearchHit } from "@/types/graph";

const GraphCanvas = dynamic(
	() => import("@/components/graph/graph-canvas").then((module) => module.GraphCanvas),
	{ ssr: false, loading: () => <Skeleton className="h-[560px] w-full" /> },
);

const GraphLegend = dynamic(
	() => import("@/components/graph/graph-canvas").then((module) => module.GraphLegend),
	{ ssr: false },
);

export interface StartingPoints {
	employees: SearchHit[];
	projects: SearchHit[];
	skills: SearchHit[];
	clients: SearchHit[];
	teams: SearchHit[];
}

interface NodeDetail {
	label: NodeLabel;
	node: GraphNode;
	connections: { type: string; count: number }[];
}

const ENTITY_GROUPS: { key: keyof StartingPoints; label: string }[] = [
	{ key: "employees", label: "Employee" },
	{ key: "projects", label: "Project" },
	{ key: "skills", label: "Skill" },
	{ key: "clients", label: "Client" },
	{ key: "teams", label: "Team" },
];

const DETAIL_HREF: Partial<Record<NodeLabel, (id: string) => string>> = {
	Employee: (id) => `/employees/${id}`,
	Project: (id) => `/projects/${id}`,
	Skill: (id) => `/skills/${id}`,
};

/**
 * The graph explorer.
 *
 * Every node and edge comes from a traversal - nothing is hardcoded, and the
 * canvas has no knowledge of the domain. Expansion re-centres the traversal on
 * the clicked node rather than merging results, which keeps the view legible
 * in a graph where a popular skill has 40+ edges.
 */
export function GraphExplorer({
	startingPoints,
	initialNodeId,
}: {
	startingPoints: StartingPoints;
	initialNodeId?: string;
}) {
	const allOptions = ENTITY_GROUPS.flatMap((group) => startingPoints[group.key]);
	const fallbackId = initialNodeId ?? startingPoints.employees[0]?.id ?? allOptions[0]?.id ?? "";

	const [rootId, setRootId] = useState(fallbackId);
	const [nodeId, setNodeId] = useState(fallbackId);
	const [depth, setDepth] = useState(1);
	const [labels, setLabels] = useState<NodeLabel[]>([]);
	const [data, setData] = useState<GraphData | null>(null);
	const [detail, setDetail] = useState<NodeDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (id: string, nextDepth: number, nextLabels: NodeLabel[]) => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({ depth: String(nextDepth), limit: "80" });
			if (nextLabels.length > 0) params.set("labels", nextLabels.join(","));

			const response = await fetch(`/api/graph/node/${id}?${params.toString()}`);
			if (!response.ok) throw new Error("failed");

			const payload = await response.json();
			setData(payload);
			setDetail(payload.detail ?? null);
		} catch {
			setError("That traversal could not be completed. The graph database may be briefly unavailable.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load(nodeId, depth, labels);
	}, [nodeId, depth, labels, load]);

	const toggleLabel = (label: NodeLabel) =>
		setLabels((current) =>
			current.includes(label) ? current.filter((value) => value !== label) : [...current, label],
		);

	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
			<div className="order-2 lg:order-1">
				<Card className="overflow-hidden">
					<div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
						<label htmlFor="explorer-entity" className="text-[11px] text-muted-foreground">
							Start from
						</label>
						<Select
							id="explorer-entity"
							className="h-8 w-auto max-w-[16rem]"
							value={nodeId}
							onChange={(event) => {
								setRootId(event.target.value);
								setNodeId(event.target.value);
							}}
						>
							{ENTITY_GROUPS.map((group) => (
								<optgroup key={group.key} label={group.label}>
									{startingPoints[group.key].map((option) => (
										<option key={option.id} value={option.id}>
											{option.name}
										</option>
									))}
								</optgroup>
							))}
						</Select>

						<label htmlFor="explorer-depth" className="text-[11px] text-muted-foreground">
							Depth
						</label>
						<Select
							id="explorer-depth"
							className="h-8 w-auto"
							value={depth}
							onChange={(event) => setDepth(Number(event.target.value))}
						>
							<option value={1}>1</option>
							<option value={2}>2</option>
							<option value={3}>3</option>
						</Select>

						{nodeId !== rootId ? (
							<Button variant="secondary" size="sm" onClick={() => setNodeId(rootId)}>
								<RotateCcw className="h-3 w-3" aria-hidden />
								Reset
							</Button>
						) : null}

						{loading ? (
							<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
								<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
								Traversing...
							</span>
						) : data ? (
							<span className="ml-auto text-[11px] text-muted-foreground">
								{data.nodes.length} nodes · {data.relationships.length} relationships
								{data.truncated ? " · capped" : ""}
							</span>
						) : null}
					</div>

					{error ? (
						<p role="alert" className="px-4 py-16 text-center text-xs text-danger">
							{error}
						</p>
					) : data && data.nodes.length > 0 ? (
						<GraphCanvas
							data={data}
							height={560}
							onNodeClick={(node) => setNodeId(node.id)}
						/>
					) : (
						<Skeleton className="h-[560px] w-full" />
					)}

					<div className="border-t border-border px-3 py-2">
						<GraphLegend labels={NODE_LABELS as unknown as NodeLabel[]} />
					</div>
				</Card>
				<p className="mt-2 text-[11px] text-muted-foreground">
					Click any node to re-centre the traversal on it. Drag to pan, scroll to zoom.
				</p>
			</div>

			<div className="order-1 space-y-4 lg:order-2">
				<Card>
					<CardHeader>
						<CardTitle>Node types</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							Filter which labels the traversal returns.
						</p>
					</CardHeader>
					<CardContent className="space-y-1.5">
						{NODE_LABELS.map((label) => (
							<label key={label} className="flex cursor-pointer items-center gap-2 text-xs">
								<input
									type="checkbox"
									checked={labels.includes(label)}
									onChange={() => toggleLabel(label)}
									className="h-3.5 w-3.5 rounded border-border"
								/>
								{label}
							</label>
						))}
						{labels.length > 0 ? (
							<Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setLabels([])}>
								Show all types
							</Button>
						) : null}
					</CardContent>
				</Card>

				{detail ? (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between gap-2">
								<span className="truncate">{detail.node.name}</span>
								<Badge tone="primary">{detail.label}</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<dl className="space-y-1 text-[11px]">
								{Object.entries(detail.node.properties)
									.filter(([key]) => !["id", "name", "bio", "description"].includes(key))
									.slice(0, 6)
									.map(([key, value]) => (
										<div key={key} className="flex justify-between gap-2">
											<dt className="text-muted-foreground">{key}</dt>
											<dd className="truncate font-medium">{String(value ?? "-")}</dd>
										</div>
									))}
							</dl>

							<div>
								<p className="mb-1 text-[11px] font-medium text-muted-foreground">Relationships</p>
								<ul className="flex flex-wrap gap-1">
									{detail.connections.map((connection) => (
										<li key={connection.type}>
											<Badge tone="muted" className="tabular">
												{connection.type} · {connection.count}
											</Badge>
										</li>
									))}
								</ul>
							</div>

							{DETAIL_HREF[detail.label] ? (
								<Link
									href={DETAIL_HREF[detail.label]!(detail.node.id)}
									className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-medium hover:bg-surface-muted"
								>
									Open full record
								</Link>
							) : null}
						</CardContent>
					</Card>
				) : null}
			</div>
		</div>
	);
}
