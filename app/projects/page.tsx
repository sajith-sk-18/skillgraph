import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatRange } from "@/lib/utils/format";
import { projectFiltersSchema } from "@/lib/validations/schemas";
import { listProjects } from "@/server/services/project.service";
import type { ProjectStatus } from "@/types/domain";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_TONE: Record<ProjectStatus, "success" | "info" | "muted" | "warning"> = {
	Active: "success",
	Planned: "info",
	Completed: "muted",
	"On Hold": "warning",
};

export default function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
	return (
		<div className="page-shell">
			<PageHeader
				title="Projects"
				description="Engagements, the skills they required and the technologies they used."
				crumbs={[{ label: "Projects" }, { label: "All projects" }]}
				actions={
					<Link
						href="/projects/new"
						className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
					>
						<Plus className="h-3.5 w-3.5" aria-hidden />
						New project
					</Link>
				}
			/>

			<Suspense key={JSON.stringify(searchParams)} fallback={<GridSkeleton />}>
				<ProjectGrid searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function ProjectGrid({ searchParams }: { searchParams: SearchParams }) {
	const parsed = projectFiltersSchema.safeParse(searchParams);
	if (!parsed.success) return <ErrorState message="Those filter values are not valid." />;

	try {
		const { projects, total } = await listProjects(parsed.data);

		if (projects.length === 0) {
			return (
				<EmptyState
					title="No projects found"
					message="Nothing matches those filters. Try clearing the domain or status."
					action={{ label: "Show all projects", href: "/projects" }}
				/>
			);
		}

		const domains = Array.from(new Set(projects.map((project) => project.domain))).sort();

		return (
			<>
				<nav aria-label="Filter by domain" className="mb-4 flex flex-wrap gap-1.5">
					<Link
						href="/projects"
						className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium hover:bg-surface-muted"
					>
						All domains
					</Link>
					{domains.map((domain) => (
						<Link
							key={domain}
							href={`/projects?domain=${encodeURIComponent(domain)}`}
							className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium hover:bg-surface-muted"
						>
							{domain}
						</Link>
					))}
				</nav>

				<p className="mb-3 text-xs text-muted-foreground">
					Showing <span className="tabular font-medium text-foreground">{projects.length}</span> of{" "}
					<span className="tabular font-medium text-foreground">{total}</span> projects
				</p>

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{projects.map((project) => (
						<Card key={project.id} className="transition-colors hover:border-primary/40">
							<CardContent className="space-y-2.5">
								<div className="flex items-start justify-between gap-2">
									<Link
										href={`/projects/${project.id}`}
										className="text-sm font-semibold hover:underline"
									>
										{project.name}
									</Link>
									<Badge tone={STATUS_TONE[project.status]}>{project.status}</Badge>
								</div>

								<p className="line-clamp-2 text-[11px] text-muted-foreground">{project.description}</p>

								<div className="flex flex-wrap gap-1">
									<Badge tone="info">{project.domain}</Badge>
									{project.client ? <Badge tone="warning">{project.client.name}</Badge> : null}
									<Badge tone="muted">
										{project.teamCount} of {project.teamSize} staffed
									</Badge>
								</div>

								<p className="text-[11px] text-muted-foreground">
									{formatRange(project.startDate, project.endDate)} · {project.location}
								</p>

								{project.requiredSkills.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{project.requiredSkills.slice(0, 5).map((skill) => (
											<Badge key={skill.name} tone="primary" className="tabular">
												{skill.name} {skill.requiredProficiency}+
											</Badge>
										))}
									</div>
								) : null}
							</CardContent>
						</Card>
					))}
				</div>
			</>
		);
	} catch {
		return <ErrorState message="Projects could not be loaded from the graph database." />;
	}
}

function GridSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading projects" aria-busy>
			{Array.from({ length: 9 }, (_, index) => (
				<Skeleton key={index} className="h-52" />
			))}
		</div>
	);
}
