import type { CSSProperties, ReactNode } from "react";
import { FrameField } from "../../.storybook/frame-field.tsx";

type Children = { readonly children?: ReactNode };

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

export function Caption({ children }: Children) {
	return (
		<span
			style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-muted)" }}
		>
			{children}
		</span>
	);
}

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
