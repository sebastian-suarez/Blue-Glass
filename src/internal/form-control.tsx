"use client";
/**
The form-control adapter: Base UI's Checkbox, Radio and Switch behind the documented input API
(design-system/components/Checkbox, RadioGroup and Switch). The Checkbox, RadioGroup and Switch
ports wrap these controls in their own markup (label row, box, helper text).

The documented controls are native inputs: "the ref and every other attribute go to the native
input", and `onChange` gets the input's `ChangeEvent`. Base UI renders a `<span>` with the role
(checkbox, radio or switch) instead, beside a hidden, `aria-hidden` input that carries the form
value. The user chose Base UI with these deviations (docs/deviations.md lists each with its test):
- The ref is Base UI's hidden input (`inputRef`). `ref.current.focus()` still focuses the control
  (the input hands focus to the span), and `checked`, `form` and `validity` read as usual.
- `onChange(event, checked)` gets a ChangeEvent-shaped wrapper whose `target` and `currentTarget`
  are that input, already holding the new state; `nativeEvent` is the click Base UI dispatched on
  it. `preventDefault()` cancels the change, as on a native checkbox's click.
- Attributes go where Base UI takes them: `name`, `value`, `required`, `form`, `id`, `disabled` and
  `readOnly` to the hidden input; ARIA (`aria-describedby`, `aria-label`, `aria-invalid`...),
  `data-*`, `title`, `tabIndex`, the event handlers, `className` and `style` to the span, the
  element assistive tech reads. `autoFocus` focuses the span on mount.
- Focus and blur fire on the span, so their `target` is the span.
- Inside a group a Radio takes the group's `name` and `form`; Base UI can't vary them per radio.
- A Radio outside a group is a one-radio Base UI group: `checked` and `defaultChecked` work, but
  standalone radios that share a name don't uncheck one another, as native ones would.

What still works as native: FormData has `name=value` when checked and nothing when not,
`required` blocks submission and sets `validity.valueMissing`, Space toggles (and chooses a
radio), arrow keys move a group's choice, and a wrapping or `htmlFor` label toggles the control.
*/
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import * as React from "react";
import { useForkRef, useIsoLayoutEffect } from "./hooks.js";

/**
The attributes the documented controls send to their native input.
*/
export type InputAttributes = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"type" | "size" | "onChange" | "checked" | "defaultChecked" | "children"
>;

export type ControlChangeHandler<Value> = (
	event: React.ChangeEvent<HTMLInputElement>,
	value: Value,
) => void;

// Event handlers are typed for the documented input but fire on Base UI's span.
type SpanProps = React.HTMLAttributes<HTMLSpanElement>;

type HiddenInputProps = {
	name?: string;
	value?: string;
	required?: boolean;
	form?: string;
	id?: string;
	disabled?: boolean;
	readOnly?: boolean;
};

/**
Splits the documented input attributes into the ones Base UI puts on its hidden input and the
rest, which go to the span.
*/
function splitAttributes(attributes: InputAttributes): {
	input: HiddenInputProps;
	span: SpanProps;
	shouldAutoFocus: boolean;
} {
	const {
		name,
		value,
		required,
		form,
		id,
		disabled,
		readOnly,
		autoFocus,
		...span
	} = attributes;
	return {
		input: {
			name,
			value: value === undefined ? undefined : String(value),
			required,
			form,
			id,
			disabled,
			readOnly,
		},
		span,
		shouldAutoFocus: autoFocus === true,
	};
}

/**
A React ChangeEvent's shape around Base UI's hidden input, which already holds the new state.
*/
function createChangeEvent(
	input: HTMLInputElement,
	nativeEvent: Event,
	cancel: () => void,
): React.ChangeEvent<HTMLInputElement> {
	let isDefaultPrevented = nativeEvent.defaultPrevented;
	let isPropagationStopped = false;
	return {
		nativeEvent,
		target: input,
		currentTarget: input,
		type: "change",
		bubbles: true,
		cancelable: nativeEvent.cancelable,
		eventPhase: nativeEvent.eventPhase,
		isTrusted: nativeEvent.isTrusted,
		timeStamp: nativeEvent.timeStamp,
		get defaultPrevented() {
			return isDefaultPrevented;
		},
		preventDefault() {
			isDefaultPrevented = true;
			// Called from onChange, inside the click's dispatch, as with React's own events.
			// eslint-disable-next-line unicorn/no-late-event-control
			nativeEvent.preventDefault();
			cancel();
		},
		isDefaultPrevented: () => isDefaultPrevented,
		stopPropagation() {
			isPropagationStopped = true;
		},
		isPropagationStopped: () => isPropagationStopped,
		persist() {
			// Nothing to keep: the wrapper isn't pooled.
		},
	};
}

// Focuses the span on mount for the documented autoFocus, which React only honours on inputs.
function useAutoFocus(shouldAutoFocus: boolean) {
	const spanRef = React.useRef<HTMLElement | null>(null);
	const [shouldFocusOnMount] = React.useState(shouldAutoFocus);
	useIsoLayoutEffect(() => {
		if (shouldFocusOnMount) {
			spanRef.current?.focus();
		}
	}, [shouldFocusOnMount]);
	return spanRef;
}

type CheckedControlProps = InputAttributes & {
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: ControlChangeHandler<boolean>;
	/**
	Content of the span: Base UI's indicator or thumb.
	*/
	children?: React.ReactNode;
	/**
	Base UI's hidden input.
	*/
	ref?: React.Ref<HTMLInputElement>;
};

export type CheckboxControlProps = CheckedControlProps & {
	indeterminate?: boolean;
};

/**
Base UI's Checkbox behind the documented input API (see the module comment).
*/
export function CheckboxControl({
	checked,
	defaultChecked,
	indeterminate,
	onChange,
	children,
	ref,
	...attributes
}: CheckboxControlProps) {
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const handleInputRef = useForkRef(inputRef, ref);
	const { input, span, shouldAutoFocus } = splitAttributes(attributes);
	const spanRef = useAutoFocus(shouldAutoFocus);
	return (
		<BaseCheckbox.Root
			{...span}
			{...input}
			ref={spanRef}
			checked={checked}
			defaultChecked={defaultChecked}
			indeterminate={indeterminate}
			inputRef={handleInputRef}
			onCheckedChange={(isChecked, details) => {
				const element = inputRef.current;
				if (element) {
					onChange?.(
						createChangeEvent(element, details.event, details.cancel),
						isChecked,
					);
				}
			}}
		>
			{children}
		</BaseCheckbox.Root>
	);
}

export type SwitchControlProps = CheckedControlProps;

/**
Base UI's Switch behind the documented input API (see the module comment).
*/
export function SwitchControl({
	checked,
	defaultChecked,
	onChange,
	children,
	ref,
	...attributes
}: SwitchControlProps) {
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const handleInputRef = useForkRef(inputRef, ref);
	const { input, span, shouldAutoFocus } = splitAttributes(attributes);
	const spanRef = useAutoFocus(shouldAutoFocus);
	return (
		<BaseSwitch.Root
			{...span}
			{...input}
			ref={spanRef}
			checked={checked}
			defaultChecked={defaultChecked}
			inputRef={handleInputRef}
			onCheckedChange={(isChecked, details) => {
				const element = inputRef.current;
				if (element) {
					onChange?.(
						createChangeEvent(element, details.event, details.cancel),
						isChecked,
					);
				}
			}}
		>
			{children}
		</BaseSwitch.Root>
	);
}

type RadioEntry = {
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly onChangeRef: React.RefObject<
		ControlChangeHandler<boolean> | undefined
	>;
};

type RadioRegistry = {
	register: (value: string, entry: RadioEntry) => () => void;
};

const RadioRegistryContext = React.createContext<RadioRegistry | undefined>(
	undefined,
);

export type RadioGroupControlProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> & {
	name?: string;
	/**
	The chosen value, controlled; null for none.
	*/
	value?: string | null;
	defaultValue?: string | null;
	/**
	Called with the chosen radio's change event and its value.
	*/
	onChange?: ControlChangeHandler<string>;
	required?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	form?: string;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLDivElement>;
};

/**
Base UI's RadioGroup behind the documented group API: the radios' change events reach the
chosen Radio's `onChange(event, true)`, then the group's `onChange(event, value)`.
*/
export function RadioGroupControl({
	name,
	value,
	defaultValue,
	onChange,
	required,
	disabled,
	readOnly,
	form,
	children,
	ref,
	...rest
}: RadioGroupControlProps) {
	const [radios] = React.useState(() => new Map<string, RadioEntry>());
	const registry = React.useMemo<RadioRegistry>(
		() => ({
			register(radioValue, entry) {
				radios.set(radioValue, entry);
				return () => {
					if (radios.get(radioValue) === entry) {
						radios.delete(radioValue);
					}
				};
			},
		}),
		[radios],
	);

	return (
		<RadioRegistryContext value={registry}>
			<BaseRadioGroup<string | null>
				ref={ref}
				{...rest}
				name={name}
				value={value}
				defaultValue={defaultValue}
				required={required}
				disabled={disabled}
				readOnly={readOnly}
				form={form}
				onValueChange={(next, details) => {
					if (next === null) {
						return;
					}

					const entry = radios.get(next);
					const { target } = details.event;
					const input =
						entry?.inputRef.current ??
						(target instanceof HTMLInputElement ? target : null);
					if (!input) {
						return;
					}

					const event = createChangeEvent(input, details.event, details.cancel);
					entry?.onChangeRef.current?.(event, true);
					onChange?.(event, next);
				}}
			>
				{children}
			</BaseRadioGroup>
		</RadioRegistryContext>
	);
}

export type RadioControlProps = Omit<InputAttributes, "value"> & {
	/**
	This option's value: what the group's value becomes when it's chosen.
	*/
	value: string;
	/**
	Checked, controlled; outside a group only. Inside one the group's value decides.
	*/
	checked?: boolean;
	defaultChecked?: boolean;
	/**
	Called with the change event and true when this radio becomes checked.
	*/
	onChange?: ControlChangeHandler<boolean>;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLInputElement>;
};

/**
Base UI's Radio behind the documented input API (see the module comment). Outside a
RadioGroupControl it renders its own one-radio group.
*/
export function RadioControl({
	value,
	checked,
	defaultChecked,
	onChange,
	children,
	ref,
	...attributes
}: RadioControlProps) {
	const registry = React.use(RadioRegistryContext);
	const inputRef = React.useRef<HTMLInputElement | null>(null);
	const handleInputRef = useForkRef(inputRef, ref);
	const onChangeRef = React.useRef(onChange);
	useIsoLayoutEffect(() => {
		onChangeRef.current = onChange;
	});
	const [entry] = React.useState<RadioEntry>(() => ({
		inputRef,
		onChangeRef,
	}));
	useIsoLayoutEffect(
		() => registry?.register(value, entry),
		[registry, value, entry],
	);
	const { input, span, shouldAutoFocus } = splitAttributes(attributes);
	const spanRef = useAutoFocus(shouldAutoFocus);

	const radio = (
		<BaseRadio.Root
			{...span}
			ref={spanRef}
			value={value}
			id={input.id}
			disabled={input.disabled}
			readOnly={input.readOnly}
			required={input.required}
			inputRef={handleInputRef}
		>
			{children}
		</BaseRadio.Root>
	);
	if (registry) {
		return radio;
	}

	let groupValue: string | null | undefined;
	if (checked !== undefined) {
		groupValue = checked ? value : null;
	}

	return (
		<RadioGroupControl
			// A lone radio is not a group of options: no radiogroup role, no box of its own.
			role="none"
			style={{ display: "contents" }}
			name={input.name}
			form={input.form}
			value={groupValue}
			defaultValue={defaultChecked === true ? value : null}
			onChange={(event) => {
				onChangeRef.current?.(event, true);
			}}
		>
			{radio}
		</RadioGroupControl>
	);
}
