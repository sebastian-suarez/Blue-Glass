"use client";
// The chip attaches its own handlers (keys, the link's disabled guard, the close button).
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { Icon } from "../Icon/index.js";

export type ChipTone =
	"default" | "accent" | "danger" | "warning" | "success" | "info";

export type ChipProps = Omit<React.HTMLAttributes<HTMLElement>, "onClick"> & {
	/**
	The text. Keep it to a word or two.
	*/
	label: React.ReactNode;
	/**
	chip: the site's stack tag (.chip, default). plate: the employer plate (.plate), larger and lifted.
	*/
	variant?: "chip" | "plate";
	/**
	md (default) or sm (.chip-sm).
	*/
	size?: "sm" | "md";
	/**
	A status or accent fill: the *-soft ground with status text. Pair a status with a word or icon.
	*/
	tone?: ChipTone;
	/**
	An icon before the label (14px; 12px at sm).
	*/
	icon?: React.ReactNode;
	/**
	An Avatar before the label, shrunk to 20px. Leave its alt off when the label already names it.
	*/
	avatar?: React.ReactNode;
	/**
	Makes the chip a button.
	*/
	onClick?: React.MouseEventHandler<HTMLElement>;
	/**
	Hover and press styling without onClick, e.g. inside your own button.
	*/
	clickable?: boolean;
	/**
	Makes the chip a link.
	*/
	href?: string;
	target?: string;
	rel?: string;
	/**
	Adds a trailing close button; Backspace or Delete on the chip calls it too.
	*/
	onDelete?: (event: React.SyntheticEvent) => void;
	/**
	The close button's name. Default "Remove {label}".
	*/
	deleteLabel?: string;
	/**
	Replace the close glyph.
	*/
	deleteIcon?: React.ReactNode;
	/**
	Pressed: ink fill with on-ink text. Sets aria-pressed on a button chip (aria-current on a link).
	*/
	selected?: boolean;
	disabled?: boolean;
	/**
	Element for a static chip. Default span; use "li" inside a list of chips.
	*/
	component?: React.ElementType;
};

/**
What the button or link of an interactive chip takes besides its own attributes.
*/
type ActionProps = Omit<React.HTMLAttributes<HTMLElement>, "onClick"> & {
	ref?: React.Ref<HTMLElement>;
};

/**
A compact tag: the site's stack chip, the employer plate, a filter you toggle or a value you remove.
*/
export function Chip({
	label,
	variant = "chip",
	size = "md",
	tone = "default",
	icon,
	avatar,
	onClick,
	clickable = false,
	href,
	target,
	rel,
	onDelete,
	deleteLabel,
	deleteIcon,
	selected,
	disabled = false,
	component: Root = "span",
	className,
	onKeyDown,
	ref,
	...rest
}: ChipProps & { ref?: React.Ref<HTMLElement> }) {
	// Only onClick and href make the chip a button or a link. clickable alone styles it, so it can
	// sit inside your own button (the reference rendered a button, a defect).
	const isInteractive = Boolean(onClick) || href !== undefined;
	const isDeletable = typeof onDelete === "function";
	const name =
		typeof label === "string" || typeof label === "number" ? String(label) : "";

	let start: React.ReactNode = null;
	if (avatar) {
		start = <span className="gl-chip-avatar">{avatar}</span>;
	} else if (icon) {
		start = <span className="gl-chip-icon">{icon}</span>;
	}

	const inner = (
		<>
			{start}
			<span className="gl-chip-label">{label}</span>
		</>
	);

	const classes = cx(
		"gl-chip",
		variant === "plate" && "gl-chip-plate",
		size === "sm" && "gl-chip-sm",
		tone !== "default" && `gl-chip-${tone}`,
		tone !== "default" && "gl-chip-toned",
		(isInteractive || clickable) && "gl-chip-clickable",
		isDeletable && "gl-chip-deletable",
		isInteractive && isDeletable && "gl-chip-split",
		selected && "gl-chip-selected",
		disabled && "gl-chip-disabled",
		className,
	);

	// Backspace or Delete on the chip removes it (MUI); Escape lets go of focus.
	const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
		onKeyDown?.(event);
		if (event.defaultPrevented || disabled) {
			return;
		}

		if (isDeletable && (event.key === "Backspace" || event.key === "Delete")) {
			event.preventDefault();
			onDelete?.(event);
		} else if (event.key === "Escape") {
			(event.target as HTMLElement).blur();
		}
	};

	const action = (
		{ ref: actionRef, ...attributes }: ActionProps,
		content: React.ReactNode,
	) => {
		if (href !== undefined) {
			return (
				<a
					ref={actionRef as React.Ref<HTMLAnchorElement> | undefined}
					href={disabled ? undefined : href}
					target={target}
					rel={rel}
					aria-current={selected ? "page" : undefined}
					aria-disabled={disabled || undefined}
					// With no href an <a> has no role, so a disabled one keeps role="link".
					role={disabled ? "link" : undefined}
					onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
						if (disabled) {
							event.preventDefault();
							return;
						}

						onClick?.(event);
					}}
					{...(attributes as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
				>
					{content}
				</a>
			);
		}

		return (
			<button
				ref={actionRef as React.Ref<HTMLButtonElement> | undefined}
				type="button"
				disabled={disabled}
				aria-pressed={selected}
				onClick={onClick}
				{...(attributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
			>
				{content}
			</button>
		);
	};

	const deleteButton = isDeletable ? (
		<button
			type="button"
			className="gl-chip-delete"
			aria-label={deleteLabel ?? (name ? `Remove ${name}` : "Remove")}
			disabled={disabled}
			onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
				event.stopPropagation();
				onDelete?.(event);
			}}
		>
			{deleteIcon ?? <Icon name="close" />}
		</button>
	) : null;

	// A clickable chip with a delete button: two sibling buttons in one pill, never one inside the other.
	if (isInteractive && isDeletable) {
		return (
			<Root ref={ref} className={classes} onKeyDown={handleKeyDown} {...rest}>
				{action({ className: "gl-chip-action" }, inner)}
				{deleteButton}
			</Root>
		);
	}

	if (isInteractive) {
		return action(
			{ ref, className: classes, onKeyDown: handleKeyDown, ...rest },
			inner,
		);
	}

	return (
		<Root
			ref={ref}
			className={classes}
			onKeyDown={isDeletable ? handleKeyDown : onKeyDown}
			{...rest}
		>
			{inner}
			{deleteButton}
		</Root>
	);
}
