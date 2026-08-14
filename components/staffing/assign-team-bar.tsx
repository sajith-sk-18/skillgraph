"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, UserMinus, UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Commits a staffing decision to the graph.
 *
 * Assigning writes real delivery history - a WORKED_ON edge per person plus
 * the derived WORKED_WITH pairs between them - so it is deliberately explicit
 * rather than something that happens as a side effect of running the matcher.
 *
 * A sticky bar rather than a button inside the results list: the selection is
 * made by scrolling through candidates, and an action that only exists at the
 * bottom of a long list is an action nobody finds.
 */
export function AssignTeamBar({
	projectId,
	projectName,
	selectedIds,
	staffedCount,
	onClear,
	onAssigned,
}: {
	projectId: string;
	projectName: string;
	selectedIds: string[];
	staffedCount: number;
	onClear: () => void;
	onAssigned: () => void;
}) {
	const router = useRouter();
	const [busy, setBusy] = useState<"assign" | "clear" | null>(null);
	const [result, setResult] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
	const [confirmingClear, setConfirmingClear] = useState(false);

	const assign = async () => {
		setBusy("assign");
		setResult(null);
		try {
			const response = await fetch(`/api/projects/${projectId}/team`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ employeeIds: selectedIds }),
			});
			const payload = await response.json();

			if (!response.ok || payload.error) {
				setResult({ kind: "error", message: payload.error ?? "The team could not be assigned." });
				return;
			}

			setResult({
				kind: "ok",
				message: `${payload.assigned} assigned. ${projectName} now has ${payload.teamSize} people.`,
			});
			onAssigned();
			// Server Components hold the project and gap data - without this the
			// project page would still show the old team.
			router.refresh();
		} catch {
			setResult({ kind: "error", message: "The graph database could not be reached." });
		} finally {
			setBusy(null);
		}
	};

	const clearTeam = async () => {
		setBusy("clear");
		setResult(null);
		try {
			const response = await fetch(`/api/projects/${projectId}/team`, { method: "DELETE" });
			const payload = await response.json();

			if (!response.ok || payload.error) {
				setResult({ kind: "error", message: payload.error ?? "The team could not be cleared." });
				return;
			}

			setResult({
				kind: "ok",
				message: `Removed ${payload.previousTeamSize} people from ${projectName}.`,
			});
			setConfirmingClear(false);
			onAssigned();
			router.refresh();
		} catch {
			setResult({ kind: "error", message: "The graph database could not be reached." });
		} finally {
			setBusy(null);
		}
	};

	const nothingToDo = selectedIds.length === 0 && staffedCount === 0 && !result;
	if (nothingToDo) return null;

	return (
		<div className="sticky bottom-4 z-30">
			<div className="card-surface border-primary/30 bg-surface/95 p-3 shadow-lg backdrop-blur">
				{result ? (
					<div
						role="status"
						className={`mb-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
							result.kind === "ok"
								? "bg-success-soft text-success"
								: "bg-danger-soft text-danger"
						}`}
					>
						{result.kind === "ok" ? (
							<CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
						) : null}
						<span className="flex-1">{result.message}</span>
						{result.kind === "ok" ? (
							<Link href={`/projects/${projectId}`} className="shrink-0 font-medium underline">
								View project
							</Link>
						) : null}
						<button
							type="button"
							onClick={() => setResult(null)}
							aria-label="Dismiss message"
							className="shrink-0 opacity-60 hover:opacity-100"
						>
							<X className="h-3.5 w-3.5" aria-hidden />
						</button>
					</div>
				) : null}

				<div className="flex flex-wrap items-center gap-2">
					<div className="min-w-0 flex-1">
						<p className="text-xs font-medium">
							{selectedIds.length > 0
								? `${selectedIds.length} selected for ${projectName}`
								: `${projectName}`}
						</p>
						<p className="text-[11px] text-muted-foreground">
							{staffedCount > 0
								? `Currently staffed with ${staffedCount} ${staffedCount === 1 ? "person" : "people"}`
								: "Not yet staffed"}
						</p>
					</div>

					{selectedIds.length > 0 ? (
						<>
							<Button variant="ghost" size="sm" onClick={onClear} disabled={busy !== null}>
								Clear selection
							</Button>
							<Button size="sm" onClick={assign} disabled={busy !== null}>
								{busy === "assign" ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
								) : (
									<UserPlus className="h-3.5 w-3.5" aria-hidden />
								)}
								Assign {selectedIds.length} to this project
							</Button>
						</>
					) : null}

					{/*
					 * Clearing is destructive and, on the demo project, undoes the
					 * scenario the whole application exists to show - so it asks.
					 */}
					{staffedCount > 0 ? (
						confirmingClear ? (
							<div className="flex items-center gap-1.5">
								<span className="text-[11px] text-muted-foreground">Remove everyone?</span>
								<Button variant="danger" size="sm" onClick={clearTeam} disabled={busy !== null}>
									{busy === "clear" ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
									) : null}
									Yes, clear team
								</Button>
								<Button variant="ghost" size="sm" onClick={() => setConfirmingClear(false)}>
									Cancel
								</Button>
							</div>
						) : (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setConfirmingClear(true)}
								disabled={busy !== null}
							>
								<UserMinus className="h-3.5 w-3.5" aria-hidden />
								Clear team
							</Button>
						)
					) : null}

					{selectedIds.length > 0 ? (
						<Badge tone="muted" className="hidden sm:inline-flex">
							Writes WORKED_ON + WORKED_WITH
						</Badge>
					) : null}
				</div>
			</div>
		</div>
	);
}
