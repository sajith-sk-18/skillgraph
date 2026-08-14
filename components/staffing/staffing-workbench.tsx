"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Users } from "lucide-react";

import { CandidateCard } from "@/components/staffing/candidate-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import type { CandidateMatch, SkillRequirement, TeamRecommendation } from "@/types/domain";

interface ProjectOption {
	id: string;
	name: string;
	domain: string;
	status: string;
	teamSize: number;
}

interface MatchResponse {
	projectName: string | null;
	domain: string;
	requirements: SkillRequirement[];
	candidates: CandidateMatch[];
	poolSize: number;
	error?: string;
}

type Mode = "candidates" | "team";

/**
 * The staffing workbench.
 *
 * Client-side because it is a tool, not a document - the user changes inputs
 * and re-runs a computation. Both modes POST to the API, so the ranking is
 * always produced server-side from a fresh traversal; nothing is scored in the
 * browser.
 */
export function StaffingWorkbench({
	projects,
	initialProjectId,
}: {
	projects: ProjectOption[];
	initialProjectId?: string;
}) {
	const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? "");
	const [teamSize, setTeamSize] = useState(5);
	const [onlyAvailable, setOnlyAvailable] = useState(false);
	const [mode, setMode] = useState<Mode>("candidates");

	const [match, setMatch] = useState<MatchResponse | null>(null);
	const [team, setTeam] = useState<TeamRecommendation | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasRun, setHasRun] = useState(false);

	const selected = projects.find((project) => project.id === projectId);

	useEffect(() => {
		if (selected) setTeamSize(selected.teamSize);
	}, [selected]);

	const run = useCallback(
		async (nextMode: Mode) => {
			if (!projectId) return;
			setLoading(true);
			setError(null);
			setMode(nextMode);
			setHasRun(true);

			try {
				const endpoint =
					nextMode === "team" ? "/api/staffing/recommend-team" : "/api/staffing/match";
				const response = await fetch(endpoint, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ projectId, teamSize, onlyAvailable, limit: 12 }),
				});

				const payload = await response.json();

				if (!response.ok || payload.error) {
					setError(payload.error ?? "The staffing engine could not complete that request.");
					return;
				}

				if (nextMode === "team") setTeam(payload as TeamRecommendation);
				else setMatch(payload as MatchResponse);
			} catch {
				setError("The staffing engine could not be reached. The graph database may be unavailable.");
			} finally {
				setLoading(false);
			}
		},
		[projectId, teamSize, onlyAvailable],
	);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Find the best team</CardTitle>
					<p className="text-xs text-muted-foreground">
						Match people to a project using skills, delivery history, domain experience and
						collaboration relationships - all traversed from CognoDB at request time.
					</p>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<div className="sm:col-span-2">
							<label htmlFor="project" className="mb-1 block text-[11px] font-medium text-muted-foreground">
								Project
							</label>
							<Select
								id="project"
								value={projectId}
								onChange={(event) => {
									setProjectId(event.target.value);
									setHasRun(false);
									setMatch(null);
									setTeam(null);
								}}
							>
								{projects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.name} ({project.domain}
										{project.status === "Planned" ? " · not yet staffed" : ""})
									</option>
								))}
							</Select>
						</div>

						<div>
							<label htmlFor="team-size" className="mb-1 block text-[11px] font-medium text-muted-foreground">
								Team size
							</label>
							<Select
								id="team-size"
								value={teamSize}
								onChange={(event) => setTeamSize(Number(event.target.value))}
							>
								{[3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
									<option key={size} value={size}>
										{size} people
									</option>
								))}
							</Select>
						</div>

						<div className="flex items-end">
							<label className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-input bg-surface px-3 text-xs">
								<input
									type="checkbox"
									checked={onlyAvailable}
									onChange={(event) => setOnlyAvailable(event.target.checked)}
									className="h-3.5 w-3.5 rounded border-border"
								/>
								Available people only
							</label>
						</div>
					</div>

					{selected ? (
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge tone="info">{selected.domain}</Badge>
							<Badge tone={selected.status === "Planned" ? "primary" : "muted"}>{selected.status}</Badge>
							<Link href={`/projects/${selected.id}`} className="text-[11px] text-primary hover:underline">
								View project
							</Link>
						</div>
					) : null}

					<div className="flex flex-wrap gap-2">
						<Button onClick={() => run("candidates")} disabled={loading || !projectId}>
							{loading && mode === "candidates" ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
							) : (
								<Sparkles className="h-3.5 w-3.5" aria-hidden />
							)}
							Find best candidates
						</Button>
						<Button variant="secondary" onClick={() => run("team")} disabled={loading || !projectId}>
							{loading && mode === "team" ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
							) : (
								<Users className="h-3.5 w-3.5" aria-hidden />
							)}
							Build recommended team
						</Button>
					</div>
				</CardContent>
			</Card>

			{error ? <ErrorState message={error} /> : null}

			{loading ? (
				<div className="grid gap-3 lg:grid-cols-2" aria-busy aria-label="Scoring candidates">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-80" />
					))}
				</div>
			) : null}

			{!loading && !error && !hasRun ? (
				<EmptyState
					title="Ready when you are"
					message="Pick a project and run the matcher. The engine walks Project to Skill to Employee, then out through delivery history and collaboration."
				/>
			) : null}

			{!loading && !error && hasRun && mode === "candidates" && match ? (
				<CandidateResults match={match} />
			) : null}

			{!loading && !error && hasRun && mode === "team" && team ? <TeamResults team={team} /> : null}
		</div>
	);
}

function CandidateResults({ match }: { match: MatchResponse }) {
	if (match.candidates.length === 0) {
		return (
			<EmptyState
				title="No matching candidates"
				message="Nobody in the organisation holds any of the required skills. Try relaxing the availability filter."
			/>
		);
	}

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					<span className="tabular font-medium text-foreground">{match.poolSize}</span> people hold at
					least one required skill. Showing the top{" "}
					<span className="tabular font-medium text-foreground">{match.candidates.length}</span>.
				</p>
				<div className="flex flex-wrap gap-1">
					{match.requirements.map((requirement) => (
						<Badge key={requirement.skillId} tone="primary" className="tabular">
							{requirement.skillName} {requirement.requiredProficiency}+
						</Badge>
					))}
				</div>
			</div>

			<div className="grid gap-3 lg:grid-cols-2">
				{match.candidates.map((candidate, index) => (
					<CandidateCard key={candidate.employee.id} candidate={candidate} rank={index + 1} />
				))}
			</div>
		</>
	);
}

function TeamResults({ team }: { team: TeamRecommendation }) {
	const strengthTone = { Strong: "success", Moderate: "info", None: "muted" } as const;

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-3">
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Team skill coverage</p>
					<p className="tabular mt-1 text-2xl font-semibold">{team.skillCoveragePercent}%</p>
					<Progress
						className="mt-2"
						value={team.skillCoveragePercent}
						tone={team.skillCoveragePercent === 100 ? "success" : "warning"}
						label={`Team covers ${team.skillCoveragePercent}% of required skills`}
					/>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">{team.domain} experience</p>
					<p className="tabular mt-1 text-2xl font-semibold">
						{team.domainExperienceCount}/{team.members.length}
					</p>
					<p className="text-[11px] text-muted-foreground">have delivered in this domain</p>
				</Card>
				<Card className="p-4">
					<p className="text-[11px] text-muted-foreground">Existing collaboration</p>
					<p className="tabular mt-1 text-2xl font-semibold">
						{team.collaborationPairs.filter((pair) => pair.projectsTogether > 0).length}/
						{team.collaborationPairs.length}
					</p>
					<p className="text-[11px] text-muted-foreground">pairs have shipped together</p>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recommended team</CardTitle>
					<p className="text-[11px] text-muted-foreground">
						Chosen to COVER the requirement, not simply the highest scores - each pick after the first
						adds the most uncovered skill.
					</p>
				</CardHeader>
				<CardContent>
					<ol className="space-y-2.5">
						{team.members.map((member, index) => (
							<li key={member.employee.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
								<span aria-hidden className="tabular mt-1 w-4 text-xs font-semibold text-muted-foreground">
									{index + 1}
								</span>
								<Avatar name={member.employee.name} size="sm" />
								<div className="min-w-0 flex-1">
									<Link href={`/employees/${member.employee.id}`} className="text-xs font-semibold hover:underline">
										{member.employee.name}
									</Link>
									<p className="truncate text-[11px] text-muted-foreground">{member.employee.jobTitle}</p>
									<div className="mt-1.5 flex flex-wrap gap-1">
										<Badge tone="accent">{member.primarySkill}</Badge>
										{member.coversSkills.length > 0 ? (
											member.coversSkills.map((skill) => (
												<Badge key={skill} tone="success">
													covers {skill}
												</Badge>
											))
										) : (
											<Badge tone="muted">depth on covered skills</Badge>
										)}
									</div>
								</div>
								<span className="tabular shrink-0 text-sm font-semibold">{member.score}%</span>
							</li>
						))}
					</ol>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Skill coverage</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{team.coverage.map((row) => (
								<li key={row.skill} className="flex items-center justify-between gap-2 text-xs">
									<span className="truncate">{row.skill}</span>
									<div className="flex items-center gap-2">
										<Badge tone={row.covered > 0 ? "success" : "danger"} className="tabular">
											{row.covered} of {row.total} meet {row.requiredProficiency}+
										</Badge>
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Team compatibility</CardTitle>
						<p className="text-[11px] text-muted-foreground">
							Every pair, from the WORKED_WITH relationship derived from shared projects.
						</p>
					</CardHeader>
					<CardContent>
						<ul className="space-y-1.5">
							{team.collaborationPairs.map((pair) => (
								<li key={`${pair.a}-${pair.b}`} className="flex items-center justify-between gap-2 text-xs">
									<span className="truncate">
										{pair.a} <span className="text-muted-foreground">&harr;</span> {pair.b}
									</span>
									<Badge tone={strengthTone[pair.strength]} className="tabular shrink-0">
										{pair.projectsTogether > 0
											? `${pair.projectsTogether} project${pair.projectsTogether === 1 ? "" : "s"}`
											: "never"}
									</Badge>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
