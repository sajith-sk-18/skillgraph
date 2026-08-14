import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { availabilityTone } from "@/lib/utils/format";
import type { EmployeeSummary } from "@/types/domain";

/** Reusable across the directory, search results and staffing shortlists. */
export function EmployeeCard({
	employee,
	matchScore,
}: {
	employee: EmployeeSummary;
	matchScore?: number;
}) {
	const tone = availabilityTone(employee.availability);

	return (
		<Card className="group p-4 transition-colors hover:border-primary/40">
			<div className="flex items-start gap-3">
				<Avatar name={employee.name} />
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<Link
								href={`/employees/${employee.id}`}
								className="block truncate text-sm font-semibold hover:underline"
							>
								{employee.name}
							</Link>
							<p className="truncate text-[11px] text-muted-foreground">{employee.jobTitle}</p>
						</div>
						{matchScore !== undefined ? (
							<Badge tone="success" className="tabular shrink-0">
								{matchScore}%
							</Badge>
						) : null}
					</div>

					<div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
						<span>{employee.department}</span>
						<span aria-hidden>·</span>
						<span>{employee.location}</span>
						<span aria-hidden>·</span>
						<span className="tabular">{employee.yearsOfExperience} yrs</span>
					</div>

					<div className="mt-2 flex flex-wrap gap-1">
						<Badge tone={tone === "muted" ? "muted" : tone}>{employee.availability}</Badge>
						<Badge tone="muted">{employee.seniority}</Badge>
						{employee.projectCount > 0 ? (
							<Badge tone="muted">
								{employee.projectCount} project{employee.projectCount === 1 ? "" : "s"}
							</Badge>
						) : null}
					</div>

					{employee.topSkills.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-1">
							{employee.topSkills.slice(0, 3).map((skill) => (
								<Badge key={skill.name} tone="primary" className="tabular">
									{skill.name} {skill.proficiency}
								</Badge>
							))}
						</div>
					) : null}
				</div>
			</div>
		</Card>
	);
}
