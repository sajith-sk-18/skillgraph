import Link from "next/link";
import { notFound } from "next/navigation";

import { SkillBar } from "@/components/employees/skill-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { idSchema } from "@/lib/validations/schemas";
import { getSkillDetail } from "@/server/services/skill.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) return { title: "Skill" };
	const skill = await getSkillDetail(parsed.data).catch(() => null);
	return { title: skill?.name ?? "Skill" };
}

export default async function SkillDetailPage({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) notFound();

	const skill = await getSkillDetail(parsed.data);
	if (!skill) notFound();

	return (
		<div className="page-shell">
			<PageHeader
				title={skill.name}
				description={skill.description}
				crumbs={[{ label: "People" }, { label: "Skills", href: "/skills" }, { label: skill.name }]}
				actions={<Badge tone="accent">{skill.category}</Badge>}
			/>

			<div className="grid gap-3 sm:grid-cols-3">
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">People with this skill</p>
					<p className="tabular mt-1 text-2xl font-semibold">{skill.employeeCount}</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Projects using it</p>
					<p className="tabular mt-1 text-2xl font-semibold">{skill.projectCount}</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Average proficiency</p>
					<p className="tabular mt-1 text-2xl font-semibold">{skill.averageProficiency}/10</p>
				</Card>
			</div>

			<div className="mt-4 grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Strongest people</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{skill.topEmployees.length === 0 ? (
							<p className="text-xs text-muted-foreground">Nobody has recorded this skill yet.</p>
						) : (
							skill.topEmployees.map((entry) => (
								<div key={entry.employee.id} className="flex items-center gap-3">
									<Avatar name={entry.employee.name} size="sm" />
									<div className="min-w-0 flex-1">
										<Link
											href={`/employees/${entry.employee.id}`}
											className="text-xs font-medium hover:underline"
										>
											{entry.employee.name}
										</Link>
										<p className="truncate text-[11px] text-muted-foreground">
											{entry.employee.jobTitle} · {entry.years} yrs with this skill
										</p>
									</div>
									<div className="w-28 shrink-0">
										<SkillBar name={skill.name} proficiency={entry.proficiency} />
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Often paired with</CardTitle>
							<p className="text-[11px] text-muted-foreground">
								Skill &larr; Employee &rarr; Skill, computed live.
							</p>
						</CardHeader>
						<CardContent>
							<ul className="flex flex-wrap gap-1.5">
								{skill.relatedSkills.map((related) => (
									<li key={related.name}>
										<Badge tone="primary" className="tabular">
											{related.name} · {related.coOccurrences}
										</Badge>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Projects</CardTitle>
						</CardHeader>
						<CardContent>
							{skill.projects.length === 0 ? (
								<p className="text-xs text-muted-foreground">No project has used this yet.</p>
							) : (
								<ul className="space-y-1.5">
									{skill.projects.map((project) => (
										<li key={project.id}>
											<Link href={`/projects/${project.id}`} className="text-xs hover:underline">
												{project.name}
											</Link>
											<span className="ml-1.5 text-[10px] text-muted-foreground">
												{project.domain}
											</span>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
