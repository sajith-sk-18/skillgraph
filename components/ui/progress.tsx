import { cn } from "@/lib/utils/cn";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "accent";

const FILL: Record<Tone, string> = {
	primary: "bg-primary",
	success: "bg-success",
	warning: "bg-warning",
	danger: "bg-danger",
	info: "bg-info",
	accent: "bg-accent",
};

export interface ProgressProps {
	value: number;
	max?: number;
	tone?: Tone;
	className?: string;
	/** Announced to assistive tech, e.g. "React proficiency 9 out of 10". */
	label: string;
}

/**
 * A meter, not a loading bar.
 *
 * `role="meter"` with the aria-value* trio means a screen reader announces
 * "9 of 10" rather than a percentage of an unknown quantity.
 */
export function Progress({ value, max = 100, tone = "primary", className, label }: ProgressProps) {
	const percent = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

	return (
		<div
			role="meter"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-label={label}
			className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
		>
			<div className={cn("h-full rounded-full transition-all", FILL[tone])} style={{ width: `${percent}%` }} />
		</div>
	);
}
