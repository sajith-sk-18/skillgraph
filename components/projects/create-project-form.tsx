"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { createProjectSchema, type CreateProjectInput } from "@/lib/validations/schemas";

interface Options {
	clients: { id: string; name: string }[];
	domains: string[];
	skills: { id: string; name: string; category: string }[];
}

/**
 * Project creation.
 *
 * The SAME Zod schema validates here and in the route handler. Client-side
 * validation is a convenience - the server never trusts it, and re-parsing on
 * arrival is what actually protects the graph.
 */
export function CreateProjectForm({ options }: { options: Options }) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);

	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<CreateProjectInput>({
		resolver: zodResolver(createProjectSchema),
		defaultValues: {
			name: "",
			description: "",
			domain: options.domains[0] ?? "Banking",
			clientId: options.clients[0]?.id ?? "",
			location: "Dubai",
			startDate: new Date().toISOString().slice(0, 10),
			endDate: "",
			teamSize: 5,
			requiredSkills: [{ skillId: options.skills[0]?.id ?? "", requiredProficiency: 7, requiredYears: 2 }],
		},
	});

	const { fields, append, remove } = useFieldArray({ control, name: "requiredSkills" });

	const onSubmit = handleSubmit(async (values) => {
		setServerError(null);
		try {
			const response = await fetch("/api/projects", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			const payload = await response.json();

			if (!response.ok || payload.error) {
				setServerError(payload.error ?? "The project could not be created.");
				return;
			}

			// Straight to staffing - creating a project exists to staff it.
			router.push(`/project-staffing?project=${payload.project.id}`);
			router.refresh();
		} catch {
			setServerError("The project could not be saved. The graph database may be unavailable.");
		}
	});

	return (
		<form onSubmit={onSubmit} className="space-y-4" noValidate>
			<Card>
				<CardHeader>
					<CardTitle>Project details</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<Field label="Project name" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
						<Input
							id="name"
							{...register("name")}
							aria-invalid={Boolean(errors.name)}
							aria-describedby={errors.name ? "name-error" : undefined}
							placeholder="e.g. Regional Payments Platform"
						/>
					</Field>

					<Field label="Description" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
						<textarea
							id="description"
							rows={3}
							{...register("description")}
							className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-xs"
							placeholder="What the engagement delivers"
						/>
					</Field>

					<Field label="Client" htmlFor="clientId" error={errors.clientId?.message}>
						<Select id="clientId" {...register("clientId")} aria-invalid={Boolean(errors.clientId)}>
							{options.clients.map((client) => (
								<option key={client.id} value={client.id}>
									{client.name}
								</option>
							))}
						</Select>
					</Field>

					<Field label="Domain" htmlFor="domain" error={errors.domain?.message}>
						<Select id="domain" {...register("domain")} aria-invalid={Boolean(errors.domain)}>
							{options.domains.map((domain) => (
								<option key={domain} value={domain}>
									{domain}
								</option>
							))}
						</Select>
					</Field>

					<Field label="Start date" htmlFor="startDate" error={errors.startDate?.message}>
						<Input id="startDate" type="date" {...register("startDate")} />
					</Field>

					<Field label="End date (optional)" htmlFor="endDate" error={errors.endDate?.message}>
						<Input id="endDate" type="date" {...register("endDate")} />
					</Field>

					<Field label="Location" htmlFor="location" error={errors.location?.message}>
						<Input id="location" {...register("location")} />
					</Field>

					<Field label="Team size" htmlFor="teamSize" error={errors.teamSize?.message}>
						<Input id="teamSize" type="number" min={1} max={30} {...register("teamSize")} />
					</Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Required skills</CardTitle>
					<p className="text-[11px] text-muted-foreground">
						Each row becomes a REQUIRED_SKILL relationship carrying the bar as a property. This is what
						the staffing engine matches against.
					</p>
				</CardHeader>
				<CardContent className="space-y-2">
					{errors.requiredSkills?.message ? (
						<p role="alert" className="text-[11px] text-danger">
							{errors.requiredSkills.message}
						</p>
					) : null}

					{fields.map((field, index) => (
						<div key={field.id} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
							<div>
								<label htmlFor={`skill-${index}`} className="sr-only">
									Skill {index + 1}
								</label>
								<Select id={`skill-${index}`} {...register(`requiredSkills.${index}.skillId`)}>
									{options.skills.map((skill) => (
										<option key={skill.id} value={skill.id}>
											{skill.name} ({skill.category})
										</option>
									))}
								</Select>
							</div>
							<div>
								<label htmlFor={`proficiency-${index}`} className="sr-only">
									Required proficiency for skill {index + 1}
								</label>
								<Select id={`proficiency-${index}`} {...register(`requiredSkills.${index}.requiredProficiency`)}>
									{Array.from({ length: 10 }, (_, value) => value + 1).map((value) => (
										<option key={value} value={value}>
											Level {value}+
										</option>
									))}
								</Select>
							</div>
							<div>
								<label htmlFor={`years-${index}`} className="sr-only">
									Required years for skill {index + 1}
								</label>
								<Select id={`years-${index}`} {...register(`requiredSkills.${index}.requiredYears`)}>
									{[0, 1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
										<option key={value} value={value}>
											{value} yrs
										</option>
									))}
								</Select>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => remove(index)}
								disabled={fields.length === 1}
								aria-label={`Remove required skill ${index + 1}`}
							>
								<Trash2 className="h-3.5 w-3.5" aria-hidden />
							</Button>
						</div>
					))}

					<Button
						variant="secondary"
						size="sm"
						onClick={() =>
							append({ skillId: options.skills[0]?.id ?? "", requiredProficiency: 7, requiredYears: 2 })
						}
						disabled={fields.length >= 15}
					>
						<Plus className="h-3.5 w-3.5" aria-hidden />
						Add required skill
					</Button>
				</CardContent>
			</Card>

			{serverError ? (
				<p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
					{serverError}
				</p>
			) : null}

			<div className="flex items-center gap-2">
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
					Create project and find a team
				</Button>
				<Badge tone="muted">Saved to CognoDB as a Planned project</Badge>
			</div>
		</form>
	);
}
