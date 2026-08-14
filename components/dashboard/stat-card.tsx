import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type Tone = "primary" | "success" | "info" | "accent" | "warning";

const TONES: Record<Tone, string> = {
	primary: "bg-primary-soft text-primary",
	success: "bg-success-soft text-success",
	info: "bg-info-soft text-info",
	accent: "bg-accent-soft text-accent",
	warning: "bg-warning-soft text-warning",
};

export function StatCard({
	label,
	value,
	hint,
	icon: Icon,
	tone = "primary",
}: {
	label: string;
	value: number | string;
	hint?: string;
	icon: LucideIcon;
	tone?: Tone;
}) {
	return (
		<Card className="p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
					<p className="tabular mt-1 text-2xl font-semibold tracking-tight">
						{typeof value === "number" ? value.toLocaleString("en-GB") : value}
					</p>
					{hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
				</div>
				<span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
					<Icon className="h-4 w-4" aria-hidden />
				</span>
			</div>
		</Card>
	);
}
