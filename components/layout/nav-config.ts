import {
	BarChart3,
	Braces,
	Building2,
	FolderKanban,
	LayoutDashboard,
	Sparkles,
	Users,
} from "lucide-react";

/** Sidebar structure, grouped as the spec describes. */
export const NAV_GROUPS = [
	{
		label: "Overview",
		items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
	},
	{
		label: "People",
		items: [
			{ href: "/employees", label: "Employees", icon: Users },
			{ href: "/skills", label: "Skills", icon: Braces },
		],
	},
	{
		label: "Projects",
		items: [
			{ href: "/projects", label: "Projects", icon: FolderKanban },
			{ href: "/project-staffing", label: "Find Best Team", icon: Sparkles },
		],
	},
	{
		label: "Intelligence",
		items: [
			{ href: "/graph-explorer", label: "Graph Explorer", icon: Building2 },
			{ href: "/analytics", label: "Analytics", icon: BarChart3 },
		],
	},
] as const;
