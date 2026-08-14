import Link from "next/link";

export default function NotFound() {
	return (
		<div className="page-shell flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
			<p className="text-4xl font-semibold tracking-tight">404</p>
			<p className="text-sm text-muted-foreground">That page does not exist.</p>
			<Link
				href="/dashboard"
				className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground"
			>
				Back to dashboard
			</Link>
		</div>
	);
}
