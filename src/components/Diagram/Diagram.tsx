"use client";
/**
Diagram and DiagramHost, ported from design-system/components/Diagram/reference.tsx.

DiagramHost is the shell every figure shares (TimingChart, and Mermaid's drawings): one SVG that
scales with its host, a scroll floor with its hint, and the entrance reveal. Diagram draws a
DiagramData inside it with the marks below, which Mermaid reuses so both share one drawing.

The server HTML is the finished figure. The entrance arms itself only on the client: rendered
armed once the client can play it, so no style pass catches it shown and fades it out first.
Until the client measures the host's overflow, CSS decides whether the scroll hint shows
(Diagram.css), so the server HTML already lays out as the hydrated page does. Once measured,
the measure drives the hint and the host's tab stop together, as in the reference.
*/
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useForkRef, useId, useIsoLayoutEffect } from "../../internal/hooks.js";

/**
Edge and label tone: muted ink, or the accent blue that carries the travelling pulse.
*/
export type DiagramTone = "muted" | "accent";

/**
Node tone: default glass box, accent outline, or accent fill with white text.
*/
export type DiagramNodeTone = "default" | "accent" | "accent-fill";

export type DiagramShape = "rect" | "circle";

/**
Region looks: a tinted glass panel, or the two rings of the architecture diagram.
*/
export type DiagramRegionTone = "panel" | "ring" | "ring-inner";

/**
A plain string is a regular line; an object can be bold.
*/
export type DiagramNodeLine =
	| string
	| {
			text: string;
			bold?: boolean;
	  };

/**
Background panel or ring.
*/
export type DiagramRegion = {
	shape?: DiagramShape;
	x: number;
	y: number;
	w: number;
	h: number;
	radius?: number;
	tone: DiagramRegionTone;
};

/**
A labelled box (or disc). Lines are explicit: SVG text does not wrap.
*/
export type DiagramNode = {
	shape?: DiagramShape;
	x: number;
	y: number;
	w: number;
	h: number;
	lines: DiagramNodeLine[];
	tone?: DiagramNodeTone;
};

/**
A polyline. Arrowhead on the last point unless `arrow` is false. Accent edges carry the pulse.
*/
export type DiagramEdge = {
	points: Array<[number, number]>;
	arrow?: boolean;
	dashed?: boolean;
	tone?: DiagramTone;
};

/**
Free text, placed by its top-left. With `align: 'middle'` the text centres inside `w`.
*/
export type DiagramLabel = {
	x: number;
	y: number;
	w?: number;
	lines: string[];
	align?: "start" | "middle";
	tone?: DiagramTone;
};

export type DiagramData = {
	/**
	Names the dataset; namespaces the SVG ids together with React's id.
	*/
	id: string;
	/**
	The coordinate space (viewBox) every position is written in.
	*/
	width: number;
	height: number;
	/**
	Accessible name for the whole diagram.
	*/
	label: string;
	/**
	One or two sentences spelling out the relationships the arrows encode.
	*/
	description: string;
	regions?: DiagramRegion[];
	nodes: DiagramNode[];
	edges: DiagramEdge[];
	labels?: DiagramLabel[];
};

/*
The marks below are exported for Mermaid, which draws its layout with them. They're internal:
src/index.ts leaves them out, as the reference's index.d.ts does.
*/

/**
Node text: 15px on a 20px line.
*/
export const DG_NODE_FONT = 15;
export const DG_NODE_LINE = 20;
/**
Label text: 13px on a 16px line.
*/
export const DG_LABEL_FONT = 13;
export const DG_LABEL_LINE = 16;
/**
The baseline sits this fraction of the font size below the line's vertical centre.
*/
const baselineShift = 0.36;
/**
Arrowhead half-size in diagram units (the old 5-unit marker at stroke width 2).
*/
const head = 4;

/**
What an edge end carries: the arrowhead, a dot, a cross, or nothing.
*/
export type DgEnd = "arrow" | "circle" | "cross" | "none";

/**
A run of node text. A line is one or more runs, so part of a line can be bold.
*/
export type DgRun = {
	text: string;
	bold?: boolean;
};

type Point = [number, number];

/**
The reveal's stagger index, `--i` in Diagram.css.
*/
export function dgOrder(index: number): React.CSSProperties {
	const style: React.CSSProperties & { "--i": number } = { "--i": index };
	return style;
}

function toRuns(line: DiagramNodeLine): DgRun[] {
	return [
		typeof line === "string"
			? { text: line, bold: false }
			: { text: line.text, bold: Boolean(line.bold) },
	];
}

/**
The baseline of line `index` of `count` lines centred on `centreY`.
*/
function baseline(
	centreY: number,
	index: number,
	count: number,
	lineHeight: number,
	fontSize: number,
): number {
	const firstLineOffset = ((count - 1) * lineHeight) / 2;
	const lineOffset = index * lineHeight;
	const baselineOffset = fontSize * baselineShift;
	return centreY - firstLineOffset + lineOffset + baselineOffset;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
An SVG path through the points.
*/
export function dgPath(points: Point[]): string {
	return points
		.map(
			([x, y], index) => `${index === 0 ? "M" : "L"} ${round2(x)} ${round2(y)}`,
		)
		.join(" ");
}

/**
The mark at `end`, facing away from `previous`: a triangle whose tip is `head` past the end, or a
dot or a cross centred on it.
*/
function endMark(
	kind: DgEnd,
	end: Point,
	previous: Point,
	key: string,
): React.ReactNode {
	if (kind === "none") {
		return null;
	}

	const [endX, endY] = end;
	if (kind === "circle") {
		return (
			<circle
				key={key}
				className="gl-dg-head"
				cx={round2(endX)}
				cy={round2(endY)}
				r={head}
			/>
		);
	}

	const distance = Math.hypot(endX - previous[0], endY - previous[1]);
	// A zero-length edge still gets a direction to draw its mark along.
	const length = distance > 0 ? distance : 1;
	const unitX = (endX - previous[0]) / length;
	const unitY = (endY - previous[1]) / length;
	if (kind === "cross") {
		const arm = head * 0.85;
		// Each stroke runs from the end point minus its offset to the end point plus it.
		const firstX = arm * (unitX - unitY);
		const firstY = arm * (unitY + unitX);
		const secondX = arm * (unitX + unitY);
		const secondY = arm * (unitY - unitX);
		const strokes = [
			`M ${round2(endX - firstX)} ${round2(endY - firstY)}`,
			`L ${round2(endX + firstX)} ${round2(endY + firstY)}`,
			`M ${round2(endX - secondX)} ${round2(endY - secondY)}`,
			`L ${round2(endX + secondX)} ${round2(endY + secondY)}`,
		];
		return (
			<path
				key={key}
				className="gl-dg-head gl-dg-head-cross"
				d={strokes.join(" ")}
			/>
		);
	}

	const headX = head * unitX;
	const headY = head * unitY;
	const tip = [endX + headX, endY + headY];
	const left = [endX - headX - headY, endY - headY + headX];
	const right = [endX - headX + headY, endY - headY - headX];
	return (
		<path
			key={key}
			className="gl-dg-head"
			d={`M ${round2(tip[0])} ${round2(tip[1])} L ${round2(left[0])} ${round2(left[1])} L ${round2(right[0])} ${round2(right[1])} Z`}
		/>
	);
}

/**
A background panel or ring.
*/
export function DgRegion({
	region,
	i,
}: {
	readonly region: DiagramRegion;
	readonly i: number;
}) {
	const className = `gl-dg-region gl-dg-region-${region.tone}`;
	if (region.shape === "circle") {
		const radius = region.w / 2;
		const halfHeight = region.h / 2;
		return (
			<circle
				className={className}
				style={dgOrder(i)}
				cx={region.x + radius}
				cy={region.y + halfHeight}
				r={radius}
			/>
		);
	}

	return (
		<rect
			className={className}
			style={dgOrder(i)}
			x={region.x}
			y={region.y}
			width={region.w}
			height={region.h}
			rx={region.radius ?? 0}
		/>
	);
}

/**
Props of DgEdge: a polyline plus what each end carries.
*/
export type DgEdgeProps = {
	readonly points: Point[];
	readonly dashed?: boolean;
	readonly tone?: DiagramTone;
	readonly start?: DgEnd;
	readonly end?: DgEnd;
	readonly i: number;
	readonly children?: React.ReactNode;
};

/**
An edge: the line, then its end marks. Extra marks (sequence numbers) ride in `children`.
*/
export function DgEdge({
	points,
	dashed,
	tone = "muted",
	start = "none",
	end = "arrow",
	i,
	children,
}: DgEdgeProps) {
	// Solid edges draw in through a normalised dash; dashed ones keep their pattern and fade.
	const kind = dashed ? "gl-dg-edge-dashed" : "gl-dg-edge-draw";
	const count = points.length;
	return (
		<g
			className={`gl-dg-edge-group gl-dg-tone-${tone}`}
			style={dgOrder(i)}
			aria-hidden="true"
		>
			<path
				className={`gl-dg-edge ${kind}`}
				d={dgPath(points)}
				pathLength={dashed ? undefined : 1}
				strokeDasharray={dashed ? "6 6" : undefined}
			/>
			{count > 1 ? endMark(start, points[0], points[1], "start") : null}
			{count > 1
				? endMark(end, points[count - 1], points[count - 2], "end")
				: null}
			{children}
		</g>
	);
}

/**
A dot that runs along an accent edge, rests, and runs again. Hidden under reduced motion.
*/
export function DgPulse({ points }: { readonly points: Point[] }) {
	return (
		<circle className="gl-dg-pulse" r={4.5} cx={0} cy={0}>
			<animateMotion
				dur="3.2s"
				repeatCount="indefinite"
				path={dgPath(points)}
				keyPoints="0;1;1"
				keyTimes="0;0.5;1"
				calcMode="linear"
			/>
			<animate
				attributeName="opacity"
				values="0;1;1;0;0"
				keyTimes="0;0.06;0.44;0.52;1"
				dur="3.2s"
				repeatCount="indefinite"
			/>
		</circle>
	);
}

/**
Props of DgNode: a box, disc or caller-drawn outline, with centred lines of text.
*/
export type DgNodeProps = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	/**
	`rect` is the 10-unit box; `outline` draws `outline` instead (each element gets gl-dg-box).
	*/
	readonly shape?: DiagramShape | "outline";
	readonly outline?: React.ReactNode;
	/**
	Corner radius of a rect. Default 10.
	*/
	readonly radius?: number;
	readonly lines: DgRun[][];
	readonly tone?: DiagramNodeTone;
	/**
	The centre of the text, when it isn't the box's (a cylinder's label sits below its lid).
	*/
	readonly textX?: number;
	readonly textY?: number;
	readonly i: number;
};

function NodeShape({
	x,
	y,
	w,
	h,
	shape,
	outline,
	radius,
}: Pick<DgNodeProps, "x" | "y" | "w" | "h" | "outline"> & {
	readonly shape: NonNullable<DgNodeProps["shape"]>;
	readonly radius: number;
}): React.ReactNode {
	if (shape === "outline") {
		return outline;
	}

	const halfWidth = w / 2;
	const halfHeight = h / 2;
	return shape === "circle" ? (
		<circle
			className="gl-dg-box"
			cx={x + halfWidth}
			cy={y + halfHeight}
			r={halfWidth}
		/>
	) : (
		<rect className="gl-dg-box" x={x} y={y} width={w} height={h} rx={radius} />
	);
}

/**
A glass node.
*/
export function DgNode({
	x,
	y,
	w,
	h,
	shape = "rect",
	outline,
	radius = 10,
	lines,
	tone = "default",
	textX,
	textY,
	i,
}: DgNodeProps) {
	const halfWidth = w / 2;
	const halfHeight = h / 2;
	const boxCentreX = x + halfWidth;
	const boxCentreY = y + halfHeight;
	const centreX = textX ?? boxCentreX;
	const centreY = textY ?? boxCentreY;
	const lineY = (index: number) =>
		baseline(centreY, index, lines.length, DG_NODE_LINE, DG_NODE_FONT);
	return (
		<g className={`gl-dg-node gl-dg-node-${tone}`} style={dgOrder(i)}>
			<NodeShape
				x={x}
				y={y}
				w={w}
				h={h}
				shape={shape}
				outline={outline}
				radius={radius}
			/>
			{lines.length > 0 ? (
				<text
					className="gl-dg-text"
					textAnchor="middle"
					fontSize={DG_NODE_FONT}
				>
					{lines.map((runs, index) =>
						runs.length === 1 ? (
							<tspan
								// Lines are positional: the data gives them no other identity.
								// eslint-disable-next-line @eslint-react/no-array-index-key
								key={index}
								x={centreX}
								y={lineY(index)}
								fontWeight={runs[0].bold ? 600 : 400}
							>
								{runs[0].text}
							</tspan>
						) : (
							// eslint-disable-next-line @eslint-react/no-array-index-key
							<tspan key={index} x={centreX} y={lineY(index)}>
								{runs.map((run, runIndex) => (
									// eslint-disable-next-line @eslint-react/no-array-index-key
									<tspan key={runIndex} fontWeight={run.bold ? 600 : 400}>
										{run.text}
									</tspan>
								))}
							</tspan>
						),
					)}
				</text>
			) : null}
		</g>
	);
}

/**
Free text, placed by its top-left (or centred in `w`).
*/
export function DgLabel({
	label,
	i,
}: {
	readonly label: DiagramLabel;
	readonly i: number;
}) {
	const isMiddle = label.align === "middle";
	const halfWidth = (label.w ?? 0) / 2;
	const x = isMiddle ? label.x + halfWidth : label.x;
	// Labels are placed by their top-left, like the comp's text blocks.
	const halfLine = DG_LABEL_LINE / 2;
	const centreY = label.y + halfLine;
	const baselineOffset = DG_LABEL_FONT * baselineShift;
	return (
		<text
			className={`gl-dg-label gl-dg-label-${label.tone ?? "muted"}`}
			style={dgOrder(i)}
			textAnchor={isMiddle ? "middle" : "start"}
			fontSize={DG_LABEL_FONT}
		>
			{label.lines.map((text, index) => {
				const lineOffset = index * DG_LABEL_LINE;
				return (
					<tspan
						// Lines are positional: the data gives them no other identity.
						// eslint-disable-next-line @eslint-react/no-array-index-key
						key={index}
						x={x}
						y={centreY + lineOffset + baselineOffset}
					>
						{text}
					</tspan>
				);
			})}
		</text>
	);
}

function subscribeToNothing(): () => void {
	return () => undefined;
}

function isAutomated(): boolean {
	return typeof navigator !== "undefined" && navigator.webdriver;
}

/**
Whether this reader gets the entrance: a browser with IntersectionObserver, motion welcome, and
not automated, so screenshots and visual tests never catch an entrance half-way.
*/
function isEntranceOn(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof IntersectionObserver !== "undefined" &&
		typeof window.matchMedia === "function" &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
		!isAutomated()
	);
}

function isEntranceOnServer(): boolean {
	return false;
}

/**
The site's diagram-reveal.ts, as an effect. The states on `.gl-dg-wrap[data-reveal]`: none (no
JavaScript yet: shown, or hidden with a 2.5s failsafe when <html> has `gl-js`), `armed` (hidden,
waiting to scroll in) and `in` (shown). Pulses run only while the figure is on screen.
*/
function useDiagramReveal(
	wrapRef: React.RefObject<HTMLDivElement | null>,
	isEnabled: boolean,
) {
	useIsoLayoutEffect(() => {
		const wrap = wrapRef.current;
		if (!wrap) {
			return;
		}

		if (
			!isEnabled ||
			typeof IntersectionObserver === "undefined" ||
			typeof window.matchMedia !== "function" ||
			isAutomated()
		) {
			wrap.dataset.reveal = "in";
			return;
		}

		const svg = wrap.querySelector("svg");
		const run = (isRunning: boolean) => {
			// Not every DOM has SMIL (jsdom doesn't).
			if (!svg || typeof svg.pauseAnimations !== "function") {
				return;
			}

			if (isRunning) {
				svg.unpauseAnimations();
			} else {
				svg.pauseAnimations();
			}
		};

		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		wrap.dataset.reveal = reduced.matches ? "in" : "armed";
		run(false);
		let isVisible = false;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					isVisible = entry.isIntersecting;
					if (entry.isIntersecting) {
						wrap.dataset.reveal = "in";
					}

					run(entry.isIntersecting && !reduced.matches);
				}
			},
			{ threshold: 0.3 },
		);
		observer.observe(wrap);
		const onChange = () => {
			if (reduced.matches) {
				wrap.dataset.reveal = "in";
			}

			run(!reduced.matches && isVisible);
		};

		reduced.addEventListener("change", onChange);
		return () => {
			observer.disconnect();
			reduced.removeEventListener("change", onChange);
			wrap.dataset.reveal = "in";
		};
	}, [isEnabled]);
}

/**
The site's scrollable-hosts.ts: whether the host overflows its width, or null before the first
measure. A host renders keyboard-scrollable (tabindex 0) and keeps that only while it overflows.
*/
function useHostOverflow(
	hostRef: React.RefObject<HTMLDivElement | null>,
	isActive: boolean,
): boolean | undefined {
	const [overflows, setOverflows] = React.useState<boolean | undefined>(
		undefined,
	);
	useIsoLayoutEffect(() => {
		const host = hostRef.current;
		if (!host || !isActive) {
			return;
		}

		const update = () => {
			setOverflows(host.scrollWidth > host.clientWidth + 1);
		};

		update();
		if (typeof ResizeObserver === "undefined") {
			// eslint-disable-next-line unicorn/prefer-observer-apis -- The reference's fallback for a DOM without ResizeObserver, such as jsdom.
			window.addEventListener("resize", update);
			return () => {
				window.removeEventListener("resize", update);
			};
		}

		let frame = 0;
		const observer = new ResizeObserver(() => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		});
		observer.observe(host);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, [isActive]);
	return overflows;
}

export type DiagramHostProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	/**
	Id for the root element; also the base of the description's id.
	*/
	id?: string;
	/**
	Class names for the root element, merged with the component's own.
	*/
	className?: string;
	/**
	Inline styles for the root element.
	*/
	style?: React.CSSProperties;
	/**
	Accessible name for the whole figure (role group: the text inside stays readable).
	*/
	label: string;
	/**
	One or two sentences spelling out the relationships the marks encode; becomes the SVG's desc.
	*/
	description: string;
	/**
	Width of the coordinate space (the viewBox).
	*/
	width: number;
	/**
	Height of the coordinate space (the viewBox).
	*/
	height: number;
	/**
	Floor for the scale: below `width × minScale` px the host scrolls sideways instead. 0 = pure
	scaling.
	*/
	minScale?: number;
	/**
	Play the entrance when the figure scrolls into view. Default true.
	*/
	reveal?: boolean;
	/**
	Text under a host that overflows.
	*/
	scrollHint?: React.ReactNode;
	/**
	SVG content, in the viewBox's coordinates.
	*/
	children?: React.ReactNode;
};

/**
The shell every diagram and chart from the site shares: one SVG that scales with its host, a
scroll floor for phones with its hint, and the entrance reveal.
*/
export function DiagramHost({
	ref,
	label,
	description,
	width,
	height,
	minScale = 0,
	reveal = true,
	scrollHint = "Scroll sideways for the whole diagram.",
	id,
	className,
	children,
	...rest
}: DiagramHostProps & { readonly ref?: React.Ref<HTMLDivElement> }) {
	const wrapRef = React.useRef<HTMLDivElement>(null);
	const hostRef = React.useRef<HTMLDivElement>(null);
	const handleRef = useForkRef<HTMLDivElement>(wrapRef, ref);
	const baseId = useId(id);
	const descriptionId = `${baseId}-desc`;
	// Below the floor the host scrolls, so it must be reachable and named for keyboard users.
	const isScrollable = minScale > 0;
	const floor = Math.round(width * minScale);
	// Arm the entrance before anything measures: the overflow check forces a style pass, and a node
	// first styled as shown would fade out to its armed state instead of in.
	useDiagramReveal(wrapRef, reveal);
	const overflows = useHostOverflow(hostRef, isScrollable);
	// Rendered armed (not armed by an effect), so no style pass in the same commit, such as another
	// figure measuring its overflow, can catch this one shown and fade it out before it fades in.
	const isArmed =
		React.useSyncExternalStore(
			subscribeToNothing,
			isEntranceOn,
			isEntranceOnServer,
		) && reveal;
	const naming = {
		role: "group",
		"aria-label": label,
		"aria-describedby": descriptionId,
	};
	// The hint's width scales with the floor (Diagram.css), never by zero.
	const hintStyle: React.CSSProperties & { "--gl-dg-floor": number } = {
		"--gl-dg-floor": Math.max(1, floor),
	};
	// One unit of padding keeps the 1px strokes of boxes on the viewBox edge from being clipped.
	const viewBox = `-1 -1 ${width + 2} ${height + 2}`;
	return (
		<div
			ref={handleRef}
			id={id}
			className={cx("gl-dg-wrap", className)}
			data-reveal={isArmed ? "armed" : undefined}
			{...rest}
		>
			<div
				ref={hostRef}
				className="gl-dg-host"
				data-scrollable={isScrollable && overflows ? "" : undefined}
				data-fits={isScrollable && overflows === false ? "" : undefined}
				tabIndex={isScrollable && overflows !== false ? 0 : undefined}
				role={isScrollable ? "group" : undefined}
				aria-label={isScrollable ? label : undefined}
				aria-describedby={isScrollable ? descriptionId : undefined}
			>
				<svg
					className="gl-dg"
					viewBox={viewBox}
					style={{ minWidth: isScrollable ? floor : undefined }}
					{...(isScrollable ? {} : naming)}
				>
					<desc id={descriptionId}>{description}</desc>
					{children}
				</svg>
			</div>
			{isScrollable ? (
				<p className="gl-dg-hint" style={hintStyle}>
					<span className="gl-dg-hint-text">{scrollHint}</span>
				</p>
			) : null}
		</div>
	);
}

export type DiagramProps = Omit<
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
	Regions, edges, nodes and labels in the data's own coordinate space, plus its label and
	description.
	*/
	data: DiagramData;
	/**
	Floor for the scale: below `width × minScale` px the host scrolls sideways (the site uses
	0.58–0.6). 0 = pure scaling.
	*/
	minScale?: number;
	/**
	Play the entrance when the diagram scrolls into view. Default true.
	*/
	reveal?: boolean;
	/**
	Run a pulse along every accent edge while the diagram is on screen. Default true; never under
	reduced motion.
	*/
	pulses?: boolean;
};

/**
The site's data-driven diagram: regions, edges with arrowheads, glass nodes, labels and travelling
pulses.
*/
export function Diagram({
	ref,
	data,
	minScale = 0,
	reveal = true,
	pulses = true,
	...rest
}: DiagramProps & { readonly ref?: React.Ref<HTMLDivElement> }) {
	const accentEdges = pulses
		? data.edges.filter((edge) => edge.tone === "accent")
		: [];
	/* eslint-disable @eslint-react/no-array-index-key -- The data's marks have no ids, so their places in the data are their keys. */
	return (
		<DiagramHost
			ref={ref}
			label={data.label}
			description={data.description}
			width={data.width}
			height={data.height}
			minScale={minScale}
			reveal={reveal}
			data-diagram={data.id}
			{...rest}
		>
			{data.regions?.map((region, index) => (
				<DgRegion key={index} region={region} i={index} />
			))}
			{data.edges.map((edge, index) => (
				<DgEdge
					key={index}
					points={edge.points}
					dashed={edge.dashed}
					tone={edge.tone}
					end={edge.arrow === false ? "none" : "arrow"}
					i={index}
				/>
			))}
			{data.nodes.map((node, index) => (
				<DgNode
					key={index}
					x={node.x}
					y={node.y}
					w={node.w}
					h={node.h}
					shape={node.shape}
					lines={node.lines.map((line) => toRuns(line))}
					tone={node.tone}
					i={index}
				/>
			))}
			{data.labels?.map((label, index) => (
				<DgLabel key={index} label={label} i={index} />
			))}
			{accentEdges.length > 0 ? (
				<g className="gl-dg-pulses" aria-hidden="true">
					{accentEdges.map((edge, index) => (
						<DgPulse key={index} points={edge.points} />
					))}
				</g>
			) : null}
		</DiagramHost>
	);
	/* eslint-enable @eslint-react/no-array-index-key */
}
