import type { Config } from "tailwindcss";

/**
 * Colours are declared as `hsl(var(--token))` so a single set of class names
 * works in both themes - see app/globals.css. Nothing in the app should use a
 * literal colour class such as `text-slate-700`.
 */
const config: Config = {
	darkMode: "class",
	content: [
		"./app/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				background: "hsl(var(--background))",
				surface: {
					DEFAULT: "hsl(var(--surface))",
					muted: "hsl(var(--surface-muted))",
				},
				foreground: "hsl(var(--foreground))",
				"muted-foreground": "hsl(var(--muted-foreground))",
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
					soft: "hsl(var(--primary-soft))",
				},
				success: { DEFAULT: "hsl(var(--success))", soft: "hsl(var(--success-soft))" },
				warning: { DEFAULT: "hsl(var(--warning))", soft: "hsl(var(--warning-soft))" },
				danger: { DEFAULT: "hsl(var(--danger))", soft: "hsl(var(--danger-soft))" },
				info: { DEFAULT: "hsl(var(--info))", soft: "hsl(var(--info-soft))" },
				accent: { DEFAULT: "hsl(var(--accent))", soft: "hsl(var(--accent-soft))" },
			},
			borderRadius: {
				xl: "var(--radius)",
				lg: "calc(var(--radius) - 2px)",
				md: "calc(var(--radius) - 4px)",
			},
			fontFamily: {
				sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
			},
			keyframes: {
				shimmer: {
					"100%": { transform: "translateX(100%)" },
				},
				"fade-in": {
					from: { opacity: "0", transform: "translateY(4px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				shimmer: "shimmer 1.6s infinite",
				"fade-in": "fade-in 0.25s ease-out",
			},
		},
	},
	plugins: [],
};

export default config;
