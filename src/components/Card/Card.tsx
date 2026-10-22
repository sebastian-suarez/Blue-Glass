"use client";
// A client module because CardActionArea handles its own clicks, which a server component
// can't hand to the DOM.
import * as React from "react";
import { cx } from "../../internal/cx.js";

export type CardProps = React.HTMLAttributes<HTMLElement> & {
	/**
	`glass`: the site's project card (.card.glass-panel), the default.
	`outlined`: a hairline and no fill, for grouping without depth.
	`inset`: a glass-inset well, for a card that sits inside a glass panel.
	*/
	variant?: "glass" | "outlined" | "inset";
	/**
	The element to render. The site's cards are "article". Default "div".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

/**
The site's project card (.card.glass-panel): a glass panel stacking header, media, content and actions 26px apart.
*/
export function Card({
	variant = "glass",
	component: Component = "div",
	className,
	children,
	ref,
	...rest
}: CardProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-card",
				`gl-card-${variant}`,
				variant === "glass" && "gl-glass",
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}

export type CardHeaderProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"title"
> & {
	/**
	The card title: 30px, weight 400, -0.04em (.card-head h3); 26px under 700px.
	*/
	title?: React.ReactNode;
	/**
	One or two sentences under the title, in color-muted at 15px (.card-head p).
	*/
	subheader?: React.ReactNode;
	/**
	Something before the text: an orb, a mark or an icon.
	*/
	avatar?: React.ReactNode;
	/**
	Something at the end of the row: a status or an icon button.
	*/
	action?: React.ReactNode;
	/**
	Heading level of the title. Default 3, as on the site.
	*/
	headingLevel?: 2 | 3 | 4 | 5 | 6;
};

/**
The card's title block (.card-head): the title, then a muted description.
*/
export function CardHeader({
	title,
	subheader,
	avatar,
	action,
	headingLevel = 3,
	className,
	children,
	ref,
	...rest
}: CardHeaderProps & { ref?: React.Ref<HTMLDivElement> | undefined }) {
	const Heading = `h${headingLevel}` as const;
	const hasAvatar = Boolean(avatar);
	const hasAction = Boolean(action);
	return (
		<div ref={ref} className={cx("gl-card-header", className)} {...rest}>
			{/* As in the reference, an empty avatar or action (0, "") draws no slot. */}
			{hasAvatar ? <div className="gl-card-header-avatar">{avatar}</div> : null}
			<div className="gl-card-header-text">
				{title === undefined || title === null ? null : (
					<Heading className="gl-card-title">{title}</Heading>
				)}
				{subheader === undefined || subheader === null ? null : (
					<p className="gl-card-subheader">{subheader}</p>
				)}
				{children}
			</div>
			{hasAction ? <div className="gl-card-header-action">{action}</div> : null}
		</div>
	);
}

export type CardContentProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	The element to render. Default "div".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

/**
Body copy for a card: 15px in color-muted, the site's card description, with children spaced 12px apart.
*/
export function CardContent({
	component: Component = "div",
	className,
	children,
	ref,
	...rest
}: CardContentProps & { ref?: React.Ref<HTMLDivElement> | undefined }) {
	return (
		<Component ref={ref} className={cx("gl-card-content", className)} {...rest}>
			{children}
		</Component>
	);
}

export type CardMediaProps = React.HTMLAttributes<HTMLElement> & {
	/**
	An image URL, rendered as an <img> filling the well. Leave it out to put a diagram or SVG in children.
	*/
	image?: string;
	/**
	Alternative text for `image`. Use "" only when the image repeats nearby text.
	*/
	alt?: string;
	/**
	Minimum height of the well, px or any CSS length.
	*/
	height?: number | string;
	/**
	Let the content run to the well's edge (the default pads it 22px, 16px under 700px).
	*/
	disablePadding?: boolean;
	/**
	The element to render, e.g. "figure". Default "div".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

/**
An inset well for the card's figure (.project-figure): glass-inset, a light edge, radius-well.
*/
export function CardMedia({
	image,
	alt,
	height,
	disablePadding = false,
	component: Component = "div",
	className,
	style,
	children,
	ref,
	...rest
}: CardMediaProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const hasImage = image !== undefined && image !== "";
	const wellStyle: React.CSSProperties =
		height === undefined
			? { ...style }
			: {
					...style,
					minHeight: typeof height === "number" ? `${height}px` : height,
				};
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-card-media",
				(disablePadding || hasImage) && "gl-card-media-flush",
				className,
			)}
			style={wellStyle}
			{...rest}
		>
			{hasImage ? (
				<img className="gl-card-media-img" src={image} alt={alt ?? ""} />
			) : null}
			{children}
		</Component>
	);
}

export type CardActionsProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	Tags on the left. Strings render as the site's chips (.chip); elements render as given.
	*/
	chips?: React.ReactNode[];
	/**
	Accessible name of the chip list. Default "Tags".
	*/
	chipsLabel?: string;
	/**
	The links or buttons on the right: use Button variant="text" with an arrow-ne end icon for "Repository ↗".
	*/
	children?: React.ReactNode;
};

/**
Whether a chip is text, which renders as the site's chip, rather than an element of the caller's.
*/
function isTextChip(chip: React.ReactNode): chip is string | number {
	return typeof chip === "string" || typeof chip === "number";
}

/**
The card's footer (.card-foot): chips on the left, link-weight actions on the right, wrapping on small screens.
*/
export function CardActions({
	chips,
	chipsLabel = "Tags",
	className,
	children,
	ref,
	...rest
}: CardActionsProps & { ref?: React.Ref<HTMLDivElement> | undefined }) {
	const hasChips = Array.isArray(chips) && chips.length > 0;
	// eslint-disable-next-line @eslint-react/no-children-to-array -- The links' box renders only when a link does, as in the reference.
	const hasLinks = React.Children.toArray(children).length > 0;
	return (
		<div ref={ref} className={cx("gl-card-actions", className)} {...rest}>
			{hasChips ? (
				<ul className="gl-card-chips" aria-label={chipsLabel}>
					{chips.map((chip, index) => (
						<li
							// Chips have no ids of their own, and the list is rendered as given.
							// eslint-disable-next-line @eslint-react/no-array-index-key
							key={isTextChip(chip) ? `${chip}-${index}` : index}
							className={
								isTextChip(chip) ? "gl-card-chip" : "gl-card-chips-item"
							}
						>
							{chip}
						</li>
					))}
				</ul>
			) : null}
			{hasLinks ? <div className="gl-card-links">{children}</div> : null}
		</div>
	);
}

export type CardActionAreaProps = React.HTMLAttributes<HTMLElement> & {
	/**
	Render a link to this URL; without it, a button (give it onClick).
	*/
	href?: string;
	target?: string;
	rel?: string;
	/**
	Not interactive: the card dims and ignores presses.
	*/
	disabled?: boolean;
	children?: React.ReactNode;
};

/**
Makes the whole card one target: wrap the title in it and its hit area and
focus ring stretch over the card. Links in CardActions stay separately clickable.
*/
export function CardActionArea({
	href,
	target,
	rel,
	disabled = false,
	className,
	children,
	onClick,
	ref,
	...rest
}: CardActionAreaProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const classes = cx("gl-card-action-area", className);
	if (href !== undefined) {
		// With no href an a has no role, so a disabled link keeps role="link".
		return (
			<a
				ref={ref as React.Ref<HTMLAnchorElement>}
				className={classes}
				href={disabled ? undefined : href}
				target={target}
				rel={rel}
				aria-disabled={disabled || undefined}
				role={disabled ? "link" : undefined}
				onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
					if (disabled) {
						event.preventDefault();
						return;
					}

					onClick?.(event);
				}}
				{...rest}
			>
				{children}
			</a>
		);
	}

	return (
		<button
			ref={ref as React.Ref<HTMLButtonElement>}
			type="button"
			className={classes}
			disabled={disabled}
			onClick={onClick}
			{...rest}
		>
			{children}
		</button>
	);
}
