import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
	primary: "bg-primary text-primary-foreground hover:opacity-90",
	secondary: "border border-border bg-surface hover:bg-surface-muted",
	ghost: "hover:bg-surface-muted",
	danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<Size, string> = {
	sm: "h-8 px-3 text-xs",
	md: "h-10 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ className, variant = "primary", size = "md", type = "button", ...props },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type}
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
				VARIANTS[variant],
				SIZES[size],
				className,
			)}
			{...props}
		/>
	);
});
