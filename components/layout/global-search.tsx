"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { NodeLabel, SearchHit, SearchResults } from "@/types/graph";

const HREF: Record<NodeLabel, (id: string) => string> = {
	Employee: (id) => `/employees/${id}`,
	Project: (id) => `/projects/${id}`,
	Skill: (id) => `/skills/${id}`,
	Client: (id) => `/graph-explorer?node=${id}`,
	Team: (id) => `/graph-explorer?node=${id}`,
	Role: (id) => `/graph-explorer?node=${id}`,
	Certification: (id) => `/graph-explorer?node=${id}`,
	Domain: (id) => `/graph-explorer?node=${id}`,
};

const GROUPS: { key: keyof Omit<SearchResults, "total">; label: string }[] = [
	{ key: "employees", label: "Employees" },
	{ key: "projects", label: "Projects" },
	{ key: "skills", label: "Skills" },
	{ key: "clients", label: "Clients" },
	{ key: "teams", label: "Teams" },
];

/**
 * Global search across every entity.
 *
 * Queries the backend rather than filtering a preloaded list - the whole point
 * is that the search reaches the graph, and shipping 84 employees plus 20
 * projects to the browser to filter locally would be exactly the anti-pattern
 * the brief warns against.
 */
export function GlobalSearch() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResults | null>(null);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const trimmed = query.trim();
		if (trimmed.length < 2) {
			setResults(null);
			return;
		}

		// Debounced, and aborted on the next keystroke so a slow response can
		// never overwrite the results of a newer query.
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setLoading(true);
			try {
				const response = await fetch(`/api/graph/search?q=${encodeURIComponent(trimmed)}`, {
					signal: controller.signal,
				});
				setResults(response.ok ? await response.json() : null);
			} catch {
				// An aborted request is the expected path, not a failure.
			} finally {
				setLoading(false);
			}
		}, 250);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query]);

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, []);

	const hasResults = results && results.total > 0;

	return (
		<div ref={containerRef} className="relative w-full max-w-md">
			<label htmlFor="global-search" className="sr-only">
				Search employees, projects, skills, clients and teams
			</label>
			<div className="relative">
				<Search
					className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<input
					id="global-search"
					type="search"
					role="combobox"
					aria-expanded={open && Boolean(results)}
					aria-controls="global-search-results"
					autoComplete="off"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					placeholder="Search people, projects, skills..."
					className="h-9 w-full rounded-lg border border-input bg-surface pl-8 pr-8 text-xs placeholder:text-muted-foreground"
				/>
				{loading ? (
					<Loader2
						className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
						aria-hidden
					/>
				) : null}
			</div>

			{open && query.trim().length >= 2 ? (
				<div
					id="global-search-results"
					role="listbox"
					aria-label="Search results"
					className="absolute left-0 right-0 top-11 z-50 max-h-[26rem] overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
				>
					{!results && loading ? (
						<p className="px-3 py-6 text-center text-xs text-muted-foreground">Searching...</p>
					) : !hasResults ? (
						<p className="px-3 py-6 text-center text-xs text-muted-foreground">
							Nothing matched &ldquo;{query.trim()}&rdquo;.
						</p>
					) : (
						GROUPS.map(({ key, label }) => {
							const hits = results[key] as SearchHit[];
							if (hits.length === 0) return null;
							return (
								<div key={key} className="mb-1 last:mb-0">
									<p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
										{label}
									</p>
									{hits.map((hit) => (
										<Link
											key={`${hit.label}-${hit.id}`}
											href={HREF[hit.label](hit.id)}
											role="option"
											aria-selected={false}
											onClick={() => {
												setOpen(false);
												setQuery("");
											}}
											className={cn(
												"flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-muted",
											)}
										>
											<span className="truncate font-medium">{hit.name}</span>
											{hit.detail ? (
												<Badge tone="muted" className="shrink-0">
													{hit.detail}
												</Badge>
											) : null}
										</Link>
									))}
								</div>
							);
						})
					)}
				</div>
			) : null}
		</div>
	);
}
