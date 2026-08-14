import { cn } from "@/lib/utils/cn";

/**
 * Shimmering placeholder.
 *
 * `aria-hidden` because a skeleton is decoration - a screen reader should hear
 * the loading status once, from the region label, not once per grey box.
 */
export function Skeleton({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn("relative overflow-hidden rounded-md bg-surface-muted", className)}
		>
			<div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-border/60 to-transparent" />
		</div>
	);
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
	return (
		<div className={cn("space-y-2", className)}>
			{Array.from({ length: lines }, (_, index) => (
				<Skeleton key={index} className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")} />
			))}
		</div>
	);
}
