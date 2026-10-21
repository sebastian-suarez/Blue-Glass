import type { Decorator } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { FrameField } from "./frame-field.tsx";

/**
What a story sets as `parameters.frame`: the reference frame's props. `field` (default true)
draws the LightField behind, which LightField's own stories turn off; `width` caps and centres
the content; `minHeight` defaults to 100vh on the canvas and to the content's height on docs
pages. `false` drops the frame, for stories that bring their own page, like the site's sections.
*/
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

/**
The frame of every reference preview (the `C` helper in each preview.html): the canvas colour,
28px 28px 36px of padding, a compact LightField behind, and the sections in a grid 32px apart.
*/
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

/**
Renders each story as one section of its preview: inside the frame, in the section's grid (the
`g` helper's, 14px apart). The section's heading and note are the story's name and description.
*/
export const withFrame: Decorator = (Story, context) => {
	const frame = (context.parameters.frame ?? {}) as FrameParameters;
	if (frame === false) {
		return <Story />;
	}

	// Docs pages stack their stories, so the 100vh floor holds only on the canvas.
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
