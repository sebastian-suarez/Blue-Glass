import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { DiagramHost } from "../Diagram/Diagram.js";

export type TimingData = {
	id: string;
	label: string;
	description: string;
	axisMax: number;
	ticks: Array<{
		value: number;
		text: string;
	}>;
	rows: Array<{
		name: string;
		value: number;
		text: string;
		tone?: "muted" | "accent";
	}>;
};

const chartWidth = 820;
const barX = 110;
const barWidth = 600;
const barHeight = 36;
const rowGap = 20;
const top = 12;
const minimumBar = 2;
const baselineShift = 0.36;
const halfBar = barHeight / 2;
const nameBaseline = 15 * baselineShift;
const valueBaseline = 13 * baselineShift;

export type TimingChartProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	className?: string;
	style?: React.CSSProperties;
	data: TimingData;
	minScale?: number;
	reveal?: boolean;
};

function order(index: number): React.CSSProperties {
	const style: React.CSSProperties & { "--i": number } = { "--i": index };
	return style;
}

export function TimingChart({
	ref,
	data,
	minScale = 0,
	reveal = true,
	className,
	...rest
}: TimingChartProps & { readonly ref?: React.Ref<HTMLDivElement> }) {
	const count = data.rows.length;
	const barsHeight = count * barHeight;
	const gapsHeight = (count - 1) * rowGap;
	const axisY = top + barsHeight + gapsHeight + 28;
	const height = axisY + 36;
	const x = (value: number) => {
		const share = Math.max(0, Math.min(value, data.axisMax)) / data.axisMax;
		const offset = share * barWidth;
		return barX + offset;
	};

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
				const rowOffset = index * (barHeight + rowGap);
				const y = top + rowOffset;
				const centreY = y + halfBar;
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
							y={centreY + nameBaseline}
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
							y={centreY + valueBaseline}
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
