import type { CSSProperties, ReactNode } from "react";
import {
	LightField,
	type LightFieldProps,
} from "../../src/components/LightField/index.ts";

export const wrap: CSSProperties = {
	width: "min(var(--size-wrap), 90%)",
	marginInline: "auto",
};

export const profile = {
	name: "Sebastian Suarez",
	role: "Backend lead and architect",
	email: "contact@sebastiansuarez.dev",
	location: "Medellín, Colombia",
	fullName: "Sebastian Suarez Valencia",
} as const;

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
