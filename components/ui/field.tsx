import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

const CONTROL =
	"h-9 w-full rounded-lg border border-input bg-surface px-3 text-xs text-foreground placeholder:text-muted-foreground disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	function Input({ className, ...props }, ref) {
		return <input ref={ref} className={cn(CONTROL, className)} {...props} />;
	},
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
	function Select({ className, children, ...props }, ref) {
		return (
			<select ref={ref} className={cn(CONTROL, "pr-8", className)} {...props}>
				{children}
			</select>
		);
	},
);

/** Label + control + error, so every field is wired up for screen readers. */
export function Field({
	label,
	htmlFor,
	error,
	hint,
	children,
	className,
}: {
	label: string;
	htmlFor: string;
	error?: string;
	hint?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("space-y-1.5", className)}>
			<label htmlFor={htmlFor} className="block text-[11px] font-medium text-muted-foreground">
				{label}
			</label>
			{children}
			{hint && !error ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
			{error ? (
				<p id={`${htmlFor}-error`} role="alert" className="text-[11px] text-danger">
					{error}
				</p>
			) : null}
		</div>
	);
}
