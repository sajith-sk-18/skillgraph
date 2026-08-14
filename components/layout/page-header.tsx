import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface Crumb {
	label: string;
	href?: string;
}

/** Page title, breadcrumbs and optional actions - identical on every route. */
export function PageHeader({
	title,
	description,
	crumbs = [],
	actions,
}: {
	title: string;
	description?: string;
	crumbs?: Crumb[];
	actions?: ReactNode;
}) {
	return (
		<div className="mb-6">
			{crumbs.length > 0 ? (
				<nav aria-label="Breadcrumb" className="mb-2">
					<ol className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
						{crumbs.map((crumb, index) => (
							<li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
								{index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
								{crumb.href ? (
									<Link href={crumb.href} className="hover:text-foreground hover:underline">
										{crumb.label}
									</Link>
								) : (
									<span aria-current="page" className="text-foreground">
										{crumb.label}
									</span>
								)}
							</li>
						))}
					</ol>
				</nav>
			) : null}

			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
					{description ? (
						<p className="mt-1 max-w-3xl text-xs text-muted-foreground">{description}</p>
					) : null}
				</div>
				{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
			</div>
		</div>
	);
}
