import { Suspense } from "react";

import { GraphExplorer } from "@/components/graph/graph-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { getStartingPoints } from "@/server/services/graph.service";

export const metadata = { title: "Graph Explorer" };
export const dynamic = "force-dynamic";

export default function GraphExplorerPage({ searchParams }: { searchParams: { node?: string } }) {
	return (
		<div className="page-shell">
			<PageHeader
				title="Graph Explorer"
				description="Walk the property graph directly. Every node and every labelled edge comes from a live traversal of CognoDB."
				crumbs={[{ label: "Intelligence" }, { label: "Graph Explorer" }]}
			/>
			<Suspense fallback={<Skeleton className="h-[600px]" />}>
				<Explorer initialNodeId={searchParams.node} />
			</Suspense>
		</div>
	);
}

async function Explorer({ initialNodeId }: { initialNodeId?: string }) {
	try {
		return <GraphExplorer startingPoints={await getStartingPoints()} initialNodeId={initialNodeId} />;
	} catch {
		return <ErrorState message="The explorer could not load its starting points from the graph database." />;
	}
}
