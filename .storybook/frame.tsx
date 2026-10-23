import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { FrameField } from "./frame-field.tsx";

export type FrameParameters =
	| false
	| {
			readonly field?: boolean;
			readonly width?: CSSProperties["maxWidth"];
			readonly minHeight?: CSSProperties["minHeight"];
	  };

type FrameProps = Exclude<FrameParameters, false> & {
	readonly children?: ReactNode;
};

export function Frame({
	children,
	field = true,
	width,
	minHeight,
}: FrameProps) {
	return (
		<div
			style={{
				position: "relative",
				isolation: "isolate",
				overflow: "clip",
				minHeight: minHeight ?? "100vh",
				padding: "28px 28px 36px",
				background: "var(--color-canvas)",
			}}
		>
			{field ? <FrameField /> : null}
			<div
				style={{
					display: "grid",
					gap: 32,
					maxWidth: width,
					margin: width === undefined ? undefined : "0 auto",
				}}
			>
				{children}
			</div>
		</div>
	);
}

export const withFrame: Decorator = (Story, context) => {
	const frame = (context.parameters.frame ?? {}) as FrameParameters;
	if (frame === false) {
		return <Story />;
	}

	const minHeight =
		frame.minHeight ?? (context.viewMode === "docs" ? "auto" : undefined);
	return (
		<Frame field={frame.field} width={frame.width} minHeight={minHeight}>
			<section style={{ display: "grid", gap: 14, minWidth: 0 }}>
				<Story />
			</section>
		</Frame>
	);
};
