"use client";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import * as React from "react";
import { useForkRef, useIsoLayoutEffect } from "./hooks.js";

export type InputAttributes = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"type" | "size" | "onChange" | "checked" | "defaultChecked" | "children"
>;

export type ControlChangeHandler<Value> = (
	event: React.ChangeEvent<HTMLInputElement>,
	value: Value,
) => void;

type SpanProps = React.HTMLAttributes<HTMLSpanElement>;

type HiddenInputProps = {
	name?: string;
	value?: string;
	required?: boolean;
	form?: string;
	id?: string;
	disabled?: boolean;
};

function splitAttributes(attributes: InputAttributes): {
	input: HiddenInputProps;
	span: SpanProps;
	shouldAutoFocus: boolean;
	readOnly: boolean;
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
		},
		span,
		shouldAutoFocus: autoFocus === true,
		readOnly: readOnly === true,
	};
}

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
			return undefined;
		},
	};
}

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
	children?: React.ReactNode;
	ref?: React.Ref<HTMLInputElement>;
};

export type CheckboxControlProps = CheckedControlProps & {
	indeterminate?: boolean;
};

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
	const { input, span, shouldAutoFocus, readOnly } =
		splitAttributes(attributes);
	const spanRef = useAutoFocus(shouldAutoFocus);
	useIsoLayoutEffect(() => {
		if (inputRef.current) {
			inputRef.current.readOnly = readOnly;
		}
	}, [readOnly]);
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
				if (!element) {
					return;
				}

				onChange?.(
					createChangeEvent(element, details.event, details.cancel),
					isChecked,
				);
				element.indeterminate = indeterminate === true;
			}}
		>
			{children}
		</BaseCheckbox.Root>
	);
}

export type SwitchControlProps = CheckedControlProps;

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
	const { input, span, shouldAutoFocus, readOnly } =
		splitAttributes(attributes);
	const spanRef = useAutoFocus(shouldAutoFocus);
	useIsoLayoutEffect(() => {
		if (inputRef.current) {
			inputRef.current.readOnly = readOnly;
		}
	}, [readOnly]);
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
	value?: string | null;
	defaultValue?: string | null;
	onChange?: ControlChangeHandler<string>;
	required?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	form?: string;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLDivElement>;
};

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
					if (!event.isDefaultPrevented()) {
						onChange?.(event, next);
					}
				}}
			>
				{children}
			</BaseRadioGroup>
		</RadioRegistryContext>
	);
}

export type RadioControlProps = Omit<InputAttributes, "value"> & {
	value: string;
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: ControlChangeHandler<boolean>;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLInputElement>;
};

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
	const { input, span, shouldAutoFocus, readOnly } =
		splitAttributes(attributes);
	const spanRef = useAutoFocus(shouldAutoFocus);
	useIsoLayoutEffect(() => {
		if (inputRef.current) {
			inputRef.current.readOnly = readOnly;
		}
	}, [readOnly]);

	const radio = (
		<BaseRadio.Root
			{...span}
			{...(input.disabled === true ? { tabIndex: -1 } : {})}
			ref={spanRef}
			value={value}
			id={input.id}
			disabled={input.disabled}
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
