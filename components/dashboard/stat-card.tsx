import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

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

/**
 * A headline figure, optionally linking to the page it summarises.
 *
 * When `href` is given the whole card becomes one link rather than a card
 * containing a link - a single tab stop and a single hit target, which is what
 * a card that behaves like a button should be.
 */
export function StatCard({
	label,
	value,
	hint,
	icon: Icon,
	tone = "primary",
	href,
}: {
	label: string;
	value: number | string;
	hint?: string;
	icon: LucideIcon;
	tone?: Tone;
	href?: string;
}) {
	const body = (
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
				<p className="tabular mt-1 text-2xl font-semibold tracking-tight">
					{typeof value === "number" ? value.toLocaleString("en-GB") : value}
				</p>
				{hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
			</div>
			<span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
				<Icon className="h-4 w-4" aria-hidden />
				{href ? (
					<ArrowUpRight
						className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-surface text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
						aria-hidden
					/>
				) : null}
			</span>
		</div>
	);

	if (!href) return <Card className="p-4">{body}</Card>;

	return (
		<Link href={href} className="group block rounded-xl">
			<Card className="h-full p-4 transition-colors hover:border-primary/50 hover:bg-surface-muted/40">
				{body}
			</Card>
		</Link>
	);
}
