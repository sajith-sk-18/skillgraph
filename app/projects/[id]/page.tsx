import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Target } from "lucide-react";

import { SkillBar } from "@/components/employees/skill-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRange } from "@/lib/utils/format";
import { idSchema } from "@/lib/validations/schemas";
import { getProjectDetail, getSkillGap } from "@/server/services/project.service";
import type { ProjectStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<ProjectStatus, "success" | "info" | "muted" | "warning"> = {
	Active: "success",
	Planned: "info",
	Completed: "muted",
	"On Hold": "warning",
};

export async function generateMetadata({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) return { title: "Project" };
	const project = await getProjectDetail(parsed.data).catch(() => null);
	return { title: project?.name ?? "Project" };
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) notFound();

	const project = await getProjectDetail(parsed.data);
	if (!project) notFound();

	const gap = await getSkillGap(parsed.data).catch(() => null);
	const gaps = gap?.filter((row) => row.covered === 0) ?? [];

	return (
		<div className="page-shell">
			<PageHeader
				title={project.name}
				description={project.description}
				crumbs={[
					{ label: "Projects" },
					{ label: "All projects", href: "/projects" },
					{ label: project.name },
				]}
				actions={
					<>
						<Badge tone={STATUS_TONE[project.status]}>{project.status}</Badge>
						<Link
							href={`/project-staffing?project=${project.id}`}
							className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
						>
							<Sparkles className="h-3.5 w-3.5" aria-hidden />
							Find best team
						</Link>
					</>
				}
			/>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Client</p>
					<p className="mt-1 truncate text-sm font-semibold">{project.client?.name ?? "-"}</p>
					<p className="text-[11px] text-muted-foreground">{project.client?.country ?? ""}</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Domain</p>
					<p className="mt-1 text-sm font-semibold">{project.domain}</p>
					<p className="text-[11px] text-muted-foreground">{project.location}</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Timeline</p>
					<p className="mt-1 text-sm font-semibold">{formatRange(project.startDate, project.endDate)}</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Team</p>
					<p className="tabular mt-1 text-sm font-semibold">
						{project.team.length} of {project.teamSize}
					</p>
					<p className="text-[11px] text-muted-foreground">
						{project.team.length === 0 ? "Not yet staffed" : "assigned"}
					</p>
				</Card>
			</div>

			<div className="mt-4 grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Required skills</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							The bar is a property of the REQUIRED_SKILL relationship.
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						{project.requiredSkills.map((requirement) => (
							<SkillBar
								key={requirement.skillId}
								name={requirement.skillName}
								proficiency={requirement.requiredProficiency}
								years={requirement.requiredYears}
							/>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Technologies used</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="flex flex-wrap gap-1.5">
							{project.technologies.map((technology) => (
								<li key={technology.id}>
									<Link href={`/skills/${technology.id}`}>
										<Badge tone="accent">{technology.name}</Badge>
									</Link>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-1.5">
							<Target className="h-3.5 w-3.5" aria-hidden />
							Skill coverage
						</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							How much of the requirement the current team meets.
						</p>
					</CardHeader>
					<CardContent>
						{!gap ? (
							<p className="text-xs text-muted-foreground">Coverage could not be computed.</p>
						) : project.team.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								Nobody is assigned yet, so every required skill is an open gap.
							</p>
						) : (
							<ul className="space-y-2">
								{gap.map((row) => (
									<li key={row.skill} className="flex items-center justify-between gap-2 text-xs">
										<span className="truncate">{row.skill}</span>
										<Badge tone={row.covered > 0 ? "success" : "danger"} className="tabular">
											{row.covered}/{row.total} meet {row.requiredProficiency}+
										</Badge>
									</li>
								))}
							</ul>
						)}
						<Link
							href={`/projects/${project.id}/skill-gap`}
							className="mt-3 inline-block text-[11px] text-primary hover:underline"
						>
							Full gap analysis {gaps.length > 0 ? `(${gaps.length} open)` : ""} &rarr;
						</Link>
					</CardContent>
				</Card>
			</div>

			<Card className="mt-4">
				<CardHeader>
					<CardTitle>Team</CardTitle>
				</CardHeader>
				<CardContent>
					{project.team.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-6 text-center">
							<p className="text-xs text-muted-foreground">
								This project has no team yet. That is what the staffing engine is for.
							</p>
							<Link
								href={`/project-staffing?project=${project.id}`}
								className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground"
							>
								<Sparkles className="h-3.5 w-3.5" aria-hidden />
								Find the best team
							</Link>
						</div>
					) : (
						<div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
							{project.team.map((member) => (
								<Link
									key={member.employee.id}
									href={`/employees/${member.employee.id}`}
									className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40"
								>
									<Avatar name={member.employee.name} size="sm" />
									<div className="min-w-0">
										<p className="truncate text-xs font-medium">{member.employee.name}</p>
										<p className="truncate text-[11px] text-muted-foreground">{member.role}</p>
									</div>
								</Link>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
