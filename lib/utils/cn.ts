import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names and resolves Tailwind conflicts.
 *
 * `twMerge` matters for component variants: without it, a caller passing
 * `className="p-8"` to a component with a built-in `p-4` gets both, and which
 * one wins depends on stylesheet order rather than intent.
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
