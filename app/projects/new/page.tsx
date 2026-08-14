import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { skillFiltersSchema } from "@/lib/validations/schemas";
import { getFilterOptions } from "@/server/services/project.service";
import { listSkills } from "@/server/services/skill.service";

export const metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default function NewProjectPage() {
	return (
		<div className="page-shell max-w-4xl">
			<PageHeader
				title="New project"
				description="Creating a project writes a Project node plus its FOR_CLIENT, IN_DOMAIN and REQUIRED_SKILL relationships."
				crumbs={[
					{ label: "Projects" },
					{ label: "All projects", href: "/projects" },
					{ label: "New project" },
				]}
			/>
			<Suspense fallback={<Skeleton className="h-96" />}>
				<FormLoader />
			</Suspense>
		</div>
	);
}

async function FormLoader() {
	try {
		const [options, skills] = await Promise.all([
			getFilterOptions(),
			listSkills(skillFiltersSchema.parse({ limit: "100", sort: "name" })),
		]);

		return (
			<CreateProjectForm
				options={{
					clients: options.clients,
					domains: options.domains,
					skills: skills.map((skill) => ({
						id: skill.id,
						name: skill.name,
						category: skill.category,
					})),
				}}
			/>
		);
	} catch {
		return <ErrorState message="The form could not be prepared - clients and skills are read from the graph." />;
	}
}
