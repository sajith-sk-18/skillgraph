import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
	title: {
		default: "SkillGraph - Employee Skill & Project Intelligence",
		template: "%s | SkillGraph",
	},
	description:
		"Find the right people for the right projects. Explore employee expertise, project experience and collaboration networks using graph intelligence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.variable}>
			<body>
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-xs focus:text-primary-foreground"
				>
					Skip to main content
				</a>
				<AppShell>{children}</AppShell>
			</body>
		</html>
	);
}
