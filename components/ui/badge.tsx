import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "info" | "accent" | "muted";

const TONES: Record<Tone, string> = {
	default: "bg-surface-muted text-foreground border-border",
	primary: "bg-primary-soft text-primary border-primary/20",
	success: "bg-success-soft text-success border-success/20",
	warning: "bg-warning-soft text-warning border-warning/20",
	danger: "bg-danger-soft text-danger border-danger/20",
	info: "bg-info-soft text-info border-info/20",
	accent: "bg-accent-soft text-accent border-accent/20",
	muted: "bg-surface-muted text-muted-foreground border-border",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	tone?: Tone;
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5",
				TONES[tone],
				className,
			)}
			{...props}
		/>
	);
}
