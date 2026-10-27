"use client";
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { Icon } from "../Icon/index.js";

export type ChipTone =
	"default" | "accent" | "danger" | "warning" | "success" | "info";

export type ChipProps = Omit<React.HTMLAttributes<HTMLElement>, "onClick"> & {
	label: React.ReactNode;
	variant?: "chip" | "plate";
	size?: "sm" | "md";
	tone?: ChipTone;
	icon?: React.ReactNode;
	avatar?: React.ReactNode;
	onClick?: React.MouseEventHandler<HTMLElement>;
	clickable?: boolean;
	href?: string;
	target?: string;
	rel?: string;
	onDelete?: (event: React.SyntheticEvent) => void;
	deleteLabel?: string;
	deleteIcon?: React.ReactNode;
	selected?: boolean;
	disabled?: boolean;
	component?: React.ElementType;
};

type ActionProps = Omit<React.HTMLAttributes<HTMLElement>, "onClick"> & {
	ref?: React.Ref<HTMLElement>;
};

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
	deleteLabel: closeLabel,
	deleteIcon: closeIcon,
	selected,
	disabled = false,
	component: Root = "span",
	className,
	onKeyDown,
	ref,
	...rest
}: ChipProps & { ref?: React.Ref<HTMLElement> }) {
	const isInteractive = Boolean(onClick) || href !== undefined;
	const isDeletable = typeof onDelete === "function";
	const name =
		typeof label === "string" || typeof label === "number" ? String(label) : "";

	const hasAvatar = Boolean(avatar);
	const hasIcon = Boolean(icon);
	let start: React.ReactNode = null;
	if (hasAvatar) {
		start = <span className="gl-chip-avatar">{avatar}</span>;
	} else if (hasIcon) {
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

	const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
		onKeyDown?.(event);
		if (disabled || event.defaultPrevented) {
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
					role={disabled ? "link" : undefined}
					onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
						if (disabled) {
							event.preventDefault();
							return;
						}

						onClick?.(event);
					}}
					{...attributes}
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
				{...attributes}
			>
				{content}
			</button>
		);
	};

	const closeButton = isDeletable ? (
		<button
			type="button"
			className="gl-chip-delete"
			aria-label={closeLabel ?? (name === "" ? "Remove" : `Remove ${name}`)}
			disabled={disabled}
			onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
				event.stopPropagation();
				onDelete?.(event);
			}}
		>
			{closeIcon ?? <Icon name="close" />}
		</button>
	) : null;

	if (isInteractive && isDeletable) {
		return (
			<Root ref={ref} className={classes} onKeyDown={handleKeyDown} {...rest}>
				{action({ className: "gl-chip-action" }, inner)}
				{closeButton}
			</Root>
		);
	}

	if (isInteractive) {
		return action(
			// eslint-disable-next-line react-hooks/refs -- action only hands the ref to the element it renders; nothing reads it during render.
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
			{closeButton}
		</Root>
	);
}
