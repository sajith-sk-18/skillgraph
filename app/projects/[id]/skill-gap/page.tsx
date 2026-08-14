import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import { idSchema } from "@/lib/validations/schemas";
import { getProjectDetail, getSkillGap } from "@/server/services/project.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Skill gap" };

/**
 * Skill gap analysis.
 *
 * Two traversals: how many of the assigned team meet each required bar, and
 * who outside the team could close the shortfall. They are separate queries -
 * see server/services/project.service.ts for why they cannot be combined.
 */
export default async function SkillGapPage({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) notFound();

	const [project, gap] = await Promise.all([
		getProjectDetail(parsed.data),
		getSkillGap(parsed.data),
	]);

	if (!project || !gap) notFound();

	const open = gap.filter((row) => row.covered === 0);
	const covered = gap.length - open.length;
	const overall = gap.length === 0 ? 0 : Math.round((covered / gap.length) * 100);

	return (
		<div className="page-shell">
			<PageHeader
				title="Skill gap analysis"
				description={`${project.name} - required skills against what the assigned team can actually deliver.`}
				crumbs={[
					{ label: "Projects" },
					{ label: "All projects", href: "/projects" },
					{ label: project.name, href: `/projects/${project.id}` },
					{ label: "Skill gap" },
				]}
			/>

			<div className="mb-4 grid gap-3 sm:grid-cols-3">
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Requirements covered</p>
					<p className="tabular mt-1 text-2xl font-semibold">
						{covered}/{gap.length}
					</p>
					<Progress className="mt-2" value={overall} tone={overall === 100 ? "success" : "warning"} label={`Overall coverage ${overall}%`} />
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Open gaps</p>
					<p className="tabular mt-1 text-2xl font-semibold text-danger">{open.length}</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Team size</p>
					<p className="tabular mt-1 text-2xl font-semibold">{project.team.length}</p>
				</Card>
			</div>

			{project.team.length === 0 ? (
				<EmptyState
					title="No team assigned yet"
					message="Every required skill is an open gap until someone is staffed. Run the staffing engine to build a team."
					action={{ label: "Find the best team", href: `/project-staffing?project=${project.id}` }}
					className="mb-4"
				/>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Requirement by requirement</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<div className="scroll-x">
						<table className="w-full min-w-[720px] text-xs">
							<caption className="sr-only">
								Required skills, how many team members meet the bar, and who could close each gap
							</caption>
							<thead>
								<tr className="border-b border-border text-left text-[11px] text-muted-foreground">
									<th scope="col" className="px-4 py-2 font-medium">Required skill</th>
									<th scope="col" className="px-4 py-2 font-medium">Bar</th>
									<th scope="col" className="px-4 py-2 font-medium">Coverage</th>
									<th scope="col" className="px-4 py-2 font-medium">Gap</th>
									<th scope="col" className="px-4 py-2 font-medium">Who could close it</th>
								</tr>
							</thead>
							<tbody>
								{gap.map((row) => (
									<tr key={row.skill} className="border-b border-border last:border-0">
										<th scope="row" className="px-4 py-2.5 text-left font-medium">{row.skill}</th>
										<td className="tabular px-4 py-2.5 text-muted-foreground">{row.requiredProficiency}+</td>
										<td className="px-4 py-2.5">
											<div className="flex items-center gap-2">
												<Progress
													className="w-20"
													value={row.coveragePercent}
													tone={row.covered > 0 ? "success" : "danger"}
													label={`${row.skill} coverage ${row.coveragePercent}%`}
												/>
												<span className="tabular text-[11px] text-muted-foreground">
													{row.covered}/{row.total}
												</span>
											</div>
										</td>
										<td className="px-4 py-2.5">
											{row.covered > 0 ? (
												<Badge tone="success">None</Badge>
											) : (
												<Badge tone="danger">Not covered</Badge>
											)}
										</td>
										<td className="px-4 py-2.5">
											{row.suggestions.length === 0 ? (
												<span className="text-[11px] text-muted-foreground">
													Nobody outside the team meets this bar
												</span>
											) : (
												<div className="flex flex-wrap gap-1">
													{row.suggestions.map((person) => (
														<Link key={person.id} href={`/employees/${person.id}`}>
															<Badge tone="primary" className="tabular">
																{person.name} {person.proficiency}
															</Badge>
														</Link>
													))}
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
