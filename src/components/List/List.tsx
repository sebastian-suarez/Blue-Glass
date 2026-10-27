"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useForkRef } from "../../internal/hooks.js";

type ListContextValue = { dense: boolean; inList: boolean };

const ListContext = React.createContext<ListContextValue>({
	dense: false,
	inList: false,
});

const ListItemContext = React.createContext(false);

export type ListProps = React.HTMLAttributes<HTMLElement> & {
	dense?: boolean;
	divided?: boolean;
	subheader?: React.ReactNode;
	component?: React.ElementType;
	children?: React.ReactNode;
};

export function List({
	dense = false,
	divided = false,
	subheader,
	component: Component = "ul",
	className,
	children,
	ref,
	...rest
}: ListProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const context = React.useMemo(() => ({ dense, inList: true }), [dense]);
	return (
		<ListContext value={context}>
			<ListItemContext value={false}>
				<Component
					ref={ref}
					className={cx(
						"gl-list",
						dense && "gl-list-dense",
						divided && "gl-list-divided",
						className,
					)}
					{...rest}
				>
					{subheader}
					{children}
				</Component>
			</ListItemContext>
		</ListContext>
	);
}

export type ListItemProps = React.HTMLAttributes<HTMLElement> & {
	secondaryAction?: React.ReactNode;
	divider?: boolean;
	dense?: boolean;
	disablePadding?: boolean;
	disableGutters?: boolean;
	alignItems?: "center" | "flex-start";
	component?: React.ElementType;
	children?: React.ReactNode;
};

function isFilled(node: React.ReactNode): boolean {
	return node !== null && node !== undefined && node !== false;
}

export function ListItem({
	secondaryAction,
	divider = false,
	dense,
	disablePadding = false,
	disableGutters = false,
	alignItems = "center",
	component: Component = "li",
	className,
	children,
	ref,
	...rest
}: ListItemProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const list = React.use(ListContext);
	const isDense = dense ?? list.dense;
	const hasAction = isFilled(secondaryAction);
	return (
		<ListItemContext value>
			<Component
				ref={ref}
				className={cx(
					"gl-list-item",
					isDense && "gl-list-item-dense",
					divider && "gl-list-item-divider",
					disablePadding && "gl-list-item-flush",
					disableGutters && "gl-list-item-no-gutters",
					alignItems === "flex-start" && "gl-list-item-align-start",
					hasAction && "gl-list-item-has-action",
					className,
				)}
				{...rest}
			>
				{children}
				{hasAction ? (
					<span className="gl-list-item-action">{secondaryAction}</span>
				) : null}
			</Component>
		</ListItemContext>
	);
}

export type ListItemButtonProps = React.HTMLAttributes<HTMLElement> & {
	selected?: boolean;
	disabled?: boolean;
	dense?: boolean;
	href?: string;
	target?: string;
	rel?: string;
	end?: React.ReactNode;
	alignItems?: "center" | "flex-start";
	autoFocus?: boolean;
	type?: "button" | "submit" | "reset";
	component?: React.ElementType;
	children?: React.ReactNode;
};

function rowState(
	Component: React.ElementType,
	{
		selected,
		disabled,
		href,
		target,
		rel,
		type,
	}: Pick<
		ListItemButtonProps,
		"selected" | "href" | "target" | "rel" | "type"
	> & { disabled: boolean },
): Record<string, unknown> {
	if (Component === "a") {
		return {
			href: disabled ? undefined : href,
			target,
			rel,
			"aria-current": selected ? "page" : undefined,
			"aria-disabled": disabled || undefined,
			role: disabled ? "link" : undefined,
		};
	}

	if (Component === "button") {
		return {
			type,
			disabled,
			"aria-pressed": selected,
		};
	}

	return { "aria-disabled": disabled || undefined };
}

export function ListItemButton({
	selected,
	disabled = false,
	dense,
	href,
	target,
	rel,
	end,
	alignItems = "center",
	autoFocus = false,
	type = "button",
	component,
	className,
	children,
	onClick,
	ref,
	...rest
}: ListItemButtonProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const list = React.use(ListContext);
	const isInItem = React.use(ListItemContext);
	const isDense = dense ?? list.dense;
	const innerRef = React.useRef<HTMLElement | null>(null);
	const handleRef = useForkRef(innerRef, ref);
	React.useEffect(() => {
		if (autoFocus) {
			innerRef.current?.focus();
		}
	}, [autoFocus]);

	const Component: React.ElementType =
		component ?? (href === undefined ? "button" : "a");
	const row = (
		<Component
			ref={handleRef}
			className={cx(
				"gl-option",
				"gl-list-button",
				isDense && "gl-list-button-dense",
				alignItems === "flex-start" && "gl-list-button-align-start",
				className,
			)}
			data-selected={selected ? "" : undefined}
			onClick={(event: React.MouseEvent<HTMLElement>) => {
				if (disabled) {
					event.preventDefault();
					return;
				}

				onClick?.(event);
			}}
			{...rowState(Component, { selected, disabled, href, target, rel, type })}
			{...rest}
		>
			{children}
			{isFilled(end) ? (
				<span className="gl-option-end gl-list-button-end">{end}</span>
			) : null}
		</Component>
	);
	return !isInItem && list.inList ? (
		<li className="gl-list-item gl-list-item-flush">{row}</li>
	) : (
		row
	);
}

export type ListItemIconProps = React.HTMLAttributes<HTMLSpanElement> & {
	children?: React.ReactNode;
};

export function ListItemIcon({
	className,
	children,
	ref,
	...rest
}: ListItemIconProps & { ref?: React.Ref<HTMLSpanElement> | undefined }) {
	return (
		<span
			ref={ref}
			className={cx("gl-option-icon", "gl-list-icon", className)}
			{...rest}
		>
			{children}
		</span>
	);
}

export type ListItemTextProps = React.HTMLAttributes<HTMLSpanElement> & {
	primary?: React.ReactNode;
	secondary?: React.ReactNode;
	inset?: boolean;
	noWrap?: boolean;
	children?: React.ReactNode;
};

export function ListItemText({
	primary,
	secondary,
	inset = false,
	noWrap = false,
	className,
	children,
	ref,
	...rest
}: ListItemTextProps & { ref?: React.Ref<HTMLSpanElement> | undefined }) {
	const main = primary ?? children;
	return (
		<span
			ref={ref}
			className={cx(
				"gl-option-text",
				"gl-list-text",
				inset && "gl-list-text-inset",
				noWrap && "gl-list-text-nowrap",
				className,
			)}
			{...rest}
		>
			{isFilled(main) ? <span className="gl-list-primary">{main}</span> : null}
			{isFilled(secondary) ? (
				<span className="gl-option-secondary gl-list-secondary">
					{secondary}
				</span>
			) : null}
		</span>
	);
}

export type ListSubheaderProps = React.HTMLAttributes<HTMLElement> & {
	inset?: boolean;
	sticky?: boolean;
	component?: React.ElementType;
	children?: React.ReactNode;
};

export function ListSubheader({
	inset = false,
	sticky = false,
	component: Component = "li",
	className,
	children,
	ref,
	...rest
}: ListSubheaderProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-option-group",
				"gl-list-subheader",
				inset && "gl-list-subheader-inset",
				sticky && "gl-list-subheader-sticky",
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}
