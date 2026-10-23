"use client";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete";
import * as React from "react";
import {
	positionerVariables,
	toPositionerProps,
	toWholePixelOffsets,
	useBaseAnchor,
	useContainingBlockPositioner,
} from "../../internal/anchor.js";
import {
	documentedEvent,
	rememberReactEvent,
	autocompleteCloseReason,
	type AutocompleteChangeReason,
	type AutocompleteCloseReason,
	type AutocompleteInputChangeReason,
} from "../../internal/events.js";
import { cx } from "../../internal/cx.js";
import { useControlled, useForkRef, useId } from "../../internal/hooks.js";
import { Grow } from "../Transitions/index.js";
import { Icon } from "../Icon/index.js";
import {
	FieldShell,
	focusFromPadding,
	hasContent,
	idList,
	renderSlot,
} from "../../internal/field.js";
import {
	edgeIndex,
	fold,
	jumpIndex,
	matchRange,
	scrollIntoViewNearest,
	stepIndex,
} from "../../internal/input-list.js";
import type { FieldBaseProps } from "../TextField/index.js";

/**
An option: a string, or an object with a label (plus anything else you need).
*/
export type AutocompleteOption =
	| string
	| {
			label: string;
			value?: string | number;
			disabled?: boolean;
			secondary?: React.ReactNode;
			[key: string]: unknown;
	  };
export type { AutocompleteChangeReason } from "../../internal/events.js";
export type { AutocompleteCloseReason } from "../../internal/events.js";
export type { AutocompleteInputChangeReason } from "../../internal/events.js";
export type AutocompleteProps<T = AutocompleteOption> = FieldBaseProps &
	Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
		/**
The suggestions. Sort them by group when you use groupBy.
*/
		options: readonly T[];
		/**
The chosen option (controlled); an array with `multiple`; a string is allowed with `freeSolo`. Null for none.
*/
		value?: T | string | Array<T | string> | null;
		/**
The starting value (uncontrolled).
*/
		defaultValue?: T | string | Array<T | string> | null;
		/**
Called with the new value and why it changed.
*/
		onChange?: (
			event: React.SyntheticEvent,
			value: any,
			reason: AutocompleteChangeReason,
		) => void;
		/**
The text in the input (controlled).
*/
		inputValue?: string;
		/**
The starting text (uncontrolled). Default: the chosen option's label.
*/
		defaultInputValue?: string;
		/**
Called when the text changes: typing (input), after a choice (reset) or the clear button (clear).
*/
		onInputChange?: (
			event: React.SyntheticEvent | null,
			value: string,
			reason: AutocompleteInputChangeReason,
		) => void;
		/**
Popup open state (controlled).
*/
		open?: boolean;
		/**
Start with the popup open (uncontrolled), e.g. in a showcase.
*/
		defaultOpen?: boolean;
		/**
Called when the popup asks to open.
*/
		onOpen?: (event: React.SyntheticEvent) => void;
		/**
Called when the popup asks to close, with the reason.
*/
		onClose?: (
			event: React.SyntheticEvent,
			reason: AutocompleteCloseReason,
		) => void;
		/**
Choose several: removable chips before the input.
*/
		multiple?: boolean;
		/**
Accept any text, not only an option: Enter commits what was typed.
*/
		freeSolo?: boolean;
		/**
Hide the clear button.
*/
		disableClearable?: boolean;
		/**
Keep the popup open after a choice (handy with multiple).
*/
		disableCloseOnSelect?: boolean;
		/**
Open the popup when the input takes focus.
*/
		openOnFocus?: boolean;
		/**
Highlight the first match while typing, so Enter takes it.
*/
		autoHighlight?: boolean;
		/**
Escape on a closed popup clears the text and the value.
*/
		clearOnEscape?: boolean;
		/**
Options are on their way: the popup says loadingText while the list is empty.
*/
		loading?: boolean;
		/**
Default "Loading…".
*/
		loadingText?: React.ReactNode;
		/**
Default "No options".
*/
		noOptionsText?: React.ReactNode;
		/**
The text for an option. Default: the string itself, or `option.label`.
*/
		getOptionLabel?: (option: T | string) => string;
		/**
Options that can't be chosen; the keyboard skips them. Default: `option.disabled`.
*/
		getOptionDisabled?: (option: T) => boolean;
		/**
Match an option against the value. Default: same `value` field, else same label.
*/
		isOptionEqualToValue?: (option: T, value: T | string) => boolean;
		/**
Group heading for an option; consecutive options with one heading form a group.
*/
		groupBy?: (option: T) => string;
		/**
Replace the default filter (accent- and case-insensitive "contains" on the label).
*/
		filterOptions?: (
			options: readonly T[],
			state: {
				inputValue: string;
				getOptionLabel: (option: T | string) => string;
			},
		) => T[];
		/**
Custom row content; `label` arrives with the match already highlighted.
*/
		renderOption?: (
			option: T,
			state: {
				selected: boolean;
				inputValue: string;
				label: React.ReactNode;
			},
		) => React.ReactNode;
		/**
Hint in the empty input, in color-muted. Never a substitute for the label.
*/
		placeholder?: string;
		/**
Form field name (the input's text; one hidden input per chip with multiple).
*/
		name?: string;
		/**
The input's id. Generated when omitted.
*/
		id?: string;
		/**
Focusable, not editable.
*/
		readOnly?: boolean;
		/**
Focus the input on mount.
*/
		autoFocus?: boolean;
		/**
Inside the pill before the input: an InputAdornment or Icon (search).
*/
		startAdornment?: React.ReactNode;
		/**
Render the popup in place instead of in document.body (showcases, dialogs).
*/
		disablePortal?: boolean;
		/**
Extra attributes for the <input>.
*/
		inputProps?: Record<string, unknown>;
		/**
Ref to the <input>.
*/
		inputRef?: React.Ref<HTMLInputElement>;
	};
function defaultLabel(option: unknown): string {
	if (option === null || option === undefined) {
		return "";
	}

	const label =
		typeof option === "object" && "label" in option
			? (option.label ?? "")
			: option;
	// eslint-disable-next-line @typescript-eslint/no-base-to-string -- The reference stringifies an arbitrary generic option as its final fallback.
	return String(label);
}

const prevent = (event: React.SyntheticEvent) => {
	event.preventDefault();
};

export function Autocomplete<T = AutocompleteOption>({
	ref,
	...props
}: AutocompleteProps<T> & {
	ref?: React.Ref<HTMLDivElement>;
}) {
	const {
		label,
		helperText,
		error = false,
		required = false,
		disabled = false,
		fullWidth = false,
		size = "md",
		variant = "outlined",
		options,
		value: valueProp,
		defaultValue,
		onChange,
		inputValue: inputValueProp,
		defaultInputValue,
		onInputChange,
		open: openProp,
		defaultOpen = false,
		onOpen,
		onClose,
		multiple = false,
		freeSolo = false,
		disableClearable = false,
		disableCloseOnSelect = false,
		openOnFocus = false,
		autoHighlight = false,
		clearOnEscape = false,
		loading = false,
		loadingText = "Loading…",
		noOptionsText = "No options",
		getOptionLabel,
		getOptionDisabled,
		isOptionEqualToValue,
		groupBy,
		filterOptions,
		renderOption,
		placeholder,
		name,
		id: idProp,
		readOnly = false,
		autoFocus,
		startAdornment,
		disablePortal = false,
		inputProps,
		inputRef,
		className,
		style,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledby,
		"aria-describedby": ariaDescribedby,
		...rest
	} = props;
	const id = useId(idProp);
	const labelId = `${id}-label`;
	const helperId = `${id}-helper`;
	const listboxId = `${id}-listbox`;
	const optionId = (i: number) => `${id}-${i}`;
	const extra = (inputProps ?? {}) as Record<string, unknown> & {
		className?: string;
		ref?: React.Ref<HTMLInputElement>;
		onKeyDown?: (event2: React.KeyboardEvent<HTMLInputElement>) => void;
		onFocus?: (event3: React.FocusEvent<HTMLInputElement>) => void;
		onBlur?: (event4: React.FocusEvent<HTMLInputElement>) => void;
	};
	const getLabel = (o: T | string | null): string =>
		o === null || o === undefined
			? ""
			: typeof o === "string"
				? o
				: getOptionLabel
					? getOptionLabel(o)
					: defaultLabel(o);
	const keyOf = (o: T | string): string =>
		typeof o === "object" &&
		o !== null &&
		(
			o as {
				value?: unknown;
			}
		).value !== undefined
			? `v:${String(
					(
						o as {
							value?: unknown;
						}
					).value,
				)}`
			: `l:${getLabel(o)}`;
	const isEq = (o: T | string, v: T | string): boolean =>
		o === v ||
		(v !== null &&
			v !== undefined &&
			o !== null &&
			o !== undefined &&
			(isOptionEqualToValue
				? isOptionEqualToValue(o as T, v)
				: keyOf(o) === keyOf(v)));
	const isDisabled = (o: T | string): boolean =>
		getOptionDisabled
			? getOptionDisabled(o as T)
			: typeof o === "object" &&
				o !== null &&
				(
					o as {
						disabled?: boolean;
					}
				).disabled === true;
	const [value, setValueState] = useControlled<
		T | string | Array<T | string> | null
	>(valueProp, defaultValue ?? (multiple ? [] : null));
	const values: Array<T | string> =
		multiple && Array.isArray(value) ? value : [];
	const single: T | string | null =
		multiple || Array.isArray(value) ? null : (value ?? null);
	const [inputValue, setInputState] = useControlled<string>(
		inputValueProp,
		defaultInputValue ??
			(single !== null && single !== undefined ? getLabel(single) : ""),
	);
	const [open, setOpenState] = useControlled<boolean>(openProp, defaultOpen);
	const [dirty, setDirty] = React.useState(false);
	const [active, setActive] = React.useState(-1);
	const [keyboard, setKeyboard] = React.useState(false);
	const [focused, setFocused] = React.useState(false);
	const [control, setControl] = React.useState<HTMLDivElement | null>(null);
	const anchor = useBaseAnchor(control);
	const [host, setHost] = React.useState<HTMLElement | null>(null);
	const [hasExited, setHasExited] = React.useState(!open);
	const value1Ref = React.useRef<HTMLInputElement | null>(null);
	const handleInputRef = useForkRef(value1Ref, inputRef, extra.ref);
	const value2Ref = React.useRef({ x: -1, y: -1 });
	const isShowingSelection =
		!multiple &&
		single !== null &&
		single !== undefined &&
		!dirty &&
		inputValue === getLabel(single);
	const query = isShowingSelection ? "" : inputValue;
	const filterFor = (text: string): T[] => {
		if (filterOptions) {
			return filterOptions(options, {
				inputValue: text,
				getOptionLabel: getLabel,
			});
		}

		const q = fold(text.trim());
		return q === ""
			? [...options]
			: options.filter((o) => fold(getLabel(o)).includes(q));
	};

	const filtered = filterFor(query);
	const n = filtered.length;
	const isEnabled = (i: number) => i >= 0 && i < n && !isDisabled(filtered[i]);
	const activeIdx = active < n ? active : -1;
	const isSelected = (o: T | string) =>
		multiple
			? values.some((v) => isEq(o, v))
			: single !== null && single !== undefined && isEq(o, single);
	const isPopupOpen =
		open && !disabled && !readOnly && (n > 0 || loading || !freeSolo);
	const { setElement: setPositioner, style: positionerStyle } =
		useContainingBlockPositioner(isPopupOpen || !hasExited, anchor, {
			placement: "bottom-start",
		});
	const hasValue = multiple
		? values.length > 0
		: single !== null && single !== undefined;
	if (isPopupOpen && hasExited) {
		setHasExited(false);
	}

	React.useEffect(() => {
		if (!isPopupOpen || activeIdx < 0) {
			return;
		}

		const raf = requestAnimationFrame(() => {
			const activeId = CSS.escape(optionId(activeIdx));
			scrollIntoViewNearest(document.querySelector(`#${activeId}`));
		});
		return () => {
			cancelAnimationFrame(raf);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPopupOpen, activeIdx]);
	const setInput = (
		event5: React.SyntheticEvent | null,
		text: string,
		reason: AutocompleteInputChangeReason,
	) => {
		if (text === inputValue) {
			return;
		}

		setInputState(text);
		onInputChange?.(event5, text, reason);
	};

	const setValue = (
		event6: React.SyntheticEvent,
		next: T | string | Array<T | string> | null,
		reason: AutocompleteChangeReason,
	) => {
		setValueState(next);
		onChange?.(event6, next, reason);
	};

	const selectedIndexIn = (list: T[]) =>
		!multiple && single !== null && single !== undefined
			? list.findIndex((o) => isEq(o, single))
			: -1;
	const openPopup = (event7: React.SyntheticEvent) => {
		if (open || disabled || readOnly) {
			return;
		}

		setOpenState(true);
		onOpen?.(event7);
	};

	const closePopup = (
		event8: React.SyntheticEvent,
		reason: AutocompleteCloseReason,
	) => {
		setActive(-1);
		if (!open) {
			return;
		}

		setOpenState(false);
		onClose?.(event8, reason);
	};

	const selectOption = (event9: React.SyntheticEvent, option: T | string) => {
		if (readOnly || isDisabled(option)) {
			return;
		}

		if (multiple) {
			const isHas = values.some((v) => isEq(option, v));
			setValue(
				event9,
				isHas ? values.filter((v) => !isEq(option, v)) : [...values, option],
				isHas ? "removeOption" : "selectOption",
			);
			setInput(event9, "", "reset");
			setActive(filterFor("").findIndex((o) => isEq(o, option)));
		} else {
			if (single === null || single === undefined || !isEq(option, single)) {
				setValue(event9, option, "selectOption");
			}

			setInput(event9, getLabel(option), "reset");
		}

		setDirty(false);
		if (!disableCloseOnSelect) {
			closePopup(event9, "selectOption");
		}
	};

	const commitText = (event10: React.SyntheticEvent) => {
		const text = inputValue.trim();
		if (text === "") {
			return;
		}

		if (multiple) {
			if (values.every((v) => getLabel(v) !== text)) {
				setValue(event10, [...values, text], "createOption");
			}

			setInput(event10, "", "reset");
		} else if (
			single === null ||
			single === undefined ||
			getLabel(single) !== text
		) {
			setValue(event10, text, "createOption");
		}

		setDirty(false);
		closePopup(event10, "selectOption");
	};

	const focusTag = (i: number) => {
		const btn = control?.querySelector<HTMLButtonElement>(
			`[data-tag-index="${CSS.escape(String(i))}"] button`,
		);
		if (btn) {
			btn.focus();
		} else {
			value1Ref.current?.focus();
		}
	};

	const removeAt = (
		event11: React.SyntheticEvent,
		i: number,
		refocus: "input" | "tag",
	) => {
		setValue(
			event11,
			values.filter((_, k) => k !== i),
			"removeOption",
		);
		const target = i > 0 ? i - 1 : 0;
		requestAnimationFrame(() => {
			if (refocus === "tag" && values.length > 1) {
				focusTag(target);
			} else {
				value1Ref.current?.focus();
			}
		});
	};

	const clearAll = (event12: React.SyntheticEvent) => {
		setInput(event12, "", "clear");
		if (hasValue) {
			setValue(event12, multiple ? [] : null, "clear");
		}

		setDirty(false);
		setActive(-1);
	};

	const onInputChangeEvent = (event13: React.ChangeEvent<HTMLInputElement>) => {
		(
			extra.onChange as
				((ev: React.ChangeEvent<HTMLInputElement>) => void) | undefined
		)?.(event13);
		const text = event13.target.value;
		setInputState(text);
		onInputChange?.(event13, text, "input");
		setDirty(true);
		if (
			!multiple &&
			!disableClearable &&
			text === "" &&
			single !== null &&
			single !== undefined
		) {
			setValue(event13, null, "clear");
		}

		openPopup(event13);
		if (autoHighlight) {
			const list = filterFor(text);
			setActive(list.findIndex((o) => !isDisabled(o)));
			setKeyboard(true);
		} else {
			setActive(-1);
		}
	};

	const onKeyDown = (event14: React.KeyboardEvent<HTMLInputElement>) => {
		extra.onKeyDown?.(event14);
		if (disabled || readOnly || event14.defaultPrevented) {
			return;
		}

		const k = event14.key;
		switch (k) {
			case "ArrowDown":
			case "ArrowUp": {
				event14.preventDefault();
				if (event14.altKey) {
					if (k === "ArrowDown") {
						openPopup(event14);
					} else {
						closePopup(event14, "escape");
					}

					return;
				}

				setKeyboard(true);
				if (!open) {
					openPopup(event14);
					const sel = selectedIndexIn(filtered);
					setActive(
						sel >= 0
							? sel
							: edgeIndex(k === "ArrowDown" ? 1 : -1, n, isEnabled),
					);
					return;
				}

				setActive(
					stepIndex(activeIdx, k === "ArrowDown" ? 1 : -1, n, isEnabled, true),
				);
				return;
			}

			case "PageDown":
			case "PageUp": {
				if (!isPopupOpen) {
					return;
				}

				event14.preventDefault();
				setKeyboard(true);
				setActive(
					jumpIndex(activeIdx, k === "PageDown" ? 5 : -5, n, isEnabled),
				);
				return;
			}

			case "Home":
			case "End": {
				if (!isPopupOpen || freeSolo) {
					return;
				}

				event14.preventDefault();
				setKeyboard(true);
				setActive(edgeIndex(k === "Home" ? 1 : -1, n, isEnabled));
				return;
			}

			case "Enter": {
				if (event14.nativeEvent.isComposing) {
					return;
				}

				if (isPopupOpen && activeIdx >= 0) {
					event14.preventDefault();
					selectOption(event14, filtered[activeIdx]);
				} else if (freeSolo && inputValue.trim() !== "") {
					event14.preventDefault();
					commitText(event14);
				}

				return;
			}

			case "Escape": {
				if (open) {
					event14.preventDefault();
					event14.stopPropagation();
					closePopup(event14, "escape");
				} else if (clearOnEscape && (inputValue !== "" || hasValue)) {
					event14.preventDefault();
					event14.stopPropagation();
					clearAll(event14);
				}

				return;
			}

			case "Backspace": {
				if (
					multiple &&
					inputValue === "" &&
					values.length > 0 &&
					!Number.isNaN(values.length)
				) {
					removeAt(event14, values.length - 1, "input");
				}

				return;
			}

			case "ArrowLeft": {
				const element_ = event14.currentTarget;
				if (
					multiple &&
					values.length > 0 &&
					!Number.isNaN(values.length) &&
					element_.selectionStart === 0 &&
					element_.selectionEnd === 0
				) {
					event14.preventDefault();
					focusTag(values.length - 1);
				}

				return;
			}

			case "Tab": {
				if (open) {
					closePopup(event14, "blur");
				}

				break;
			}

			default:
		}
	};

	const onTagKeyDown = (
		event15: React.KeyboardEvent<HTMLButtonElement>,
		i: number,
	) => {
		switch (event15.key) {
			case "ArrowLeft": {
				event15.preventDefault();
				if (i > 0) {
					focusTag(i - 1);
				}

				return;
			}

			case "ArrowRight": {
				event15.preventDefault();
				if (i < values.length - 1) {
					focusTag(i + 1);
				} else {
					value1Ref.current?.focus();
				}

				return;
			}

			case "Backspace":
			case "Delete": {
				event15.preventDefault();
				removeAt(event15, i, "tag");
				return;
			}

			case "Escape": {
				event15.preventDefault();
				value1Ref.current?.focus();
				break;
			}

			default:
		}
	};

	const hover = (event16: React.PointerEvent, i: number) => {
		const p = value2Ref.current;
		if (p.x === event16.clientX && p.y === event16.clientY) {
			return;
		}

		value2Ref.current = { x: event16.clientX, y: event16.clientY };
		if (!(isEnabled(i) && (i !== activeIdx || keyboard))) {
			return;
		}

		setActive(i);
		setKeyboard(false);
	};

	const renderRow = (o: T, i: number) => {
		const text = getLabel(o);
		const isSel = isSelected(o);
		const isDis = isDisabled(o);
		const range = query.trim() === "" ? null : matchRange(text, query);
		const content: React.ReactNode = range ? (
			<>
				{text.slice(0, range[0])}
				<span className="gl-autocomplete-match">
					{text.slice(range[0], range[1])}
				</span>
				{text.slice(range[1])}
			</>
		) : (
			text
		);
		const secondary =
			typeof o === "object" && o !== null
				? (
						o as {
							secondary?: React.ReactNode;
						}
					).secondary
				: undefined;
		return (
			<BaseCombobox.Item
				key={`${keyOf(o)}:${i}`}
				value={o}
				disabled={isDis}
				index={i}
				render={<li id={optionId(i)} />}
				role="option"
				aria-selected={isSel}
				aria-disabled={isDis || undefined}
				className="gl-option"
				data-active={i === activeIdx && keyboard ? "" : undefined}
				data-row-index={i}
				onPointerMove={(event17) => {
					hover(event17, i);
				}}
				onClickCapture={rememberReactEvent}
			>
				{renderOption ? (
					renderOption(o, {
						selected: isSel,
						inputValue: query,
						label: content,
					})
				) : (
					<span className="gl-option-text">
						<span>{content}</span>
						{hasContent(secondary) ? (
							<span className="gl-option-secondary">{secondary}</span>
						) : null}
					</span>
				)}
				{isSel ? (
					<span className="gl-option-end">
						<Icon name="check" size={16} />
					</span>
				) : null}
			</BaseCombobox.Item>
		);
	};

	const labelledBy =
		ariaLabelledby ?? (hasContent(label) ? labelId : undefined);
	const listProps = {
		id: listboxId,
		role: "listbox",
		className: "gl-listbox gl-autocomplete-listbox",
		"aria-labelledby": labelledBy,
		"aria-label":
			labelledBy !== undefined && labelledBy !== "" ? undefined : ariaLabel,
		"aria-multiselectable": multiple || undefined,
		onPointerLeave() {
			if (!keyboard) {
				setActive(-1);
			}
		},
	};
	let list: React.ReactNode;
	if (groupBy) {
		const groups: Array<{
			key: string;
			items: Array<[T, number]>;
		}> = [];
		for (const [i, o] of filtered.entries()) {
			const g = groupBy(o);
			const last = groups.at(-1);
			if (last?.key === g) {
				last.items.push([o, i]);
			} else {
				groups.push({ key: g, items: [[o, i]] });
			}
		}

		list = (
			<BaseCombobox.List {...listProps}>
				{groups.map((g, gi) => (
					<BaseCombobox.Group
						key={`${g.key}-${keyOf(g.items[0][0])}`}
						render={<ul />}
						role="group"
						aria-labelledby={`${id}-group-${gi}`}
						className="gl-listbox gl-autocomplete-group"
					>
						<BaseCombobox.GroupLabel
							render={<li />}
							role="presentation"
							id={`${id}-group-${gi}`}
							className="gl-option-group"
						>
							{g.key}
						</BaseCombobox.GroupLabel>
						{g.items.map(([o, i]) => renderRow(o, i))}
					</BaseCombobox.Group>
				))}
			</BaseCombobox.List>
		);
	} else {
		list = (
			<BaseCombobox.List render={<ul />} {...listProps}>
				{filtered.map((entry, entryIndex) => renderRow(entry, entryIndex))}
			</BaseCombobox.List>
		);
	}

	const start = renderSlot(startAdornment, "start", `${id}-start`);
	const isClearable = !disableClearable && !disabled && !readOnly;
	const canClear = isClearable && (inputValue !== "" || hasValue);
	const endCount = (isClearable ? 1 : 0) + (freeSolo ? 0 : 1);
	const statusText =
		isPopupOpen && n === 0
			? loading
				? typeof loadingText === "string"
					? loadingText
					: "Loading…"
				: typeof noOptionsText === "string"
					? noOptionsText
					: "No options"
			: "";
	const Control = multiple ? BaseCombobox.Chips : "div";
	const content = (
		<FieldShell
			rootRef={ref}
			kind="gl-autocomplete"
			className={className}
			style={style}
			rootProps={rest}
			label={label}
			labelId={labelId}
			htmlFor={id}
			helperText={helperText}
			helperId={helperId}
			error={error}
			required={required}
			disabled={disabled}
			readOnly={readOnly}
			fullWidth={fullWidth}
			size={size}
			variant={variant}
			modifiers={cx(
				multiple && "gl-autocomplete-multiple",
				multiple && values.length > 0 && "gl-autocomplete-has-tags",
			)}
		>
			<Control
				ref={setControl}
				className="gl-field-control gl-autocomplete-control"
				data-focused={focused && !disabled ? "" : undefined}
				data-open={isPopupOpen ? "" : undefined}
				data-end={endCount}
				onMouseDown={(event18: React.MouseEvent<HTMLDivElement>) => {
					focusFromPadding(event18, value1Ref.current, disabled);
				}}
			>
				{start.el}
				{multiple
					? values.map((v, i) => {
							const text = getLabel(v);
							return (
								<BaseCombobox.Chip
									key={keyOf(v)}
									render={<span />}
									tabIndex={-1}
									className="gl-autocomplete-tag"
									data-tag-index={i}
									onKeyDown={(event) => {
										if (event.defaultPrevented) {
											event.preventBaseUIHandler();
										}
									}}
								>
									<span className="gl-autocomplete-tag-label">{text}</span>
									{!disabled && !readOnly ? (
										<button
											type="button"
											tabIndex={-1}
											className="gl-autocomplete-tag-remove"
											aria-label={`Remove ${text}`}
											onMouseDown={prevent}
											onClick={(
												event19: React.MouseEvent<HTMLButtonElement>,
											) => {
												removeAt(event19, i, "input");
											}}
											onKeyDown={(
												event20: React.KeyboardEvent<HTMLButtonElement>,
											) => {
												onTagKeyDown(event20, i);
											}}
										>
											<Icon name="close" size={12} />
										</button>
									) : null}
								</BaseCombobox.Chip>
							);
						})
					: null}
				<BaseCombobox.Input
					{...extra}
					ref={handleInputRef}
					id={id}
					name={multiple ? undefined : name}
					type="text"
					role="combobox"
					className={cx(
						"gl-field-input",
						"gl-autocomplete-input",
						extra.className,
					)}
					value={inputValue}
					placeholder={multiple && values.length > 0 ? undefined : placeholder}
					disabled={disabled}
					readOnly={readOnly}
					required={required && !hasValue}
					aria-required={required || undefined}
					// eslint-disable-next-line jsx-a11y-x/no-autofocus -- Forward the documented input option.
					autoFocus={autoFocus}
					autoComplete="off"
					autoCapitalize="none"
					spellCheck={false}
					aria-autocomplete="list"
					aria-expanded={isPopupOpen}
					aria-controls={isPopupOpen ? listboxId : undefined}
					aria-activedescendant={
						isPopupOpen && activeIdx >= 0 ? optionId(activeIdx) : undefined
					}
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledby}
					aria-describedby={idList(
						hasContent(helperText) && helperId,
						ariaDescribedby,
					)}
					aria-invalid={error || undefined}
					onChangeCapture={rememberReactEvent}
					onChange={onInputChangeEvent}
					onKeyDown={(event) => {
						rememberReactEvent(event);
						onKeyDown(event);
						if (
							event.defaultPrevented ||
							(multiple && inputValue === "" && event.key === "Backspace") ||
							event.key === "Enter" ||
							(freeSolo && (event.key === "Home" || event.key === "End"))
						) {
							event.preventBaseUIHandler();
						}
					}}
					onMouseDownCapture={rememberReactEvent}
					onFocus={(event21: React.FocusEvent<HTMLInputElement>) => {
						setFocused(true);
						if (openOnFocus) {
							openPopup(event21);
						}

						extra.onFocus?.(event21);
					}}
					onBlur={(event22: React.FocusEvent<HTMLInputElement>) => {
						setFocused(false);
						closePopup(event22, "blur");
						if (!freeSolo) {
							setInput(
								event22,
								multiple || single === null || single === undefined
									? ""
									: getLabel(single),
								"reset",
							);
						}

						setDirty(false);
						extra.onBlur?.(event22);
					}}
				/>
				{endCount !== 0 && !Number.isNaN(endCount) ? (
					<span className="gl-autocomplete-end">
						{isClearable ? (
							<button
								type="button"
								tabIndex={-1}
								className="gl-autocomplete-button gl-autocomplete-clear"
								aria-label="Clear"
								title="Clear"
								data-empty={canClear ? undefined : ""}
								onMouseDown={prevent}
								onClick={(event23: React.MouseEvent<HTMLButtonElement>) => {
									clearAll(event23);
									value1Ref.current?.focus();
								}}
							>
								<Icon name="close" size={16} />
							</button>
						) : null}
						{freeSolo ? null : (
							<button
								type="button"
								tabIndex={-1}
								className="gl-autocomplete-button gl-autocomplete-popup-indicator"
								aria-label={isPopupOpen ? "Close" : "Open"}
								title={isPopupOpen ? "Close" : "Open"}
								disabled={disabled}
								onMouseDown={prevent}
								onClick={(event24: React.MouseEvent<HTMLButtonElement>) => {
									if (readOnly) {
										return;
									}

									if (open) {
										closePopup(event24, "toggleInput");
									} else {
										setKeyboard(false);
										openPopup(event24);
									}

									value1Ref.current?.focus();
								}}
							>
								<Icon name="chevron-down" size={16} />
							</button>
						)}
					</span>
				) : null}
			</Control>
			{multiple && name !== undefined && name !== ""
				? values.map((v, i) => (
						<input
							key={keyOf(v)}
							type="hidden"
							name={name}
							value={getLabel(v)}
						/>
					))
				: null}
			<span className="gl-sr-only" role="status" aria-live="polite">
				{statusText}
			</span>
			{disablePortal ? (
				<span ref={setHost} style={{ display: "contents" }} />
			) : null}
			<BaseCombobox.Portal container={disablePortal ? host : undefined}>
				<BaseCombobox.Positioner
					ref={setPositioner}
					{...toPositionerProps({ placement: "bottom-start" })}
					{...toWholePixelOffsets()}
					anchor={anchor}
					className="gl-autocomplete-popper"
					style={{
						...positionerVariables,
						width: "var(--anchor-width)",
						zIndex: "var(--z-modal)",
						...positionerStyle,
					}}
				>
					<Grow
						in={isPopupOpen}
						onExited={() => {
							setHasExited(true);
						}}
					>
						<div
							className="gl-popover gl-popover-pad-sm gl-autocomplete-popup"
							role="presentation"
							onMouseDown={prevent}
						>
							{n === 0 ? (
								<div className="gl-autocomplete-status">
									{loading ? loadingText : noOptionsText}
								</div>
							) : (
								list
							)}
						</div>
					</Grow>
				</BaseCombobox.Positioner>
			</BaseCombobox.Portal>
		</FieldShell>
	);
	const common = {
		id,
		items: options,
		filteredItems: filtered,
		filter: null,
		disabled,
		readOnly,
		open: isPopupOpen || !hasExited,
		openOnInputClick: true,
		modal: false,
		onOpenChange(
			isNext: boolean,
			details: BaseCombobox.Root.OpenChangeEventDetails,
		) {
			details.cancel();
			// The editable field dismisses on input blur, preserving other open fields on the page.
			if (
				disabled ||
				readOnly ||
				(!isNext && details.reason === "outside-press")
			) {
				return;
			}

			const event = documentedEvent(
				details.event,
				value1Ref.current ?? undefined,
			);
			if (isNext) {
				openPopup(event);
			} else {
				const reason = autocompleteCloseReason(details.reason);
				if (reason !== undefined && reason !== "selectOption") {
					closePopup(event, reason);
				}
			}
		},
	};
	if (freeSolo && !multiple) {
		return (
			<BaseAutocomplete.Root<T>
				{...common}
				value={inputValue}
				itemToStringValue={getLabel}
				onValueChange={(next, details) => {
					details.cancel();
					if (details.reason !== "item-press") {
						return;
					}

					const match = filtered.find((option) => getLabel(option) === next);
					if (match !== undefined) {
						selectOption(
							documentedEvent(details.event, value1Ref.current ?? undefined),
							match,
						);
					}
				}}
			>
				{content}
			</BaseAutocomplete.Root>
		);
	}

	return (
		<BaseCombobox.Root<T | string, boolean>
			{...common}
			multiple={multiple}
			value={multiple ? values : single}
			inputValue={inputValue}
			itemToStringLabel={getLabel}
			isItemEqualToValue={isEq}
			onInputValueChange={(_next, details) => {
				details.cancel();
			}}
			onValueChange={(next, details) => {
				details.cancel();
				const event = documentedEvent(
					details.event,
					value1Ref.current ?? undefined,
				);
				if (multiple && Array.isArray(next)) {
					const added = next.find((option) =>
						values.every((chosen) => !isEq(option, chosen)),
					);
					const removed = values.find((chosen) =>
						next.every((option) => !isEq(option, chosen)),
					);
					const changed = added ?? removed;
					if (changed !== undefined) {
						selectOption(event, changed);
					}
				} else if (next !== null && !Array.isArray(next)) {
					selectOption(event, next);
				}
			}}
		>
			{content}
		</BaseCombobox.Root>
	);
}
