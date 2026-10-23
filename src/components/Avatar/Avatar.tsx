"use client";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { Icon } from "../Icon/index.js";

export type AvatarSize = "xs" | "sm" | "md" | "lg";
export type AvatarVariant = "circle" | "tile";

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement> & {
	src?: string;
	srcSet?: string;
	sizes?: string;
	alt?: string;
	variant?: AvatarVariant;
	size?: AvatarSize;
	orb?: 0 | 1 | 2;
	imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
	component?: React.ElementType;
	children?: React.ReactNode;
};

export type AvatarGroupProps = React.HTMLAttributes<HTMLDivElement> & {
	max?: number;
	total?: number;
	size?: AvatarSize;
	variant?: AvatarVariant;
	spacing?: "md" | "sm";
	renderSurplus?: (surplus: number) => React.ReactNode;
	component?: React.ElementType;
	children?: React.ReactNode;
};

type GroupContextValue = {
	size?: AvatarSize;
	variant?: AvatarVariant;
};

const AvatarGroupContext = React.createContext<GroupContextValue | null>(null);

type ImageReport = {
	source: string;
	status: "idle" | "loading" | "loaded" | "error";
};

const nothing: ReadonlySet<unknown> = new Set([undefined, null, false, ""]);

const monogramPattern = /^\p{Lowercase_Letter}{1,3}$/u;

function initialsOf(name: string): string {
	const words = name
		.trim()
		.split(/\s+/u)
		.filter((word) => word !== "");
	const last = words.length > 1 ? words.at(-1) : undefined;
	return [words.at(0), last]
		.map((word) => (word === undefined ? "" : [...word][0]))
		.join("")
		.toUpperCase();
}

function orbFor(name: string): 0 | 1 | 2 {
	let hash = 0;
	for (let index = 0; index < name.length; index += 1) {
		// eslint-disable-next-line unicorn/prefer-code-point -- The reference sums UTF-16 code units; code points would give some names another orb.
		hash = (hash + name.charCodeAt(index)) % 3;
	}

	return hash as 0 | 1 | 2;
}

export function Avatar({
	src,
	srcSet,
	sizes,
	alt,
	variant: variantProp,
	size: sizeProp,
	orb,
	imgProps,
	component: Component = "span",
	className,
	children,
	ref,
	...rest
}: AvatarProps & { ref?: React.Ref<HTMLSpanElement> }) {
	const group = React.use(AvatarGroupContext);
	const variant = variantProp ?? group?.variant ?? "circle";
	const size = sizeProp ?? group?.size ?? "md";
	const source = `${src ?? ""} ${srcSet ?? ""}`;
	const [report, setReport] = React.useState<ImageReport>();
	const status = report?.source === source ? report.status : "idle";
	const isImageShown = (Boolean(src) || Boolean(srcSet)) && status !== "error";

	let content: React.ReactNode;
	if (isImageShown) {
		content = (
			<BaseAvatar.Image
				className="gl-avatar-img"
				src={src}
				srcSet={srcSet}
				sizes={sizes}
				alt={alt ?? ""}
				{...imgProps}
				keepMounted
				aria-hidden={imgProps?.["aria-hidden"]}
				onLoadingStatusChange={(next) => {
					setReport({ source, status: next });
				}}
			/>
		);
	} else if (nothing.has(children)) {
		const initials =
			typeof alt === "string" && alt !== "" ? initialsOf(alt) : "";
		content =
			initials === "" ? (
				<Icon name="user" className="gl-avatar-fallback" />
			) : (
				initials
			);
	} else {
		content = children;
	}

	const orbIndex =
		orb ?? orbFor(alt ?? (typeof children === "string" ? children : ""));
	const isMonogram =
		variant === "tile" &&
		typeof content === "string" &&
		monogramPattern.test(content);
	const isNamed = Boolean(alt) && !isImageShown;
	return (
		<BaseAvatar.Root
			ref={ref}
			render={<Component />}
			role={isNamed ? "img" : undefined}
			aria-label={isNamed ? alt : undefined}
			className={cx(
				"gl-avatar",
				`gl-avatar-${variant}`,
				size !== "md" && `gl-avatar-${size}`,
				variant === "circle" && orbIndex > 0 && `gl-avatar-orb-${orbIndex}`,
				isMonogram && "gl-avatar-monogram",
				isImageShown && "gl-avatar-has-img",
				className,
			)}
			{...rest}
		>
			{content}
		</BaseAvatar.Root>
	);
}

export function AvatarGroup({
	max = 5,
	total,
	size,
	variant,
	spacing = "md",
	renderSurplus,
	component: Component = "div",
	className,
	children,
	ref,
	...rest
}: AvatarGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
	// eslint-disable-next-line @eslint-react/no-children-to-array -- The documented group counts its avatars and shows the first.
	const items = React.Children.toArray(children).filter((child) =>
		React.isValidElement(child),
	) as Array<React.ReactElement<{ style?: React.CSSProperties }>>;
	let clampedMax = Math.max(max, 2);
	const totalCount = total ?? items.length;
	if (totalCount === clampedMax) {
		clampedMax += 1;
	}

	clampedMax = Math.min(totalCount + 1, clampedMax);
	const shown = Math.min(items.length, clampedMax - 1);
	const surplus = Math.max(totalCount - clampedMax, totalCount - shown, 0);
	const context = React.useMemo(() => ({ size, variant }), [size, variant]);
	let more: React.ReactNode = null;
	if (surplus > 0) {
		more = renderSurplus ? (
			renderSurplus(surplus)
		) : (
			<Avatar className="gl-avatar-surplus" style={{ zIndex: shown + 2 }}>
				<span aria-hidden="true">+{surplus}</span>
				<span className="gl-sr-only">{`${surplus} more`}</span>
			</Avatar>
		);
	}

	return (
		<AvatarGroupContext value={context}>
			<Component
				ref={ref}
				role="group"
				className={cx(
					"gl-avatar-group",
					spacing === "sm" && "gl-avatar-group-sm",
					className,
				)}
				{...rest}
			>
				{items.slice(0, shown).map((child, index) =>
					// eslint-disable-next-line @eslint-react/no-clone-element -- As above.
					React.cloneElement(child, {
						style: { ...child.props.style, zIndex: shown - index + 1 },
					}),
				)}
				{more}
			</Component>
		</AvatarGroupContext>
	);
}
