import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Empty and error states.
 *
 * Both always offer a way forward. "No employees found" with no way to clear
 * the filter that caused it is a dead end, not a message.
 */

export function EmptyState({
	title,
	message,
	action,
	className,
}: {
	title: string;
	message: string;
	action?: { label: string; href: string };
	className?: string;
}) {
	return (
		<div className={cn("card-surface flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
			<p className="text-sm font-semibold">{title}</p>
			<p className="max-w-md text-xs text-muted-foreground">{message}</p>
			{/* A styled Link, not a Button wrapping one - a <button> containing
			    an <a> is invalid markup and breaks keyboard activation. */}
			{action ? (
				<Link
					href={action.href}
					className="mt-1 inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-muted"
				>
					{action.label}
				</Link>
			) : null}
		</div>
	);
}

export function ErrorState({
	message,
	className,
}: {
	message: string;
	className?: string;
}) {
	return (
		<div
			role="alert"
			className={cn(
				"card-surface flex flex-col items-center gap-2 border-danger/30 bg-danger-soft/40 px-6 py-10 text-center",
				className,
			)}
		>
			<p className="text-sm font-semibold text-danger">Could not load this section</p>
			<p className="max-w-md text-xs text-muted-foreground">{message}</p>
		</div>
	);
}

export function SectionHeading({
	title,
	description,
	action,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="mb-3 flex flex-wrap items-end justify-between gap-2">
			<div>
				<h2 className="text-sm font-semibold tracking-tight">{title}</h2>
				{description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
			</div>
			{action}
		</div>
	);
}
