import type * as React from "react";
import { cx } from "../../internal/cx.js";

type Part =
	| { d: string; fill?: boolean }
	| { c: [number, number, number]; fill?: boolean }
	| { r: [number, number, number, number, number]; fill?: boolean };

const dot = (x: number, y: number, r = 1.15): Part => ({
	c: [x, y, r],
	fill: true,
});

export const GLYPHS: Record<string, Part[]> = {
	"arrow-ne": [{ d: "M6 18 18 6M6 6h12v12" }],
	"arrow-right": [{ d: "M4 12h16M13 5l7 7-7 7" }],
	"arrow-left": [{ d: "M20 12H4M11 5l-7 7 7 7" }],
	"arrow-up": [{ d: "M12 20V4M5 11l7-7 7 7" }],
	"arrow-down": [{ d: "M12 4v16M5 13l7 7 7-7" }],
	"chevron-down": [{ d: "M6 9l6 6 6-6" }],
	"chevron-up": [{ d: "M6 15l6-6 6 6" }],
	"chevron-left": [{ d: "M15 6l-6 6 6 6" }],
	"chevron-right": [{ d: "M9 6l6 6-6 6" }],
	"chevrons-left": [{ d: "M18 6l-6 6 6 6M12 6l-6 6 6 6" }],
	"chevrons-right": [{ d: "M6 6l6 6-6 6M12 6l6 6-6 6" }],
	close: [{ d: "M6 6l12 12M18 6 6 18" }],
	check: [{ d: "M5 12.5l4.5 4.5L19 7.5" }],
	minus: [{ d: "M5 12h14" }],
	plus: [{ d: "M12 5v14M5 12h14" }],
	search: [{ c: [11, 11, 6.5] }, { d: "M16 16l4 4" }],
	menu: [{ d: "M4 7h16M4 12h16M4 17h16" }],
	more: [dot(6, 12), dot(12, 12), dot(18, 12)],
	"more-vertical": [dot(12, 6), dot(12, 12), dot(12, 18)],
	info: [{ c: [12, 12, 9] }, { d: "M12 11v5" }, dot(12, 7.75, 1)],
	warning: [{ d: "M12 4 21 19.5H3Z" }, { d: "M12 10v4" }, dot(12, 16.75, 1)],
	error: [{ c: [12, 12, 9] }, { d: "M12 7.5v5.5" }, dot(12, 16.25, 1)],
	success: [{ c: [12, 12, 9] }, { d: "M8 12.5l2.75 2.75L16 10" }],
	star: [
		{
			d: "M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z",
		},
	],
	home: [{ d: "M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4Z" }],
	user: [
		{ c: [12, 8.5, 3.5] },
		{ d: "M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" },
	],
	users: [
		{ c: [9, 9, 3] },
		{ d: "M3.5 19c.6-3 2.7-4.6 5.5-4.6s4.9 1.6 5.5 4.6" },
		{ d: "M15.5 6.2a3 3 0 0 1 0 5.6M17 14.6c2 .5 3.2 2 3.6 4.4" },
	],
	sliders: [
		{ d: "M4 7h10M18 7h2M4 17h4M12 17h8" },
		{ c: [16, 7, 2] },
		{ c: [10, 17, 2] },
	],
	mail: [{ r: [3, 5.5, 18, 13, 2] }, { d: "M3.5 7l8.5 6 8.5-6" }],
	bell: [{ d: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15Z" }, { d: "M10 20.5h4" }],
	edit: [{ d: "M4 20h4L19 9l-4-4L4 16Z" }, { d: "M13.5 6.5l4 4" }],
	trash: [{ d: "M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" }],
	copy: [
		{ r: [8, 8, 12, 12, 2] },
		{
			d: "M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8",
		},
	],
	link: [
		{
			d: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
		},
	],
	download: [{ d: "M12 4v11M7 10.5l5 5 5-5M5 20h14" }],
	upload: [{ d: "M12 16V5M7 9.5l5-5 5 5M5 20h14" }],
	filter: [{ d: "M4 6h16M7 12h10M10 18h4" }],
	sort: [{ d: "M8 4v16M4.5 7.5 8 4l3.5 3.5M16 20V4M12.5 16.5 16 20l3.5-3.5" }],
	calendar: [{ r: [4, 5.5, 16, 14.5, 2] }, { d: "M4 10h16M8 3.5v4M16 3.5v4" }],
	clock: [{ c: [12, 12, 8.5] }, { d: "M12 7.5V12l3 2" }],
	folder: [
		{
			d: "M3.5 7.5A1.5 1.5 0 0 1 5 6h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18Z",
		},
	],
	file: [{ d: "M6.5 3.5h7L18 8v12.5H6.5Z" }, { d: "M13.5 3.5V8H18" }],
	server: [
		{ r: [4, 4.5, 16, 6, 1.5] },
		{ r: [4, 13.5, 16, 6, 1.5] },
		dot(7.5, 7.5, 1),
		dot(7.5, 16.5, 1),
	],
	code: [{ d: "M9 7l-5 5 5 5M15 7l5 5-5 5" }],
	share: [
		{ c: [6, 12, 2.5] },
		{ c: [18, 5.5, 2.5] },
		{ c: [18, 18.5, 2.5] },
		{ d: "M8.3 10.8l7.4-4.1M8.3 13.2l7.4 4.1" },
	],
	eye: [
		{
			d: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z",
		},
		{ c: [12, 12, 2.75] },
	],
	heart: [
		{
			d: "M12 19.5s-7.5-4.6-7.5-9.6A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3c0 5-7.5 9.6-7.5 9.6Z",
		},
	],
	refresh: [{ d: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5V9H15" }],
	globe: [
		{ c: [12, 12, 9] },
		{
			d: "M3 12h18M12 3c2.5 2.6 3.75 5.6 3.75 9S14.5 18.4 12 21c-2.5-2.6-3.75-5.6-3.75-9S9.5 5.6 12 3Z",
		},
	],
	send: [{ d: "M4 12 20 4l-5 16-3.5-6.5Z" }, { d: "M11.5 13.5 20 4" }],
	image: [
		{ r: [3.5, 5, 17, 14, 2] },
		{ c: [9, 10, 1.75] },
		{ d: "M4 17l5-4.5 4 3.5 3-2.5 4.5 3.5" },
	],
	chart: [{ d: "M4 20h16M6.5 20v-6M11 20V8M15.5 20v-9M20 20V5" }],
	layers: [{ d: "M12 4 3 9l9 5 9-5Z" }, { d: "M3 14l9 5 9-5" }],
	grip: [
		dot(9, 7),
		dot(15, 7),
		dot(9, 12),
		dot(15, 12),
		dot(9, 17),
		dot(15, 17),
	],
};

export type IconName = keyof typeof GLYPHS;
export const iconNames: IconName[] = Object.keys(GLYPHS);

function keyOf(part: Part): string {
	if ("d" in part) {
		return `d ${part.d}`;
	}

	return "c" in part ? `c ${part.c.join(" ")}` : `r ${part.r.join(" ")}`;
}

function renderParts(parts: Part[], isFilled: boolean): React.ReactNode[] {
	return parts.map((part) => {
		const isDot = part.fill === true;
		const paint =
			isDot || isFilled
				? { fill: "currentColor", stroke: isDot ? "none" : "currentColor" }
				: {};
		const key = keyOf(part);
		if ("d" in part) {
			return <path key={key} d={part.d} {...paint} />;
		}

		if ("c" in part) {
			const [centerX, centerY, radius] = part.c;
			return (
				<circle key={key} cx={centerX} cy={centerY} r={radius} {...paint} />
			);
		}

		const [x, y, width, height, cornerRadius] = part.r;
		return (
			<rect
				key={key}
				x={x}
				y={y}
				width={width}
				height={height}
				rx={cornerRadius}
				{...paint}
			/>
		);
	});
}

export type SvgIconProps = React.SVGProps<SVGSVGElement> & {
	size?: number | string;
	title?: string;
	strokeWidth?: number;
	viewBox?: string;
	children?: React.ReactNode;
};

export function SvgIcon({
	size = 18,
	title,
	strokeWidth = 1.5,
	viewBox = "0 0 24 24",
	className,
	children,
	ref,
	...rest
}: SvgIconProps & { ref?: React.Ref<SVGSVGElement> }) {
	const isNamed = title !== undefined && title !== "";
	return (
		<svg
			ref={ref}
			className={cx("gl-icon", className)}
			viewBox={viewBox}
			width={size}
			height={size}
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden={isNamed ? undefined : true}
			role={isNamed ? "img" : undefined}
			focusable="false"
			{...rest}
		>
			{isNamed ? <title>{title}</title> : null}
			{children}
		</svg>
	);
}

export type IconProps = Omit<SvgIconProps, "children"> & {
	name: IconName;
	filled?: boolean;
};

export function Icon({
	name,
	filled = false,
	ref,
	...rest
}: IconProps & { ref?: React.Ref<SVGSVGElement> }) {
	const parts = Object.hasOwn(GLYPHS, name) ? GLYPHS[name] : undefined;
	return (
		<SvgIcon ref={ref} data-icon={name} {...rest}>
			{parts === undefined ? null : renderParts(parts, filled)}
		</SvgIcon>
	);
}
