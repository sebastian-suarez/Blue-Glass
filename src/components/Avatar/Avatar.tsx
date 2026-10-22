"use client";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { Icon } from "../Icon/index.js";

export type AvatarSize = "xs" | "sm" | "md" | "lg";
export type AvatarVariant = "circle" | "tile";

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement> & {
	/**
	Image URL. While it loads the orb shows through; if it fails, the avatar falls back to children, then initials from alt, then the user glyph.
	*/
	src?: string;
	/**
	Responsive image candidates, as on <img>.
	*/
	srcSet?: string;
	/**
	Sizes for srcSet, as on <img>.
	*/
	sizes?: string;
	/**
	The person's or the company's name: the image's alt text, the source of the initials, and the name read for a lettered avatar.
	*/
	alt?: string;
	/**
	circle: initials on the site's orb gradient (default). tile: the monogram glass tile (.signature).
	*/
	variant?: AvatarVariant;
	/**
	xs 24px · sm 32px · md 40px, the signature tile's size (default) · lg 56px.
	*/
	size?: AvatarSize;
	/**
	Which of the site's three orbs the circle uses (.tab-orb, .orb-1, .orb-2). Default: picked from alt, so a name always gets the same orb.
	*/
	orb?: 0 | 1 | 2;
	/**
	Extra attributes for the <img>, e.g. loading="lazy" or referrerPolicy.
	*/
	imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
	/**
	Render as another element. Default span, so an avatar can sit inside a button or a chip.
	*/
	component?: React.ElementType;
	/**
	Initials or an icon, shown when there is no image.
	*/
	children?: React.ReactNode;
};

export type AvatarGroupProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	Most avatars shown, counting the "+N" one. Default 5.
	*/
	max?: number;
	/**
	The real total when you pass only some of the avatars; the "+N" counts from it.
	*/
	total?: number;
	/**
	Size of every avatar in the group (an avatar's own size wins).
	*/
	size?: AvatarSize;
	/**
	Shape of every avatar in the group (an avatar's own variant wins).
	*/
	variant?: AvatarVariant;
	/**
	Overlap: md, a fifth of the avatar (default), or sm, tighter.
	*/
	spacing?: "md" | "sm";
	/**
	Render the surplus yourself, e.g. a link to the full list.
	*/
	renderSurplus?: (surplus: number) => React.ReactNode;
	/**
	Render as another element. Default div.
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

type GroupContextValue = {
	size?: AvatarSize;
	variant?: AvatarVariant;
};

const AvatarGroupContext = React.createContext<GroupContextValue | null>(null);

/**
Base UI's loading status of the photo, with the source it was reported for: only a failure
matters here.
*/
type ImageReport = {
	source: string;
	status: "idle" | "loading" | "loaded" | "error";
};

// Children that show nothing, as in the reference.
const nothing: ReadonlySet<unknown> = new Set([undefined, null, false, ""]);

// Lowercase letters on a tile are a monogram, set like the header's "ss" (.signature).
const monogramPattern = /^\p{Ll}{1,3}$/u;

/**
First letters of the first and last words: "Sebastian Suarez" → "SS", "EPAM" → "E".
*/
function initialsOf(name: string): string {
	const words = name
		.trim()
		.split(/\s+/u)
		.filter((word) => word !== "");
	const last = words.length > 1 ? words.at(-1) : undefined;
	// Spread by code point, so an initial is never half of a surrogate pair.
	return [words.at(0), last]
		.map((word) => (word === undefined ? "" : [...word][0]))
		.join("")
		.toUpperCase();
}

/**
The orb a name gets, the same one every time.
*/
function orbFor(name: string): 0 | 1 | 2 {
	let hash = 0;
	for (let index = 0; index < name.length; index += 1) {
		// eslint-disable-next-line unicorn/prefer-code-point -- The reference sums UTF-16 code units; code points would give some names another orb.
		hash = (hash + name.charCodeAt(index)) % 3;
	}

	return hash as 0 | 1 | 2;
}

/**
A person or a company: initials on one of the site's orbs, the monogram glass tile, or a photo.
*/
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
	// A report about another source is stale: a new photo starts over.
	const source = `${src ?? ""} ${srcSet ?? ""}`;
	const [report, setReport] = React.useState<ImageReport>();
	const status = report?.source === source ? report.status : "idle";
	// The photo stays until it fails, as in the reference: the orb shows through while it loads.
	const showImage = Boolean(src || srcSet) && status !== "error";

	let content: React.ReactNode;
	if (showImage) {
		content = (
			<BaseAvatar.Image
				className="gl-avatar-img"
				src={src}
				srcSet={srcSet}
				sizes={sizes}
				alt={alt ?? ""}
				{...imgProps}
				// Rendered in place, so the photo is in the server HTML and loads before hydration,
				// and loading="lazy" works; a failed one goes, for the fallbacks below.
				keepMounted
				// Base UI hides a loading image from assistive tech so a fallback beside it can take
				// the name. None renders beside it here, so its alt names the avatar throughout, as
				// in the reference.
				aria-hidden={imgProps?.["aria-hidden"]}
				onLoadingStatusChange={(next) => {
					setReport({ source, status: next });
				}}
			/>
		);
	} else if (nothing.has(children)) {
		const initials = alt ? initialsOf(alt) : "";
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
	// A lettered avatar with a name reads as one image named after the person, not as "S S".
	const isNamed = Boolean(alt) && !showImage;
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
				showImage && "gl-avatar-has-img",
				className,
			)}
			{...rest}
		>
			{content}
		</BaseAvatar.Root>
	);
}

/**
A row of overlapping avatars, each cut out of the canvas by a 2px ring, with the rest counted as "+N".
*/
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
	// MUI's arithmetic: never replace a single avatar with "+1".
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
			// On top of the last avatar, so the count is never covered.
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
					// The first avatar sits on top; reading order stays first to last.
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
