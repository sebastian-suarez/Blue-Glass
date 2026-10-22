/**
What the five section previews (design-system/sections/<Name>/preview.html) share, ported
exactly: the page each section brings instead of the frame, the site's content column and the
site owner's details. Section stories set `parameters.frame: false` and render `SectionPage`.
*/
import type { CSSProperties, ReactNode } from "react";
import {
	LightField,
	type LightFieldProps,
} from "../../src/components/LightField/index.ts";

/**
The site's content column: `--size-wrap` wide, or 90% of a narrower window, centred.
*/
export const wrap: CSSProperties = {
	width: "min(var(--size-wrap), 90%)",
	marginInline: "auto",
};

/**
The site owner, as the previews name him.
*/
export const profile = {
	name: "Sebastian Suarez",
	role: "Backend lead and architect",
	email: "contact@sebastiansuarez.dev",
	location: "Medellín, Colombia",
	fullName: "Sebastian Suarez Valencia",
} as const;

/**
A section's page: the canvas with its own LightField behind, the preview's note at the top,
then the section.
*/
export function SectionPage({
	field = "top",
	note,
	children,
}: {
	readonly field?: LightFieldProps["variant"];
	readonly note: ReactNode;
	readonly children?: ReactNode;
}) {
	return (
		<div
			style={{
				position: "relative",
				isolation: "isolate",
				overflow: "clip",
				minHeight: "100vh",
				background: "var(--color-canvas)",
				paddingBottom: 40,
			}}
		>
			<LightField variant={field} />
			<p
				className="text-micro"
				style={{
					margin: 0,
					padding: "14px 5% 0",
					color: "var(--color-muted)",
				}}
			>
				{note}
			</p>
			{children}
		</div>
	);
}
