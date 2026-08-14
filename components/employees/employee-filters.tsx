"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import type { EmployeeFilterOptions } from "@/server/repositories/employee.repository";

/**
 * Filters that drive the URL, not local state.
 *
 * Every change rewrites the query string and lets the Server Component re-run
 * its Cypher. The filtering therefore happens in CognoDB - the browser never
 * receives the full employee list to filter locally, which is what the brief
 * explicitly rules out. It also makes any filtered view shareable as a link.
 */
export function EmployeeFilters({ options }: { options: EmployeeFilterOptions }) {
	const router = useRouter();
	const params = useSearchParams();
	const [pending, startTransition] = useTransition();

	const [search, setSearch] = useState(params.get("search") ?? "");

	const apply = (updates: Record<string, string>) => {
		const next = new URLSearchParams(params.toString());
		for (const [key, value] of Object.entries(updates)) {
			if (value) next.set(key, value);
			else next.delete(key);
		}
		// A new filter means a new result set, so paging starts again.
		next.delete("offset");
		startTransition(() => router.push(`/employees?${next.toString()}`, { scroll: false }));
	};

	// Debounced so a five-letter name is one query rather than five.
	useEffect(() => {
		const current = params.get("search") ?? "";
		if (search === current) return;
		const timer = setTimeout(() => apply({ search }), 350);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	const value = (key: string) => params.get(key) ?? "";
	const activeCount = ["department", "seniority", "availability", "location", "skill", "role", "minExperience"]
		.filter((key) => params.get(key))
		.length;

	return (
		<div className="card-surface mb-4 p-3">
			<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
				<div className="relative sm:col-span-2">
					<label htmlFor="employee-search" className="sr-only">
						Search employees by name
					</label>
					<Input
						id="employee-search"
						type="search"
						placeholder="Search by name..."
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
					{pending ? (
						<Loader2
							className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
							aria-hidden
						/>
					) : null}
				</div>

				<FilterSelect id="department" label="Department" value={value("department")} options={options.departments} onChange={(v) => apply({ department: v })} />
				<FilterSelect id="skill" label="Skill" value={value("skill")} options={options.skills} onChange={(v) => apply({ skill: v })} />
				<FilterSelect id="role" label="Role" value={value("role")} options={options.roles} onChange={(v) => apply({ role: v })} />
				<FilterSelect id="seniority" label="Seniority" value={value("seniority")} options={["Junior", "Mid", "Senior", "Lead", "Principal"]} onChange={(v) => apply({ seniority: v })} />
				<FilterSelect id="availability" label="Availability" value={value("availability")} options={["Available", "Partially Available", "Allocated"]} onChange={(v) => apply({ availability: v })} />
				<FilterSelect id="location" label="Location" value={value("location")} options={options.locations} onChange={(v) => apply({ location: v })} />

				<div>
					<label htmlFor="minExperience" className="sr-only">
						Minimum years of experience
					</label>
					<Select
						id="minExperience"
						value={value("minExperience")}
						onChange={(event) => apply({ minExperience: event.target.value })}
					>
						<option value="">Any experience</option>
						{[2, 4, 6, 8, 10, 12].map((years) => (
							<option key={years} value={years}>
								{years}+ years
							</option>
						))}
					</Select>
				</div>
			</div>

			<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<label htmlFor="sort" className="text-[11px] text-muted-foreground">
						Sort
					</label>
					<Select
						id="sort"
						className="h-8 w-auto"
						value={value("sort") || "name"}
						onChange={(event) => apply({ sort: event.target.value })}
					>
						<option value="name">Name</option>
						<option value="experience">Experience</option>
						<option value="seniority">Seniority</option>
					</Select>
				</div>

				{activeCount > 0 || search ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setSearch("");
							startTransition(() => router.push("/employees", { scroll: false }));
						}}
					>
						<X className="h-3 w-3" aria-hidden />
						Clear {activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? "" : "s"}` : "search"}
					</Button>
				) : null}
			</div>
		</div>
	);
}

function FilterSelect({
	id,
	label,
	value,
	options,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	options: readonly string[];
	onChange: (value: string) => void;
}) {
	return (
		<div>
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			<Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
				<option value="">All {label.toLowerCase()}s</option>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</Select>
		</div>
	);
}
