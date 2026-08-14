import { Suspense } from "react";
import Link from "next/link";

import { EmployeeCard } from "@/components/employees/employee-card";
import { EmployeeFilters } from "@/components/employees/employee-filters";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { employeeFiltersSchema } from "@/lib/validations/schemas";
import { getFilterOptions, listEmployees } from "@/server/services/employee.service";

export const metadata = { title: "Employees" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The directory.
 *
 * Filters live in the URL and are re-validated here with the same Zod schema
 * the API route uses, so a hand-edited query string cannot reach Cypher in a
 * shape the application did not expect.
 */
export default function EmployeesPage({ searchParams }: { searchParams: SearchParams }) {
	return (
		<div className="page-shell">
			<PageHeader
				title="Employees"
				description="Filtering runs as Cypher against CognoDB - the browser never receives the full directory to filter locally."
				crumbs={[{ label: "People" }, { label: "Employees" }]}
			/>

			<Suspense fallback={<Skeleton className="mb-4 h-28" />}>
				<Filters />
			</Suspense>

			<Suspense key={JSON.stringify(searchParams)} fallback={<GridSkeleton />}>
				<Results searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function Filters() {
	try {
		return <EmployeeFilters options={await getFilterOptions()} />;
	} catch {
		return null;
	}
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
	const parsed = employeeFiltersSchema.safeParse(searchParams);

	if (!parsed.success) {
		return (
			<ErrorState message="Those filter values are not valid. Clear the filters and try again." />
		);
	}

	try {
		const { employees, total } = await listEmployees(parsed.data);

		if (employees.length === 0) {
			return (
				<EmptyState
					title="No employees match those filters"
					message="Nobody in the directory matches every filter at once. Try removing the skill or seniority filter."
					action={{ label: "Clear all filters", href: "/employees" }}
				/>
			);
		}

		const shown = parsed.data.offset + employees.length;

		return (
			<>
				<p className="mb-3 text-xs text-muted-foreground">
					Showing <span className="tabular font-medium text-foreground">{employees.length}</span> of{" "}
					<span className="tabular font-medium text-foreground">{total}</span> people
				</p>

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{employees.map((employee) => (
						<EmployeeCard key={employee.id} employee={employee} />
					))}
				</div>

				{shown < total ? (
					<div className="mt-4 flex justify-center">
						<Link
							href={`/employees?${new URLSearchParams({
								...Object.fromEntries(
									Object.entries(searchParams).filter(([, value]) => typeof value === "string"),
								) as Record<string, string>,
								offset: String(shown),
							}).toString()}`}
							className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-4 text-xs font-medium hover:bg-surface-muted"
						>
							Load next {Math.min(parsed.data.limit, total - shown)}
						</Link>
					</div>
				) : null}
			</>
		);
	} catch {
		return <ErrorState message="The employee directory could not be loaded from the graph database." />;
	}
}

function GridSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading employees" aria-busy>
			{Array.from({ length: 9 }, (_, index) => (
				<Skeleton key={index} className="h-[168px]" />
			))}
		</div>
	);
}
