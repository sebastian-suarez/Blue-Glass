/**
The layout helpers the reference previews share, ported exactly, so a story can carry a
preview section's content over unchanged. Each preview.html defines them under minified names;
the frame and the section grid come from the decorator in .storybook/frame.tsx.
*/
import type { CSSProperties, ReactNode } from "react";
import { FrameField } from "../../.storybook/frame-field.tsx";

type Children = { readonly children?: ReactNode };

/**
A column: a grid with a 12px gap.
*/
export function Stack({
	children,
	gap = 12,
	style,
}: Children & {
	readonly gap?: CSSProperties["gap"];
	readonly style?: CSSProperties;
}) {
	return (
		<div style={{ display: "grid", gap, minWidth: 0, ...style }}>
			{children}
		</div>
	);
}

/**
A wrapping row, centred on the cross axis.
*/
export function Row({
	children,
	gap = 12,
	align = "center",
	wrap = true,
	style,
}: Children & {
	readonly gap?: CSSProperties["gap"];
	readonly align?: CSSProperties["alignItems"];
	readonly wrap?: boolean;
	readonly style?: CSSProperties;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: wrap ? "wrap" : "nowrap",
				alignItems: align,
				gap,
				minWidth: 0,
				...style,
			}}
		>
			{children}
		</div>
	);
}

/**
Equal tiles that fill the row: as many columns of at least `min` pixels as fit.
*/
export function Tiles({
	children,
	min = 180,
	gap = 16,
}: Children & {
	readonly min?: number;
	readonly gap?: CSSProperties["gap"];
}) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
				gap,
				minWidth: 0,
			}}
		>
			{children}
		</div>
	);
}

/**
The muted 12px caption under a specimen.
*/
export function Caption({ children }: Children) {
	return (
		<span
			style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-muted)" }}
		>
			{children}
		</span>
	);
}

/**
A specimen over its caption, in a cell at least 46px tall.
*/
export function Labelled({
	label,
	children,
	minHeight = 46,
}: Children & {
	readonly label?: ReactNode;
	readonly minHeight?: CSSProperties["minHeight"];
}) {
	return (
		<div
			style={{ display: "grid", gap: 8, justifyItems: "start", minWidth: 0 }}
		>
			<div
				style={{
					minHeight,
					display: "flex",
					alignItems: "center",
					gap: 12,
					flexWrap: "wrap",
				}}
			>
				{children}
			</div>
			<Caption>{label}</Caption>
		</div>
	);
}

/**
A fixed-height well of canvas with its own LightField, for overlays, bars and anything
positioned: the transform makes it the containing block of fixed descendants.
*/
export function Stage({
	children,
	height = 300,
	field = true,
	style,
}: Children & {
	readonly height?: CSSProperties["height"];
	readonly field?: boolean;
	readonly style?: CSSProperties;
}) {
	return (
		<div
			style={{
				position: "relative",
				height,
				transform: "translateZ(0)",
				overflow: "hidden",
				isolation: "isolate",
				borderRadius: "var(--radius-pane)",
				background: "var(--color-canvas)",
				border: "1px solid var(--color-line)",
				...style,
			}}
		>
			{field ? <FrameField /> : null}
			{children}
		</div>
	);
}
