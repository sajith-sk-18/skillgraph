import { Progress } from "@/components/ui/progress";
import { PROFICIENCY_MAX } from "@/types/domain";

/**
 * Proficiency on the 1-10 scale used throughout.
 *
 * The number is shown as well as the bar: a bar alone cannot be read precisely,
 * and "9/10" is what a resourcing manager will repeat in a meeting.
 */
export function SkillBar({
	name,
	proficiency,
	years,
	required,
}: {
	name: string;
	proficiency: number;
	years?: number;
	required?: number;
}) {
	const meets = required === undefined || proficiency >= required;
	const tone = required === undefined ? "primary" : meets ? "success" : "warning";

	return (
		<div>
			<div className="flex items-baseline justify-between gap-2 text-xs">
				<span className="truncate font-medium">{name}</span>
				<span className="tabular shrink-0 text-[11px] text-muted-foreground">
					{proficiency}/{PROFICIENCY_MAX}
					{required !== undefined ? (
						<span className={meets ? "text-success" : "text-warning"}>
							{" "}
							(needs {required})
						</span>
					) : years !== undefined ? (
						<span> · {years} yr</span>
					) : null}
				</span>
			</div>
			<Progress
				className="mt-1"
				value={proficiency}
				max={PROFICIENCY_MAX}
				tone={tone}
				label={`${name} proficiency ${proficiency} out of ${PROFICIENCY_MAX}`}
			/>
		</div>
	);
}
