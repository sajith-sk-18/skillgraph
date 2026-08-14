import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { availabilityTone, scoreTone } from "@/lib/utils/format";
import type { CandidateMatch } from "@/types/domain";

/**
 * A candidate, with the evidence that produced the score.
 *
 * The five components are always visible. A resourcing manager overriding the
 * ranking needs to see WHY someone placed where they did - "94% match" with no
 * breakdown is a number to be argued with, not acted on.
 */
export function CandidateCard({ candidate, rank }: { candidate: CandidateMatch; rank: number }) {
	const { employee, breakdown, evidence } = candidate;
	const tone = scoreTone(candidate.score);
	const availability = availabilityTone(employee.availability);

	const components = [
		{ label: "Skill match", value: breakdown.skillMatch, max: 40 },
		{ label: "Project experience", value: breakdown.projectExperience, max: 25 },
		{ label: "Years of experience", value: breakdown.yearsOfExperience, max: 15 },
		{ label: "Domain experience", value: breakdown.domainExperience, max: 10 },
		{ label: "Collaboration fit", value: breakdown.collaborationFit, max: 10 },
	];

	return (
		<Card className="transition-colors hover:border-primary/40">
			<CardContent className="space-y-3">
				<div className="flex items-start gap-3">
					<span
						aria-hidden
						className="tabular mt-0.5 w-5 shrink-0 text-xs font-semibold text-muted-foreground"
					>
						{rank}
					</span>
					<Avatar name={employee.name} />
					<div className="min-w-0 flex-1">
						<Link
							href={`/employees/${employee.id}`}
							className="block truncate text-sm font-semibold hover:underline"
						>
							{employee.name}
						</Link>
						<p className="truncate text-[11px] text-muted-foreground">
							{employee.jobTitle} · {employee.yearsOfExperience} yrs
						</p>
					</div>
					<div className="shrink-0 text-right">
						<p className={`tabular text-xl font-semibold ${tone === "success" ? "text-success" : tone === "info" ? "text-info" : tone === "warning" ? "text-warning" : "text-muted-foreground"}`}>
							{candidate.score}%
						</p>
						<p className="text-[10px] text-muted-foreground">match</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-1">
					<Badge tone={availability === "muted" ? "muted" : availability}>{employee.availability}</Badge>
					<Badge tone="muted">{employee.department}</Badge>
					<Badge tone="muted">{employee.location}</Badge>
				</div>

				<div>
					<p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Why this person</p>
					<ul className="space-y-1.5">
						{components.map((component) => (
							<li key={component.label} className="flex items-center gap-2">
								<span className="w-32 shrink-0 text-[11px] text-muted-foreground">{component.label}</span>
								<Progress
									className="flex-1"
									value={component.value}
									max={component.max}
									tone={component.value / component.max >= 0.75 ? "success" : component.value / component.max >= 0.4 ? "info" : "warning"}
									label={`${component.label} ${component.value} out of ${component.max}`}
								/>
								<span className="tabular w-12 shrink-0 text-right text-[11px] font-medium">
									{component.value}/{component.max}
								</span>
							</li>
						))}
					</ul>
				</div>

				<div className="space-y-1.5 border-t border-border pt-2.5">
					<div className="flex flex-wrap gap-1">
						{evidence.matchedSkills.map((skill) => (
							<Badge
								key={skill.name}
								tone={skill.meets ? "success" : "warning"}
								className="tabular"
								title={`Holds ${skill.proficiency}, project needs ${skill.required}`}
							>
								{skill.name} {skill.proficiency}/{skill.required}
							</Badge>
						))}
						{evidence.missingSkills.map((skill) => (
							<Badge key={skill} tone="danger" title="Does not hold this skill at all">
								{skill} missing
							</Badge>
						))}
					</div>

					<p className="text-[11px] text-muted-foreground">
						{evidence.relevantProjects.length} relevant project
						{evidence.relevantProjects.length === 1 ? "" : "s"}
						{evidence.domainProjectCount > 0
							? ` · ${evidence.domainProjectCount} in this domain`
							: " · no experience in this domain"}
						{evidence.collaboratorsInPool.length > 0
							? ` · has worked with ${evidence.collaboratorsInPool.length} shortlisted ${evidence.collaboratorsInPool.length === 1 ? "person" : "people"}`
							: ""}
					</p>

					{evidence.relevantProjects.length > 0 ? (
						<p className="truncate text-[11px] text-muted-foreground">
							{evidence.relevantProjects.map((project) => project.name).join(" · ")}
						</p>
					) : null}
				</div>

				<div className="flex gap-2">
					<Link
						href={`/employees/${employee.id}`}
						className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-medium hover:bg-surface-muted"
					>
						View profile
					</Link>
					<Link
						href={`/graph-explorer?node=${employee.id}`}
						className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-medium hover:bg-surface-muted"
					>
						View graph
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
