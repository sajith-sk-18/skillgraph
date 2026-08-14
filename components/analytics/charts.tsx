"use client";

import {
	Bar,
	BarChart,
	Cell,
	Legend,
	Pie,
	PieChart,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

/**
 * Recharts wrappers.
 *
 * Client Components because charts measure the DOM, but they receive data as
 * props from a Server Component - no chart fetches anything itself, so the
 * page still renders its numbers server-side.
 *
 * Charts are used only where a shape carries meaning that a list would not.
 * Counts that are read precisely stay as tables elsewhere in the app.
 */

const PALETTE = ["#6366f1", "#06b6d4", "#a855f7", "#22c55e", "#f59e0b", "#ec4899", "#64748b", "#0ea5e9"];

const AXIS = { fontSize: 11, fill: "#64748b" };

const tooltipStyle = {
	contentStyle: {
		fontSize: 11,
		borderRadius: 8,
		border: "1px solid #e2e8f0",
		background: "#ffffff",
		color: "#0f172a",
	},
} as const;

export function BarChartCard({
	data,
	dataKey = "value",
	nameKey = "label",
	horizontal = false,
	height = 260,
	color = PALETTE[0],
}: {
	data: { label: string; value: number }[];
	dataKey?: string;
	nameKey?: string;
	horizontal?: boolean;
	height?: number;
	color?: string;
}) {
	if (data.length === 0) {
		return <p className="py-8 text-center text-xs text-muted-foreground">No data to chart.</p>;
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, bottom: 4, left: horizontal ? 8 : 0 }}>
				{horizontal ? (
					<>
						<XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
						<YAxis type="category" dataKey={nameKey} tick={AXIS} width={110} axisLine={false} tickLine={false} />
					</>
				) : (
					<>
						<XAxis dataKey={nameKey} tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
						<YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
					</>
				)}
				<Tooltip {...tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
				<Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}

export function DonutChartCard({
	data,
	height = 240,
}: {
	data: { label: string; value: number }[];
	height?: number;
}) {
	if (data.length === 0) {
		return <p className="py-8 text-center text-xs text-muted-foreground">No data to chart.</p>;
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
			<PieChart>
				<Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
					{data.map((entry, index) => (
						<Cell key={entry.label} fill={PALETTE[index % PALETTE.length]} />
					))}
				</Pie>
				<Tooltip {...tooltipStyle} />
				<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
			</PieChart>
		</ResponsiveContainer>
	);
}

/**
 * Supply against demand, per skill.
 *
 * A grouped comparison rather than two separate charts: the gap between the
 * two bars is the finding, and separating them would hide it.
 */
export function SupplyDemandChart({
	data,
	height = 320,
}: {
	data: { label: string; strongHolders: number; demand: number }[];
	height?: number;
}) {
	if (data.length === 0) {
		return <p className="py-8 text-center text-xs text-muted-foreground">No data to chart.</p>;
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={data} margin={{ top: 4, right: 8, bottom: 60, left: 0 }}>
				<XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
				<YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
				<Tooltip {...tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
				<Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
				<Bar name="People at 7+" dataKey="strongHolders" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
				<Bar name="Projects requiring it" dataKey="demand" fill={PALETTE[4]} radius={[4, 4, 0, 0]} />
			</BarChart>
		</ResponsiveContainer>
	);
}

export function SeniorityRadar({
	data,
	height = 260,
}: {
	data: { label: string; value: number }[];
	height?: number;
}) {
	if (data.length === 0) {
		return <p className="py-8 text-center text-xs text-muted-foreground">No data to chart.</p>;
	}

	return (
		<ResponsiveContainer width="100%" height={height}>
			<RadarChart data={data} outerRadius="72%">
				<PolarGrid stroke="#e2e8f0" />
				<PolarAngleAxis dataKey="label" tick={AXIS} />
				<PolarRadiusAxis tick={AXIS} axisLine={false} />
				<Tooltip {...tooltipStyle} />
				<Radar name="People" dataKey="value" stroke={PALETTE[2]} fill={PALETTE[2]} fillOpacity={0.35} />
			</RadarChart>
		</ResponsiveContainer>
	);
}
