/**
TimingChart, ported from design-system/components/TimingChart/reference.tsx: before/after bars
on a linear axis, drawn inside DiagramHost, which brings the scaling, the scroll floor and the
reveal. It runs no hooks itself, so it needs no client directive.
*/
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { DiagramHost } from "../Diagram/Diagram.js";

/**
Before/after bars. Values in one unit (the site's are milliseconds); the axis is linear so the gap
reads true.
*/
export type TimingData = {
	/**
	Names the dataset (kept on the root as data-chart).
	*/
	id: string;
	/**
	Accessible name.
	*/
	label: string;
	/**
	One or two sentences with the numbers, read by screen readers as the SVG's desc.
	*/
	description: string;
	/**
	Right end of the axis, in the data's unit.
	*/
	axisMax: number;
	/**
	Axis ticks: a value and its text ("2 s").
	*/
	ticks: Array<{
		value: number;
		text: string;
	}>;
	/**
	One bar per row: its name, value, the text at its tip, and muted or accent.
	*/
	rows: Array<{
		name: string;
		value: number;
		text: string;
		tone?: "muted" | "accent";
	}>;
};

// The site's geometry, in chart units.
const chartWidth = 820;
const barX = 110;
const barWidth = 600;
const barHeight = 36;
const rowGap = 20;
const top = 12;
/**
A real 20 ms bar is 2 units wide on a 6 s axis; never draw it thinner than that.
*/
const minimumBar = 2;
/**
The baseline sits this fraction of the font size below the row's centre, as Diagram's text does.
*/
const baselineShift = 0.36;

export type TimingChartProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	/**
	Class names for the root element, merged with the component's own.
	*/
	className?: string;
	/**
	Inline styles for the root element.
	*/
	style?: React.CSSProperties;
	/**
	Rows, axis and accessible text. Two rows is the site's layout; more rows stack the same way.
	*/
	data: TimingData;
	/**
	Floor for the scale: below `820 × minScale` px the host scrolls sideways (the site uses 0.6).
	*/
	minScale?: number;
	/**
	Grow the bars in when the chart scrolls into view. Default true.
	*/
	reveal?: boolean;
};

/**
The reveal's stagger index, `--i` in Diagram.css and TimingChart.css.
*/
function order(index: number): React.CSSProperties {
	const style: React.CSSProperties & { "--i": number } = { "--i": index };
	return style;
}

/**
The site's before/after timing bars on a linear axis, styled and revealed like the diagrams.
*/
export function TimingChart({
	ref,
	data,
	minScale = 0,
	reveal = true,
	className,
	...rest
}: TimingChartProps & { readonly ref?: React.Ref<HTMLDivElement> }) {
	const count = data.rows.length;
	// The site's AXIS_Y = 2 × BAR_H + ROW_GAP + 40 and HEIGHT 168, written for any row count.
	const axisY = top + count * barHeight + (count - 1) * rowGap + 28;
	const height = axisY + 36;
	const x = (value: number) =>
		barX +
		(Math.max(0, Math.min(value, data.axisMax)) / data.axisMax) * barWidth;
	return (
		<DiagramHost
			ref={ref}
			label={data.label}
			description={data.description}
			width={chartWidth}
			height={height}
			minScale={minScale}
			reveal={reveal}
			scrollHint="Scroll sideways for the whole chart."
			className={cx("gl-dg-chart", className)}
			data-chart={data.id}
			{...rest}
		>
			<g className="gl-dg-axis" aria-hidden="true">
				<line
					className="gl-dg-axis-line"
					x1={barX}
					x2={barX + barWidth}
					y1={axisY}
					y2={axisY}
				/>
				{data.ticks.map((tick) => (
					<g key={tick.value}>
						<line
							className="gl-dg-axis-line"
							x1={x(tick.value)}
							x2={x(tick.value)}
							y1={axisY}
							y2={axisY + 6}
						/>
						<text
							className="gl-dg-label"
							x={x(tick.value)}
							y={axisY + 22}
							textAnchor="middle"
							fontSize={13}
						>
							{tick.text}
						</text>
					</g>
				))}
			</g>
			{data.rows.map((row, index) => {
				const y = top + index * (barHeight + rowGap);
				const width = Math.max(minimumBar, x(row.value) - barX);
				const tone = row.tone ?? "muted";
				return (
					<g
						key={row.name}
						className={`gl-dg-bar-row gl-dg-tone-${tone}`}
						style={order(index)}
					>
						<text
							className="gl-dg-text"
							x={0}
							y={y + barHeight / 2 + 15 * baselineShift}
							fontSize={15}
							fontWeight={600}
						>
							{row.name}
						</text>
						<rect
							className="gl-dg-bar-track"
							x={barX}
							y={y}
							width={barWidth}
							height={barHeight}
							rx={10}
						/>
						<rect
							className="gl-dg-bar"
							x={barX}
							y={y}
							width={width}
							height={barHeight}
							rx={Math.min(10, width / 2)}
						/>
						<text
							className={`gl-dg-label gl-dg-label-${tone} gl-dg-bar-value`}
							x={barX + width + 12}
							y={y + barHeight / 2 + 13 * baselineShift}
							fontSize={13}
						>
							{row.text}
						</text>
					</g>
				);
			})}
		</DiagramHost>
	);
}
