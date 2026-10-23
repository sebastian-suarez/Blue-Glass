"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";

export type CardProps = React.HTMLAttributes<HTMLElement> & {
	variant?: "glass" | "outlined" | "inset";
	component?: React.ElementType;
	children?: React.ReactNode;
};

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
	title?: React.ReactNode;
	subheader?: React.ReactNode;
	avatar?: React.ReactNode;
	action?: React.ReactNode;
	headingLevel?: 2 | 3 | 4 | 5 | 6;
};

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
	component?: React.ElementType;
	children?: React.ReactNode;
};

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
	image?: string;
	alt?: string;
	height?: number | string;
	disablePadding?: boolean;
	component?: React.ElementType;
	children?: React.ReactNode;
};

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
	chips?: React.ReactNode[];
	chipsLabel?: string;
	children?: React.ReactNode;
};

function isTextChip(chip: React.ReactNode): chip is string | number {
	return typeof chip === "string" || typeof chip === "number";
}

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
	href?: string;
	target?: string;
	rel?: string;
	disabled?: boolean;
	children?: React.ReactNode;
};

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
