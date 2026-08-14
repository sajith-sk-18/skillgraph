import { Suspense } from "react";
import Link from "next/link";

import {
	BarChartCard,
	DonutChartCard,
	SeniorityRadar,
	SupplyDemandChart,
} from "@/components/analytics/charts";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { getFullAnalytics } from "@/server/services/analytics.service";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
	return (
		<div className="page-shell">
			<PageHeader
				title="Analytics"
				description="Eleven aggregations over the live graph. Every figure is computed on request - there are no summary tables in the database."
				crumbs={[{ label: "Intelligence" }, { label: "Analytics" }]}
			/>
			<Suspense fallback={<AnalyticsSkeleton />}>
				<Panels />
			</Suspense>
		</div>
	);
}

async function Panels() {
	try {
		const data = await getFullAnalytics();

		const departmentsWithCategories = data.skillsByDepartment.reduce<
			Record<string, { category: string; value: number }[]>
		>((accumulator, row) => {
			accumulator[row.department] = [
				...(accumulator[row.department] ?? []),
				{ category: row.category, value: row.value },
			];
			return accumulator;
		}, {});

		return (
			<div className="space-y-4">
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>People by department</CardTitle>
						</CardHeader>
						<CardContent>
							<BarChartCard data={data.byDepartment} horizontal height={280} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Seniority distribution</CardTitle>
						</CardHeader>
						<CardContent>
							<SeniorityRadar data={data.bySeniority} height={280} />
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Skill supply against project demand</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							People at proficiency 7 or above, against how many projects list the skill as a
							requirement. Where the orange bar leads, the organisation is short.
						</p>
					</CardHeader>
					<CardContent>
						<SupplyDemandChart data={data.supplyVsDemand} />
					</CardContent>
				</Card>

				<div className="grid gap-4 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle>Availability</CardTitle>
						</CardHeader>
						<CardContent>
							<DonutChartCard data={data.byAvailability} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Projects by domain</CardTitle>
						</CardHeader>
						<CardContent>
							<DonutChartCard data={data.projectsByDomain} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Most common skills</CardTitle>
						</CardHeader>
						<CardContent>
							<BarChartCard data={data.topSkills} horizontal height={240} color="#a855f7" />
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Most connected people</CardTitle>
							<p className="text-[11px] text-muted-foreground">
								Degree over WORKED_WITH - a question a graph answers directly.
							</p>
						</CardHeader>
						<CardContent className="space-y-2">
							{data.mostConnected.map((row) => (
								<Link
									key={row.employee.id}
									href={`/employees/${row.employee.id}`}
									className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 hover:border-primary/40"
								>
									<Avatar name={row.employee.name} size="sm" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium">{row.employee.name}</p>
										<p className="truncate text-[11px] text-muted-foreground">
											{row.employee.jobTitle}
										</p>
									</div>
									<Badge tone="primary" className="tabular shrink-0">
										{row.connections} colleagues
									</Badge>
								</Link>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Most experienced people</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{data.mostExperienced.map((row) => (
								<Link
									key={row.employee.id}
									href={`/employees/${row.employee.id}`}
									className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 hover:border-primary/40"
								>
									<Avatar name={row.employee.name} size="sm" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-xs font-medium">{row.employee.name}</p>
										<p className="truncate text-[11px] text-muted-foreground">
											{row.employee.jobTitle}
										</p>
									</div>
									<Badge tone="muted" className="tabular shrink-0">
										{row.employee.yearsOfExperience} yrs · {row.projectCount} projects
									</Badge>
								</Link>
							))}
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Most collaborative teams</CardTitle>
							<p className="text-[11px] text-muted-foreground">
								Internal WORKED_WITH links within each team.
							</p>
						</CardHeader>
						<CardContent className="p-0">
							<div className="scroll-x">
								<table className="w-full min-w-[420px] text-xs">
									<caption className="sr-only">Teams ranked by internal collaboration links</caption>
									<thead>
										<tr className="border-b border-border text-left text-[11px] text-muted-foreground">
											<th scope="col" className="px-4 py-2 font-medium">Team</th>
											<th scope="col" className="px-4 py-2 font-medium">People</th>
											<th scope="col" className="px-4 py-2 font-medium">Links</th>
											<th scope="col" className="px-4 py-2 font-medium">Shared projects</th>
										</tr>
									</thead>
									<tbody>
										{data.collaborativeTeams.map((team) => (
											<tr key={team.label} className="border-b border-border last:border-0">
												<th scope="row" className="px-4 py-2 text-left font-medium">
													{team.label}
													<span className="ml-1.5 font-normal text-[10px] text-muted-foreground">
														{team.department}
													</span>
												</th>
												<td className="tabular px-4 py-2">{team.headcount}</td>
												<td className="tabular px-4 py-2">{team.internalConnections}</td>
												<td className="tabular px-4 py-2">{team.sharedProjects}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Skills by department</CardTitle>
							<p className="text-[11px] text-muted-foreground">
								Which skill categories each department actually holds.
							</p>
						</CardHeader>
						<CardContent className="space-y-3">
							{Object.entries(departmentsWithCategories).map(([department, categories]) => (
								<div key={department}>
									<p className="mb-1 text-[11px] font-medium">{department}</p>
									<div className="flex flex-wrap gap-1">
										{categories
											.sort((a, b) => b.value - a.value)
											.map((entry) => (
												<Badge key={entry.category} tone="muted" className="tabular">
													{entry.category} · {entry.value}
												</Badge>
											))}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		);
	} catch {
		return <ErrorState message="Analytics could not be computed from the graph database." />;
	}
}

function AnalyticsSkeleton() {
	return (
		<div className="space-y-4" aria-label="Loading analytics" aria-busy>
			<div className="grid gap-4 lg:grid-cols-2">
				<Skeleton className="h-80" />
				<Skeleton className="h-80" />
			</div>
			<Skeleton className="h-96" />
		</div>
	);
}
