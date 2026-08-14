"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Loader2, Network, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { NODE_LABELS, type GraphData, type GraphNode, type NodeLabel } from "@/types/graph";

/**
 * React Flow measures the DOM, so it cannot render on the server.
 *
 * Loading it through `next/dynamic` with `ssr: false` keeps the visualisation
 * out of the server render AND out of the initial JavaScript bundle - it is
 * only fetched when someone actually opens the network view.
 */
const GraphCanvas = dynamic(
	() => import("@/components/graph/graph-canvas").then((module) => module.GraphCanvas),
	{ ssr: false, loading: () => <Skeleton className="h-[420px] w-full" /> },
);

const DETAIL_HREF: Partial<Record<NodeLabel, (id: string) => string>> = {
	Employee: (id) => `/employees/${id}`,
	Project: (id) => `/projects/${id}`,
	Skill: (id) => `/skills/${id}`,
};

export function EmployeeNetwork({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
	const [data, setData] = useState<GraphData | null>(null);
	const [selected, setSelected] = useState<GraphNode | null>(null);
	const [depth, setDepth] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [opened, setOpened] = useState(false);

	const load = useCallback(
		async (nodeId: string, nextDepth: number) => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/graph/node/${nodeId}?depth=${nextDepth}&limit=70`);
				if (!response.ok) throw new Error("request failed");
				setData(await response.json());
			} catch {
				setError("The network could not be loaded. The graph database may be briefly unavailable.");
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const open = () => {
		setOpened(true);
		void load(employeeId, depth);
	};

	if (!opened) {
		return (
			<div className="card-surface flex flex-col items-center gap-3 px-6 py-10 text-center">
				<Network className="h-6 w-6 text-primary" aria-hidden />
				<div>
					<p className="text-sm font-semibold">Explore {employeeName}&apos;s network</p>
					<p className="mt-1 max-w-md text-xs text-muted-foreground">
						Skills, projects, co-workers, certifications and teams as a live graph traversal. Click any
						node to expand it.
					</p>
				</div>
				<Button onClick={open}>Explore network</Button>
			</div>
		);
	}

	return (
		<div className="card-surface overflow-hidden">
			<div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
				<label htmlFor="network-depth" className="text-[11px] text-muted-foreground">
					Depth
				</label>
				<Select
					id="network-depth"
					className="h-8 w-auto"
					value={depth}
					onChange={(event) => {
						const next = Number(event.target.value);
						setDepth(next);
						void load(selected?.id ?? employeeId, next);
					}}
				>
					<option value={1}>1 hop</option>
					<option value={2}>2 hops</option>
					<option value={3}>3 hops</option>
				</Select>

				{selected && selected.id !== employeeId ? (
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							setSelected(null);
							void load(employeeId, depth);
						}}
					>
						<RotateCcw className="h-3 w-3" aria-hidden />
						Back to {employeeName.split(" ")[0]}
					</Button>
				) : null}

				{loading ? (
					<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
						Traversing...
					</span>
				) : data ? (
					<span className="text-[11px] text-muted-foreground">
						{data.nodes.length} nodes · {data.relationships.length} relationships
						{data.truncated ? " (capped)" : ""}
					</span>
				) : null}

				{selected ? (
					<div className="ml-auto flex items-center gap-2">
						<Badge tone="primary">{selected.label}</Badge>
						<span className="text-xs font-medium">{selected.name}</span>
						{DETAIL_HREF[selected.label] ? (
							<Link
								href={DETAIL_HREF[selected.label]!(selected.id)}
								className="text-[11px] text-primary hover:underline"
							>
								Open
							</Link>
						) : null}
					</div>
				) : null}
			</div>

			{error ? (
				<p role="alert" className="px-4 py-10 text-center text-xs text-danger">
					{error}
				</p>
			) : data && data.nodes.length > 0 ? (
				<>
					<GraphCanvas
						data={data}
						height={440}
						onNodeClick={(node) => {
							setSelected(node);
							// Clicking a node re-centres the traversal on it, which is
							// what "expand" means in a graph this dense.
							void load(node.id, depth);
						}}
					/>
					<div className="border-t border-border px-3 py-2">
						<GraphLegendClient />
					</div>
				</>
			) : (
				<Skeleton className="h-[440px] w-full" />
			)}
		</div>
	);
}

/** Legend is trivial and shares the canvas colour map, so it loads with it. */
const GraphLegendClient = dynamic(
	() =>
		import("@/components/graph/graph-canvas").then((module) => {
			const Legend = module.GraphLegend;
			const Wrapped = () => <Legend labels={NODE_LABELS as unknown as NodeLabel[]} />;
			Wrapped.displayName = "GraphLegendClient";
			return Wrapped;
		}),
	{ ssr: false },
);
