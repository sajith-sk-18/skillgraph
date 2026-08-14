"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network } from "lucide-react";

import { NAV_GROUPS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils/cn";

/**
 * Client Component because it highlights the active route from usePathname.
 * Deliberately the only part of the chrome that ships JavaScript.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();

	return (
		<nav aria-label="Main" className="flex h-full flex-col gap-6 p-4">
			<Link
				href="/dashboard"
				onClick={onNavigate}
				className="flex items-center gap-2.5 rounded-lg px-2 py-1"
			>
				<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<Network className="h-4 w-4" aria-hidden />
				</span>
				<span>
					<span className="block text-sm font-semibold leading-tight">SkillGraph</span>
					<span className="block text-[10px] text-muted-foreground">Project intelligence</span>
				</span>
			</Link>

			<div className="flex flex-1 flex-col gap-5 overflow-y-auto">
				{NAV_GROUPS.map((group) => (
					<div key={group.label}>
						<p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{group.label}
						</p>
						<ul className="space-y-0.5">
							{group.items.map((item) => {
								const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
								const Icon = item.icon;
								return (
									<li key={item.href}>
										<Link
											href={item.href}
											onClick={onNavigate}
											aria-current={active ? "page" : undefined}
											className={cn(
												"flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
												active
													? "bg-primary-soft text-primary"
													: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
											)}
										>
											<Icon className="h-4 w-4 shrink-0" aria-hidden />
											{item.label}
										</Link>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>

			<p className="rounded-lg bg-surface-muted px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
				All employee, client and project records are fictional demo data.
			</p>
		</nav>
	);
}
