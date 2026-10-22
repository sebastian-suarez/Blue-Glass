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
	/**
	The value this button stands for: required, and unique within its group.
	*/
	value: string;
	/**
	Pressed, controlled (standalone). In a group, the group's value decides.
	*/
	selected?: boolean;
	/**
	Initially pressed, uncontrolled (standalone).
	*/
	defaultSelected?: boolean;
	/**
	Called on every press with the click event and this button's value.
	*/
	onChange?: (
		event: React.MouseEvent<HTMLButtonElement>,
		value: string,
	) => void;
	/**
	sm, md (default) or lg. Inherits the group's.
	*/
	size?: "sm" | "md" | "lg";
	/**
	Stretch to the container width (standalone).
	*/
	fullWidth?: boolean;
	/**
	Disables this button. The group's disabled disables every button.
	*/
	disabled?: boolean;
	/**
	Called first on every press; call event.preventDefault() to stop the toggle.
	*/
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	/**
	Called on focus.
	*/
	onFocus?: React.FocusEventHandler<HTMLButtonElement>;
	/**
	Tab order (standalone). In a group the group manages it: one tab stop.
	*/
	tabIndex?: number;
	/**
	Classes on the button.
	*/
	className?: string;
	/**
	The label: text, an Icon, or both. An icon-only button needs an aria-label.
	*/
	children?: React.ReactNode;
};

export type ToggleButtonGroupProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> & {
	/**
	The pressed value, controlled: a string or null when exclusive, an array of strings otherwise.
	*/
	value?: Selection;
	/**
	The initially pressed value, uncontrolled.
	*/
	defaultValue?: Selection;
	/**
	Called with the click event and the new value: when exclusive, the pressed string, or null when the
	pressed button is pressed again (ignore null to keep one always pressed); otherwise the new array.
	*/
	onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any -- The documented type: its shape follows exclusive.
	/**
	One button pressed at a time.
	*/
	exclusive?: boolean;
	/**
	A row (default) or a column. Arrow keys follow it.
	*/
	orientation?: "horizontal" | "vertical";
	/**
	sm 36px, md 46px (the site's nav track, default), lg 54px. Sets every button's size.
	*/
	size?: "sm" | "md" | "lg";
	/**
	Disables every button.
	*/
	disabled?: boolean;
	/**
	Stretch to the container width; the buttons share it equally.
	*/
	fullWidth?: boolean;
	/**
	Called before the group's own arrow-key handling; call event.preventDefault() to take over.
	*/
	onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
	/**
	Classes on the group.
	*/
	className?: string;
	/**
	ToggleButton elements. Name the group with aria-label or aria-labelledby.
	*/
	children?: React.ReactNode;
};

type GroupContextValue = {
	size: "sm" | "md" | "lg";
	/**
	The one button in the tab order, or null when none can take focus.
	*/
	tabStop: string | null;
	/**
	Whether the group found buttons among its children, and so manages the tab order.
	*/
	roving: boolean;
	onItemFocus: (value: string) => void;
};

const ToggleButtonGroupContext = React.createContext<GroupContextValue | null>(
	null,
);

/**
A selection as Base UI holds it: the pressed values, in an array.
*/
function toArray(selection: Selection | undefined): string[] {
	if (selection === null || selection === undefined) {
		return [];
	}

	return Array.isArray(selection) ? selection : [selection];
}

/**
The button a click came from, for a press that reaches the group without a ToggleButton's own
handler seeing it.
*/
function buttonOf(event: Event): HTMLButtonElement | undefined {
	const { target } = event;
	return target instanceof Element
		? (target.closest("button") ?? undefined)
		: undefined;
}

/**
A button that stays pressed (aria-pressed): alone, a glass pill; in a ToggleButtonGroup, a segment of the site's pill track.
*/
export function ToggleButton({
	value,
	selected,
	defaultSelected = false,
	onChange,
	onClick,
	onFocus,
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
			value={value}
			// Alone, Base UI keeps the pressed state; in a group the group's value decides.
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
			// The group's roving tab stop is set while rendering, so the server HTML has it too. Base
			// UI's starts on the first button rather than the pressed one, and only once mounted.
			tabIndex={group?.roving ? (group.tabStop === value ? 0 : -1) : tabIndex}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) {
					// Stops Base UI's toggle, which runs after this handler.
					event.preventBaseUIHandler();
					return;
				}

				// So the group's onChange gets this same event.
				rememberReactEvent(event);
				onChange?.(event, value);
			}}
			onFocus={(event) => {
				onFocus?.(event);
				group?.onItemFocus(value);
			}}
		>
			<span className="gl-toggle-button-label">{children}</span>
		</Toggle>
	);
}

/**
The site's segmented pill: ToggleButtons in the nav track, the pressed one raised. One tab stop;
arrow keys, Home and End move between buttons; Space or Enter presses.
*/
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
	// The group keeps the value, so it knows what's pressed while it renders its tab stop, and
	// Base UI's ToggleGroup always runs controlled.
	const [value, setValue] = useControlled<Selection>(
		valueProp,
		defaultValue === undefined ? (exclusive ? null : []) : defaultValue,
	);
	const pressed = React.useMemo(() => toArray(value), [value]);

	// The reference's roving tab stop: the last focused button, else the first pressed one, else
	// the first enabled one, among the ToggleButtons the group holds directly.
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
	const roving = items.length > 0;
	const context = React.useMemo(
		() => ({ size, tabStop, roving, onItemFocus }),
		[size, tabStop, roving, onItemFocus],
	);

	return (
		<ToggleGroup
			ref={ref}
			value={pressed}
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
				const selection: Selection = exclusive ? (next.at(0) ?? null) : next;
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
				// The documented way to take over the keys. Base UI's arrow keys run after this
				// handler and don't check defaultPrevented.
				if (event.defaultPrevented) {
					event.preventBaseUIHandler();
				}
			}}
			{...rest}
		>
			<ToggleButtonGroupContext value={context}>
				{children}
			</ToggleButtonGroupContext>
		</ToggleGroup>
	);
}
