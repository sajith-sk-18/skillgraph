import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StaffingWorkbench } from "@/components/staffing/staffing-workbench";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { projectFiltersSchema } from "@/lib/validations/schemas";
import { listProjects } from "@/server/services/project.service";

export const metadata = { title: "Find the Best Team" };
export const dynamic = "force-dynamic";

/**
 * The headline feature.
 *
 * The page is a Server Component that only loads the project list; the
 * workbench itself is interactive and calls the API. Planned projects are
 * listed first because an unstaffed project is the reason anyone opens this
 * screen.
 */
export default function ProjectStaffingPage({
	searchParams,
}: {
	searchParams: { project?: string };
}) {
	return (
		<div className="page-shell">
			<PageHeader
				title="Find the Best Team"
				description="Match employees to a project using skills, experience, project history and collaboration relationships."
				crumbs={[{ label: "Projects" }, { label: "Find Best Team" }]}
			/>
			<Suspense fallback={<Skeleton className="h-64" />}>
				<Workbench initialProjectId={searchParams.project} />
			</Suspense>
		</div>
	);
}

async function Workbench({ initialProjectId }: { initialProjectId?: string }) {
	try {
		const { projects } = await listProjects(projectFiltersSchema.parse({ limit: "100" }));

		if (projects.length === 0) {
			return (
				<EmptyState
					title="No projects to staff"
					message="Create a project first, then come back to build its team."
					action={{ label: "Create a project", href: "/projects/new" }}
				/>
			);
		}

		// Unstaffed work first - that is what a resourcing manager came here for.
		const ordered = [...projects].sort((a, b) => {
			const rank = (status: string) => (status === "Planned" ? 0 : status === "Active" ? 1 : 2);
			return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name);
		});

		return (
			<StaffingWorkbench
				initialProjectId={initialProjectId}
				projects={ordered.map((project) => ({
					id: project.id,
					name: project.name,
					domain: project.domain,
					status: project.status,
					teamSize: project.teamSize,
				}))}
			/>
		);
	} catch {
		return <ErrorState message="Projects could not be loaded from the graph database." />;
	}
}
