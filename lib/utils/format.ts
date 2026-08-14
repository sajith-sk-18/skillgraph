/** Display helpers shared across pages - kept out of components so they can be tested. */

export const initials = (name: string): string =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");

/** "Jan 2024" - day precision is noise for multi-month engagements. */
export function formatMonth(date: string | null | undefined): string {
	if (!date) return "Present";
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) return date;
	return parsed.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function formatRange(start: string, end: string | null): string {
	return `${formatMonth(start)} - ${formatMonth(end)}`;
}

/** Whole months between two dates, rendered as "1 yr 4 mo". */
export function duration(start: string, end: string | null): string {
	const from = new Date(start);
	const to = end ? new Date(end) : new Date();
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";

	const months = Math.max(
		1,
		(to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()),
	);
	const years = Math.floor(months / 12);
	const remainder = months % 12;

	if (years === 0) return `${months} mo`;
	if (remainder === 0) return `${years} yr${years > 1 ? "s" : ""}`;
	return `${years} yr${years > 1 ? "s" : ""} ${remainder} mo`;
}

export const pluralise = (count: number, singular: string, plural = `${singular}s`): string =>
	`${count} ${count === 1 ? singular : plural}`;

/** Availability drives a colour in several places; the mapping lives here once. */
export const availabilityTone = (availability: string): "success" | "warning" | "muted" =>
	availability === "Available" ? "success" : availability === "Partially Available" ? "warning" : "muted";

/** Match strength banding for candidate scores. */
export const scoreTone = (score: number): "success" | "info" | "warning" | "muted" =>
	score >= 80 ? "success" : score >= 65 ? "info" : score >= 50 ? "warning" : "muted";
