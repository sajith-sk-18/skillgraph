import { Suspense } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { skillFiltersSchema } from "@/lib/validations/schemas";
import { PROFICIENCY_MAX } from "@/types/domain";
import { listSkills } from "@/server/services/skill.service";

export const metadata = { title: "Skills" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default function SkillsPage({ searchParams }: { searchParams: SearchParams }) {
	return (
		<div className="page-shell">
			<PageHeader
				title="Skills"
				description="Skill and Technology are one node label - a project USED_TECHNOLOGY the same node an employee HAS_SKILL, which keeps Employee to Project a single hop."
				crumbs={[{ label: "People" }, { label: "Skills" }]}
			/>
			<Suspense key={JSON.stringify(searchParams)} fallback={<GridSkeleton />}>
				<SkillGrid searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function SkillGrid({ searchParams }: { searchParams: SearchParams }) {
	const parsed = skillFiltersSchema.safeParse(searchParams);
	if (!parsed.success) return <ErrorState message="Those filter values are not valid." />;

	try {
		const skills = await listSkills(parsed.data);
		if (skills.length === 0) {
			return (
				<EmptyState
					title="No skills found"
					message="Nothing in the catalogue matches that search."
					action={{ label: "Show all skills", href: "/skills" }}
				/>
			);
		}

		const categories = Array.from(new Set(skills.map((skill) => skill.category)));

		return (
			<>
				<nav aria-label="Skill categories" className="mb-4 flex flex-wrap gap-1.5">
					<Link
						href="/skills"
						className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium hover:bg-surface-muted"
					>
						All
					</Link>
					{categories.map((category) => (
						<Link
							key={category}
							href={`/skills?category=${encodeURIComponent(category)}`}
							className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium hover:bg-surface-muted"
						>
							{category}
						</Link>
					))}
				</nav>

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{skills.map((skill) => (
						<Card key={skill.id} className="transition-colors hover:border-primary/40">
							<CardContent className="space-y-2.5">
								<div className="flex items-start justify-between gap-2">
									<Link href={`/skills/${skill.id}`} className="text-sm font-semibold hover:underline">
										{skill.name}
									</Link>
									<Badge tone="accent">{skill.category}</Badge>
								</div>
								<p className="line-clamp-2 text-[11px] text-muted-foreground">{skill.description}</p>
								<div className="tabular grid grid-cols-3 gap-2 text-center">
									<div>
										<p className="text-sm font-semibold">{skill.employeeCount}</p>
										<p className="text-[10px] text-muted-foreground">people</p>
									</div>
									<div>
										<p className="text-sm font-semibold">{skill.projectCount}</p>
										<p className="text-[10px] text-muted-foreground">projects</p>
									</div>
									<div>
										<p className="text-sm font-semibold">{skill.averageProficiency || "-"}</p>
										<p className="text-[10px] text-muted-foreground">avg level</p>
									</div>
								</div>
								<Progress
									value={skill.averageProficiency}
									max={PROFICIENCY_MAX}
									tone="accent"
									label={`${skill.name} average proficiency ${skill.averageProficiency} of ${PROFICIENCY_MAX}`}
								/>
							</CardContent>
						</Card>
					))}
				</div>
			</>
		);
	} catch {
		return <ErrorState message="The skill catalogue could not be loaded from the graph database." />;
	}
}

function GridSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading skills" aria-busy>
			{Array.from({ length: 9 }, (_, index) => (
				<Skeleton key={index} className="h-44" />
			))}
		</div>
	);
}
