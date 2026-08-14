import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

/**
 * Initials avatar with a deterministic colour.
 *
 * The dataset has no photographs, and a generic silhouette for 84 people is
 * worse than nothing. Hashing the name means the same person is always the
 * same colour, which makes lists scannable.
 */
const PALETTE = [
	"bg-primary-soft text-primary",
	"bg-info-soft text-info",
	"bg-accent-soft text-accent",
	"bg-success-soft text-success",
	"bg-warning-soft text-warning",
];

function toneFor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	return PALETTE[hash % PALETTE.length];
}

export function Avatar({
	name,
	size = "md",
	className,
}: {
	name: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	const sizes = {
		sm: "h-8 w-8 text-[11px]",
		md: "h-10 w-10 text-xs",
		lg: "h-16 w-16 text-lg",
	} as const;

	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
				sizes[size],
				toneFor(name),
				className,
			)}
		>
			{initials(name)}
		</span>
	);
}
