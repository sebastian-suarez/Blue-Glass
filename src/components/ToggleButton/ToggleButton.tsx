"use client";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { documentedEvent, rememberReactEvent } from "../../internal/events.js";
import { useControlled, useEventCallback } from "../../internal/hooks.js";

type Selection = string | string[] | null;

export type ToggleButtonProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"value" | "onChange" | "type"
> & {
	value: string;
	selected?: boolean;
	defaultSelected?: boolean;
	onChange?: (
		event: React.MouseEvent<HTMLButtonElement>,
		value: string,
	) => void;
	size?: "sm" | "md" | "lg";
	fullWidth?: boolean;
	disabled?: boolean;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	onFocus?: React.FocusEventHandler<HTMLButtonElement>;
	tabIndex?: number;
	className?: string;
	children?: React.ReactNode;
};

export type ToggleButtonGroupProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> & {
	value?: Selection;
	defaultValue?: Selection;
	onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: any) => void;
	exclusive?: boolean;
	orientation?: "horizontal" | "vertical";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	fullWidth?: boolean;
	onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
	className?: string;
	children?: React.ReactNode;
};

type GroupContextValue = {
	size: "sm" | "md" | "lg";
	tabStop: string | null;
	roving: boolean;
	onItemFocus: (value: string) => void;
};

const ToggleButtonGroupContext = React.createContext<GroupContextValue | null>(
	null,
);

function toArray(selection: Selection | undefined): string[] {
	if (selection === null || selection === undefined) {
		return [];
	}

	return Array.isArray(selection) ? selection : [selection];
}

const toBaseValue = (value: string) => `v${value}`;
const fromBaseValue = (value: string) => value.slice(1);

function buttonOf(event: Event): HTMLButtonElement | undefined {
	const { target } = event;
	return target instanceof Element
		? (target.closest("button") ?? undefined)
		: undefined;
}

export function ToggleButton({
	value,
	selected,
	defaultSelected = false,
	onChange,
	onClick,
	onFocus,
	onKeyDown,
	size: sizeProp,
	fullWidth = false,
	disabled = false,
	className,
	children,
	tabIndex,
	ref,
	...rest
}: ToggleButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
	const group = React.use(ToggleButtonGroupContext);
	const size = sizeProp ?? group?.size ?? "md";
	return (
		<Toggle
			{...rest}
			ref={ref}
			value={toBaseValue(value)}
			pressed={selected}
			defaultPressed={defaultSelected}
			disabled={disabled}
			className={cx(
				"gl-toggle-button",
				`gl-toggle-button-${size}`,
				!group && "gl-toggle-button-standalone",
				fullWidth && "gl-toggle-button-full",
				className,
			)}
			tabIndex={group?.roving ? (group.tabStop === value ? 0 : -1) : tabIndex}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					event.preventBaseUIHandler();
					return;
				}

				rememberReactEvent(event);
				onChange?.(event, value);
			}}
			onFocus={(event) => {
				onFocus?.(event);
				group?.onItemFocus(value);
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented) {
					event.preventBaseUIHandler();
				}
			}}
		>
			<span className="gl-toggle-button-label">{children}</span>
		</Toggle>
	);
}

export function ToggleButtonGroup({
	value: valueProp,
	defaultValue,
	onChange,
	exclusive = false,
	orientation = "horizontal",
	size = "md",
	disabled = false,
	fullWidth = false,
	className,
	children,
	onKeyDown,
	ref,
	...rest
}: ToggleButtonGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
	const [value, setValue] = useControlled<Selection>(
		valueProp,
		defaultValue === undefined ? (exclusive ? null : []) : defaultValue,
	);
	const pressed = React.useMemo(() => toArray(value), [value]);

	const [focused, setFocused] = React.useState<string | null>(null);
	const onItemFocus = useEventCallback((item: string) => {
		setFocused(item);
	});
	const items: Array<{ value: string; disabled: boolean }> = [];
	// eslint-disable-next-line @eslint-react/no-children-for-each -- The tab stop is chosen while rendering, so the server HTML has it.
	React.Children.forEach(children, (child) => {
		if (
			React.isValidElement<{ value?: unknown; disabled?: boolean }>(child) &&
			typeof child.props.value === "string"
		) {
			items.push({
				value: child.props.value,
				disabled: disabled || Boolean(child.props.disabled),
			});
		}
	});
	const enabled = items.filter((item) => !item.disabled);
	const fallback =
		enabled.find((item) => pressed.includes(item.value)) ?? enabled.at(0);
	const tabStop = enabled.some((item) => item.value === focused)
		? focused
		: (fallback?.value ?? null);
	const isRoving = items.length > 0;
	const context = React.useMemo(
		() => ({ size, tabStop, roving: isRoving, onItemFocus }),
		[size, tabStop, isRoving, onItemFocus],
	);

	return (
		<ToggleGroup
			ref={ref}
			value={pressed.map((item) => toBaseValue(item))}
			multiple={!exclusive}
			orientation={orientation}
			disabled={disabled}
			className={cx(
				"gl-toggle-group",
				`gl-toggle-group-${size}`,
				orientation === "vertical" && "gl-toggle-group-vertical",
				fullWidth && "gl-toggle-group-full",
				disabled && "gl-toggle-group-disabled",
				className,
			)}
			onValueChange={(next, details) => {
				const values = next.map((item) => fromBaseValue(item));
				const selection: Selection = exclusive
					? (values.at(0) ?? null)
					: values;
				setValue(selection);
				onChange?.(
					documentedEvent(
						details.event,
						buttonOf(details.event),
					) as React.MouseEvent<HTMLButtonElement>,
					selection,
				);
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented) {
					event.preventBaseUIHandler();
					return;
				}

				const root = event.currentTarget;
				const isSideways =
					orientation === "horizontal" &&
					(event.key === "ArrowLeft" || event.key === "ArrowRight");
				if (!isSideways || getComputedStyle(root).direction !== "rtl") {
					return;
				}

				event.preventBaseUIHandler();
				const buttons = [
					...root.querySelectorAll<HTMLButtonElement>(".gl-toggle-button"),
				].filter(
					(button) =>
						!button.disabled && button.closest(".gl-toggle-group") === root,
				);
				const current = buttons.indexOf(
					root.ownerDocument.activeElement as HTMLButtonElement,
				);
				if (current === -1) {
					return;
				}

				event.preventDefault();
				const step = event.key === "ArrowLeft" ? 1 : -1;
				buttons.at((current + step) % buttons.length)?.focus();
			}}
			{...rest}
		>
			<ToggleButtonGroupContext value={context}>
				{children}
			</ToggleButtonGroupContext>
		</ToggleGroup>
	);
}
