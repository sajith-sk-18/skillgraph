"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * The message shown is ours, never `error.message` - a server error can carry
 * detail that must not reach a browser. The digest is displayed so a report
 * can be matched to a server log line.
 */
export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("[skillgraph:boundary]", error);
	}, [error]);

	return (
		<div className="page-shell flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
			<p className="text-sm font-semibold text-danger">Something went wrong</p>
			<p className="max-w-md text-xs text-muted-foreground">
				This page could not be loaded. The graph database may be briefly unavailable.
			</p>
			{error.digest ? (
				<p className="text-[10px] text-muted-foreground">Reference: {error.digest}</p>
			) : null}
			<button
				type="button"
				onClick={reset}
				className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground"
			>
				Try again
			</button>
		</div>
	);
}
