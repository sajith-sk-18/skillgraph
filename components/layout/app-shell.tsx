"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { GlobalSearch } from "@/components/layout/global-search";
import { SidebarNav } from "@/components/layout/sidebar";

/**
 * The application frame.
 *
 * Client only because the sidebar collapses on mobile; the page content it
 * wraps stays a Server Component, so no page data passes through here.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="flex min-h-screen">
			<aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
				<div className="sticky top-0 h-screen">
					<SidebarNav />
				</div>
			</aside>

			{open ? (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						type="button"
						aria-label="Close navigation"
						onClick={() => setOpen(false)}
						className="absolute inset-0 bg-foreground/20"
					/>
					<div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface">
						<SidebarNav onNavigate={() => setOpen(false)} />
					</div>
				</div>
			) : null}

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
					<div className="flex items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
						<button
							type="button"
							onClick={() => setOpen((value) => !value)}
							aria-label={open ? "Close navigation" : "Open navigation"}
							aria-expanded={open}
							className="rounded-lg p-2 hover:bg-surface-muted lg:hidden"
						>
							{open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
						</button>
						<GlobalSearch />
						<div className="ml-auto flex items-center gap-2">
							<span className="hidden text-right sm:block">
								<span className="block text-[11px] font-medium leading-tight">Resourcing Team</span>
								<span className="block text-[10px] text-muted-foreground">Demo workspace</span>
							</span>
							<span
								aria-hidden
								className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent"
							>
								RT
							</span>
						</div>
					</div>
				</header>

				<main id="main" className="flex-1">
					{children}
				</main>
			</div>
		</div>
	);
}
