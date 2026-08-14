import { Suspense } from "react";
import Link from "next/link";
import {
	Braces,
	Building2,
	FolderKanban,
	Network,
	Sparkles,
	UserCheck,
	Users,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { getDashboardAnalytics, getDashboardStats } from "@/server/services/analytics.service";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * Server Component.
 *
 * Every figure is read from CognoDB during the render - there is no client
 * fetch, no loading spinner on first paint, and no data in the JavaScript
 * bundle. Sections stream in via Suspense so one slow aggregation cannot hold
 * up the whole page.
 */
export default function DashboardPage() {
	return (
		<div className="page-shell">
			<PageHeader
				title="Dashboard"
				description="Every number below is computed by traversing the graph at request time. Nothing is precomputed or cached."
				crumbs={[{ label: "Overview" }, { label: "Dashboard" }]}
			/>

			<Suspense fallback={<StatsSkeleton />}>
				<StatsSection />
			</Suspense>

			<Suspense fallback={<PanelsSkeleton />}>
				<AnalyticsSection />
			</Suspense>
		</div>
	);
}

async function StatsSection() {
	try {
		const stats = await getDashboardStats();
		return (
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard label="Employees" value={stats.totalEmployees} icon={Users} tone="primary" hint={`${stats.totalTeams} teams`} />
				<StatCard label="Available now" value={stats.availableEmployees} icon={UserCheck} tone="success" hint="Ready to be staffed" />
				<StatCard label="Skills tracked" value={stats.totalSkills} icon={Braces} tone="accent" hint="Skills and technologies" />
				<StatCard label="Projects" value={stats.totalProjects} icon={FolderKanban} tone="info" hint={`${stats.activeProjects} active · ${stats.plannedProjects} planned`} />
				<StatCard label="Clients" value={stats.totalClients} icon={Building2} tone="warning" />
				<StatCard label="Graph nodes" value={stats.totalNodes} icon={Network} tone="primary" />
				<StatCard label="Relationships" value={stats.totalRelationships} icon={Network} tone="accent" hint="Typed edges in CognoDB" />
				<Link href="/project-staffing" className="block">
					<Card className="h-full bg-primary p-4 text-primary-foreground transition-opacity hover:opacity-95">
						<div className="flex h-full flex-col justify-between gap-2">
							<Sparkles className="h-5 w-5" aria-hidden />
							<div>
								<p className="text-sm font-semibold">Find the best team</p>
								<p className="mt-0.5 text-[11px] opacity-80">Match people to a new project</p>
							</div>
						</div>
					</Card>
				</Link>
			</div>
		);
	} catch {
		return <ErrorState message="The graph database could not be reached. Check that CognoDB is running and the credentials in .env.local are correct." />;
	}
}

async function AnalyticsSection() {
	try {
		const data = await getDashboardAnalytics();
		const maxDepartment = Math.max(...data.byDepartment.map((row) => row.value), 1);
		const maxSkill = Math.max(...data.topSkills.map((row) => row.value), 1);
		const maxDomain = Math.max(...data.projectsByDomain.map((row) => row.value), 1);

		return (
			<div className="mt-4 grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>People by department</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2.5">
						{data.byDepartment.map((row) => (
							<div key={row.label}>
								<div className="flex justify-between text-xs">
									<span className="truncate">{row.label}</span>
									<span className="tabular text-muted-foreground">{row.value}</span>
								</div>
								<Progress className="mt-1" value={row.value} max={maxDepartment} label={`${row.label}: ${row.value} people`} />
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Most common skills</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2.5">
						{data.topSkills.map((row) => (
							<div key={row.label}>
								<div className="flex justify-between text-xs">
									<span className="truncate">{row.label}</span>
									<span className="tabular text-muted-foreground">
										{row.value} · avg {row.averageProficiency}
									</span>
								</div>
								<Progress className="mt-1" value={row.value} max={maxSkill} tone="accent" label={`${row.label}: ${row.value} people`} />
							</div>
						))}
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Availability</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{data.byAvailability.map((row) => (
								<div key={row.label} className="flex items-center justify-between text-xs">
									<Badge tone={row.label === "Available" ? "success" : row.label === "Allocated" ? "muted" : "warning"}>
										{row.label}
									</Badge>
									<span className="tabular font-medium">{row.value}</span>
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Projects by domain</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{data.projectsByDomain.slice(0, 6).map((row) => (
								<div key={row.label}>
									<div className="flex justify-between text-xs">
										<span className="truncate">{row.label}</span>
										<span className="tabular text-muted-foreground">{row.value}</span>
									</div>
									<Progress className="mt-1" value={row.value} max={maxDomain} tone="info" label={`${row.label}: ${row.value} projects`} />
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Most connected people</CardTitle>
						<p className="text-xs text-muted-foreground">
							Degree centrality over WORKED_WITH - the edge derived from shared project history.
						</p>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
							{data.mostConnected.map((row) => (
								<Link
									key={row.employee.id}
									href={`/employees/${row.employee.id}`}
									className="flex items-center gap-2.5 rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
								>
									<Avatar name={row.employee.name} size="sm" />
									<div className="min-w-0">
										<p className="truncate text-xs font-medium">{row.employee.name}</p>
										<p className="tabular text-[11px] text-muted-foreground">
											{row.connections} colleagues · {row.sharedProjects} shared
										</p>
									</div>
								</Link>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	} catch {
		return <ErrorState className="mt-4" message="Analytics could not be loaded from the graph." />;
	}
}

function StatsSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading statistics" aria-busy>
			{Array.from({ length: 8 }, (_, index) => (
				<Skeleton key={index} className="h-[92px]" />
			))}
		</div>
	);
}

function PanelsSkeleton() {
	return (
		<div className="mt-4 grid gap-4 lg:grid-cols-3" aria-label="Loading analytics" aria-busy>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-72" />
			))}
		</div>
	);
}
