import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Briefcase, Building2, MapPin, Users } from "lucide-react";

import { EmployeeNetwork } from "@/components/employees/employee-network";
import { SkillBar } from "@/components/employees/skill-bar";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { availabilityTone, formatRange, duration } from "@/lib/utils/format";
import { idSchema } from "@/lib/validations/schemas";
import { getEmployeeProfile } from "@/server/services/employee.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) return { title: "Employee" };
	const profile = await getEmployeeProfile(parsed.data).catch(() => null);
	return { title: profile?.name ?? "Employee" };
}

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
	const parsed = idSchema.safeParse(params.id);
	if (!parsed.success) notFound();

	const profile = await getEmployeeProfile(parsed.data);
	if (!profile) notFound();

	const tone = availabilityTone(profile.availability);

	return (
		<div className="page-shell">
			<PageHeader
				title={profile.name}
				crumbs={[
					{ label: "People" },
					{ label: "Employees", href: "/employees" },
					{ label: profile.name },
				]}
			/>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
						<Avatar name={profile.name} size="lg" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold">{profile.jobTitle}</p>
							<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
								<span className="flex items-center gap-1">
									<Building2 className="h-3 w-3" aria-hidden />
									{profile.department}
								</span>
								<span className="flex items-center gap-1">
									<MapPin className="h-3 w-3" aria-hidden />
									{profile.location}
								</span>
								<span className="flex items-center gap-1">
									<Briefcase className="h-3 w-3" aria-hidden />
									<span className="tabular">{profile.yearsOfExperience} years</span>
								</span>
							</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								<Badge tone={tone === "muted" ? "muted" : tone}>{profile.availability}</Badge>
								<Badge tone="primary">{profile.seniority}</Badge>
								{profile.roles.map((role) => (
									<Badge key={role.id} tone="accent">
										{role.name}
									</Badge>
								))}
								{profile.teams.map((team) => (
									<Badge key={team.id} tone="info">
										{team.name}
									</Badge>
								))}
							</div>
							<p className="mt-3 text-xs leading-relaxed text-muted-foreground">{profile.bio}</p>
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
					<Card>
						<CardHeader>
							<CardTitle>Domain experience</CardTitle>
							<p className="text-[11px] text-muted-foreground">
								Derived by walking Employee &rarr; Project &rarr; Domain. Not stored on the person.
							</p>
						</CardHeader>
						<CardContent>
							{profile.domains.length === 0 ? (
								<p className="text-xs text-muted-foreground">No delivered projects yet.</p>
							) : (
								<ul className="flex flex-wrap gap-1.5">
									{profile.domains.map((domain) => (
										<li key={domain.name}>
											<Badge tone="info" className="tabular">
												{domain.name} · {domain.projectCount}
											</Badge>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-1.5">
								<Award className="h-3.5 w-3.5" aria-hidden />
								Certifications
							</CardTitle>
						</CardHeader>
						<CardContent>
							{profile.certifications.length === 0 ? (
								<p className="text-xs text-muted-foreground">No certifications recorded.</p>
							) : (
								<ul className="space-y-2">
									{profile.certifications.map((certification) => (
										<li key={certification.id}>
											<p className="text-xs font-medium">{certification.name}</p>
											<p className="text-[11px] text-muted-foreground">
												{certification.issuer} · {certification.level}
											</p>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="mt-4 grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Skills</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							Proficiency and recency are properties of the HAS_SKILL relationship.
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						{profile.skills.length === 0 ? (
							<p className="text-xs text-muted-foreground">No skills recorded.</p>
						) : (
							profile.skills.map((entry) => (
								<SkillBar
									key={entry.skill.id}
									name={entry.skill.name}
									proficiency={entry.proficiency}
									years={entry.years}
								/>
							))
						)}
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Project history</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{profile.projects.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								Not yet assigned to a project - available to be staffed.
							</p>
						) : (
							profile.projects.map((entry) => (
								<div key={entry.project.id} className="rounded-lg border border-border p-3">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div className="min-w-0">
											<Link
												href={`/projects/${entry.project.id}`}
												className="text-xs font-semibold hover:underline"
											>
												{entry.project.name}
											</Link>
											<p className="mt-0.5 text-[11px] text-muted-foreground">
												{entry.role} · {entry.responsibility}
											</p>
										</div>
										<div className="text-right text-[11px] text-muted-foreground">
											<p>{formatRange(entry.startDate, entry.endDate)}</p>
											<p className="tabular">{duration(entry.startDate, entry.endDate)}</p>
										</div>
									</div>
									<div className="mt-2 flex flex-wrap gap-1">
										<Badge tone="info">{entry.project.domain}</Badge>
										{entry.client ? <Badge tone="warning">{entry.client.name}</Badge> : null}
										{entry.skillsUsed.slice(0, 6).map((skill) => (
											<Badge key={skill} tone="muted">
												{skill}
											</Badge>
										))}
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>

			<Card className="mt-4">
				<CardHeader>
					<CardTitle className="flex items-center gap-1.5">
						<Users className="h-3.5 w-3.5" aria-hidden />
						Co-workers
					</CardTitle>
					<p className="text-[11px] text-muted-foreground">
						WORKED_WITH is derived from shared project history - every link below is backed by a real
						engagement.
					</p>
				</CardHeader>
				<CardContent>
					{profile.collaborators.length === 0 ? (
						<EmptyState
							title="No collaboration history"
							message="This person has not yet shared a project with anyone."
							className="border-0 shadow-none"
						/>
					) : (
						<div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
							{profile.collaborators.map((collaborator) => (
								<Link
									key={collaborator.employee.id}
									href={`/employees/${collaborator.employee.id}`}
									className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40"
								>
									<Avatar name={collaborator.employee.name} size="sm" />
									<div className="min-w-0">
										<p className="truncate text-xs font-medium">{collaborator.employee.name}</p>
										<p className="truncate text-[11px] text-muted-foreground">
											{collaborator.employee.jobTitle}
										</p>
										<p className="tabular mt-1 text-[11px] text-primary">
											Worked together on {collaborator.projectsTogether} project
											{collaborator.projectsTogether === 1 ? "" : "s"}
										</p>
										<p className="truncate text-[10px] text-muted-foreground">
											{collaborator.sharedProjectNames.slice(0, 2).join(", ")}
										</p>
									</div>
								</Link>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<section className="mt-4">
				<h2 className="mb-3 text-sm font-semibold tracking-tight">Employee network</h2>
				<Suspense fallback={<Skeleton className="h-[420px]" />}>
					<EmployeeNetwork employeeId={profile.id} employeeName={profile.name} />
				</Suspense>
			</section>
		</div>
	);
}
