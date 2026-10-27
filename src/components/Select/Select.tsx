"use client";
import { Select as BaseSelect } from "@base-ui/react/select";
import * as React from "react";
import { usePopupLayer } from "../../internal/popup-layer.js";
import { useIsHydrating } from "../../internal/transition.js";
import { useContainingBlockPositioner } from "../../internal/anchor.js";
import {
	documentedEvent,
	rememberReactEvent,
	selectCloseReason,
	type SelectCloseReason,
} from "../../internal/events.js";
import { Grow } from "../Transitions/index.js";
import { cx } from "../../internal/cx.js";
import {
	useControlled,
	useEventCallback,
	useForkRef,
	useId,
	usePrevious,
} from "../../internal/hooks.js";
import type { PopoverProps } from "../Popover/index.js";
import { Icon } from "../Icon/index.js";
import {
	FieldShell,
	hasContent,
	idList,
	renderSlot,
} from "../../internal/field.js";
import {
	edgeIndex,
	isPrintableKey,
	jumpIndex,
	scrollIntoViewNearest,
	stepIndex,
	useTypeahead,
} from "../../internal/input-list.js";
import type { FieldBaseProps } from "../TextField/index.js";

export type SelectValue = string | number;
export type { SelectCloseReason } from "../../internal/events.js";
const BaseOptionsContext = React.createContext(false);
/**
One entry of Select's `options` array.
*/
export type SelectOption = {
	/**
The value stored when this row is chosen.
*/
	value: SelectValue;
	/**
What the row and the trigger show. Default: the value.
*/
	label?: React.ReactNode;
	/**
Plain text for typeahead and native mode when the label is not a string.
*/
	textValue?: string;
	/**
Not selectable; the keyboard skips it.
*/
	disabled?: boolean;
	/**
A second line in color-muted.
*/
	secondary?: React.ReactNode;
	/**
A leading icon (16px).
*/
	icon?: React.ReactNode;
};
export type OptionProps = Omit<React.HTMLAttributes<HTMLLIElement>, "value"> & {
	/**
The value stored when this row is chosen.
*/
	value: SelectValue;
	/**
Not selectable; the keyboard skips it.
*/
	disabled?: boolean;
	/**
Plain text for typeahead and native mode when children is not a string.
*/
	textValue?: string;
	/**
A second line in color-muted.
*/
	secondary?: React.ReactNode;
	/**
A leading icon (16px, color-muted).
*/
	icon?: React.ReactNode;
	/**
Set by Select: the raised row with a check.
*/
	selected?: boolean;
	/**
The label. Default: the value.
*/
	children?: React.ReactNode;
};
/**
One row of a Select: a gl-option with role="option"; Select injects its id, state and handlers.
*/
export function Option({
	ref,
	value,
	disabled = false,
	textValue,
	secondary,
	icon,
	selected = false,
	className,
	children,
	...rest
}: OptionProps & {
	ref?: React.Ref<HTMLLIElement>;
}) {
	const isBase = React.use(BaseOptionsContext);
	const hasIcon = Boolean(icon);
	const content = (
		<>
			{hasIcon ? <span className="gl-option-icon">{icon}</span> : null}
			<span className="gl-option-text">
				<span>{hasContent(children) ? children : String(value)}</span>
				{hasContent(secondary) ? (
					<span className="gl-option-secondary">{secondary}</span>
				) : null}
			</span>
			{selected ? (
				<span className="gl-option-end">
					<Icon name="check" size={16} />
				</span>
			) : null}
		</>
	);
	const attributes = {
		...rest,
		className: cx("gl-option", className),
		"data-value": String(value),
	};
	if (isBase) {
		return (
			<BaseSelect.Item
				ref={ref}
				value={value}
				disabled={disabled}
				label={
					textValue ?? (typeof children === "string" ? children : String(value))
				}
				render={<li />}
				{...(attributes as unknown as BaseSelect.Item.Props)}
			>
				{content}
			</BaseSelect.Item>
		);
	}

	return (
		<li
			ref={ref}
			role="option"
			aria-selected={selected}
			aria-disabled={disabled || undefined}
			{...attributes}
		>
			{content}
		</li>
	);
}

export type SelectProps = FieldBaseProps &
	Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
		/**
The chosen value (controlled): one value, or an array with `multiple`. Use null or '' for none.
*/
		value?: SelectValue | SelectValue[] | null;
		/**
The starting value (uncontrolled).
*/
		defaultValue?: SelectValue | SelectValue[] | null;
		/**
Called with the new value (an array with `multiple`).
*/
		onChange?: (event: React.SyntheticEvent, value: any) => void;
		/**
Choose several: chips in the trigger, rows toggle, the list stays open.
*/
		multiple?: boolean;
		/**
Shown in color-muted while nothing is chosen. Never a substitute for the label.
*/
		placeholder?: string;
		/**
The rows as data, instead of <Option> children.
*/
		options?: ReadonlyArray<SelectValue | SelectOption>;
		/**
<Option value="…"> rows.
*/
		children?: React.ReactNode;
		/**
Render a styled native <select> (the platform's own list) instead of the listbox.
*/
		native?: boolean;
		/**
Form field name: hidden inputs carry the value.
*/
		name?: string;
		/**
The trigger's id. Generated when omitted.
*/
		id?: string;
		/**
Focusable but can't be opened or changed.
*/
		readOnly?: boolean;
		/**
Open state (controlled).
*/
		open?: boolean;
		/**
Start open (uncontrolled). Opening on mount doesn't move focus.
*/
		defaultOpen?: boolean;
		/**
Called when the list asks to open.
*/
		onOpen?: (event: React.SyntheticEvent) => void;
		/**
Called when the list asks to close, with the reason.
*/
		onClose?: (
			event: React.SyntheticEvent | KeyboardEvent,
			reason: SelectCloseReason,
		) => void;
		/**
Custom trigger content for the current value.
*/
		renderValue?: (value: any) => React.ReactNode;
		/**
Inside the pill before the value: an InputAdornment or Icon.
*/
		startAdornment?: React.ReactNode;
		/**
Passed to the Popover that holds the list (disablePortal, disableScrollLock, container…).
*/
		PopoverProps?: Partial<PopoverProps>;
	};
type Row = {
	value: SelectValue;
	label: React.ReactNode;
	text: string;
	disabled: boolean;
	secondary?: React.ReactNode;
	icon?: React.ReactNode;
	element: React.ReactElement | null;
};
function plain(node: React.ReactNode): string | null {
	return typeof node === "string" || typeof node === "number"
		? String(node)
		: null;
}

function toRows(
	options: SelectProps["options"],
	children: React.ReactNode,
): Row[] {
	if (options) {
		return options.map((o) => {
			if (typeof o === "object" && o !== null) {
				const label = hasContent(o.label) ? o.label : String(o.value);
				return {
					value: o.value,
					label,
					text: o.textValue ?? plain(label) ?? String(o.value),
					disabled: o.disabled === true,
					secondary: o.secondary,
					icon: o.icon,
					element: null,
				};
			}

			return {
				value: o,
				label: String(o),
				text: String(o),
				disabled: false,
				element: null,
			};
		});
	}

	const rows: Row[] = [];
	// eslint-disable-next-line @eslint-react/no-children-for-each -- Preserve the reference's direct Option children and their attributes.
	React.Children.forEach(children, (child: React.ReactNode) => {
		if (!React.isValidElement(child)) {
			return;
		}

		const p = child.props as OptionProps;
		if (p.value === undefined) {
			return;
		}

		const label = hasContent(p.children) ? p.children : String(p.value);
		rows.push({
			value: p.value,
			label,
			text: p.textValue ?? plain(label) ?? String(p.value),
			disabled: p.disabled === true,
			element: child,
		});
	});
	return rows;
}
/**
A select-only combobox in the field's pill that opens a glass Popover listbox
(the side selector's rows), with the APG keyboard, typeahead, the site's chips
for `multiple` and a styled native select for `native`.
*/

export function Select({
	ref,
	...props
}: SelectProps & {
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
		value: valueProp,
		defaultValue,
		onChange,
		multiple = false,
		placeholder,
		options,
		children,
		native = false,
		name,
		id: idProp,
		readOnly = false,
		open: openProp,
		defaultOpen = false,
		onOpen,
		onClose,
		renderValue,
		startAdornment,
		PopoverProps: popoverProps,
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
	const optionId = (i: number) => `${id}-option-${i}`;
	const rows = React.useMemo(
		() => toRows(options, children),
		[options, children],
	);
	const texts = React.useMemo(() => rows.map((r) => r.text), [rows]);
	const [value, setValue] = useControlled<
		SelectValue | SelectValue[] | null | undefined
	>(valueProp, defaultValue ?? (multiple ? [] : null));
	const values: SelectValue[] = multiple
		? Array.isArray(value)
			? value
			: []
		: value === null ||
			  value === undefined ||
			  value === "" ||
			  Array.isArray(value)
			? []
			: [value];
	const isSelected = (v: SelectValue) => values.includes(v);
	const selectedIndex = rows.findIndex((r) => isSelected(r.value));
	const isEnabled = (i: number) =>
		i >= 0 && i < rows.length && !rows[i].disabled;
	const firstEnabled = () => edgeIndex(1, rows.length, isEnabled);
	const selectedOrFirst = selectedIndex === -1 ? firstEnabled() : selectedIndex;
	const [open, setOpen] = useControlled<boolean>(openProp, defaultOpen);
	const [reportedEscapes] = React.useState(() => new WeakSet<Event>());
	const [active, setActive] = React.useState<number>(() =>
		open ? selectedOrFirst : -1,
	);
	const [keyboard, setKeyboard] = React.useState(false);
	const [anchor, setAnchor] = React.useState<HTMLDivElement | null>(null);
	const [nativeFocus, setNativeFocus] = React.useState(false);
	const triggerRef = React.useRef<HTMLDivElement | null>(null);
	const listRef = React.useRef<HTMLUListElement | null>(null);
	const lastPointerRef = React.useRef({ x: -1, y: -1 });
	const handleTriggerRef = useForkRef<HTMLDivElement>(triggerRef, setAnchor);
	const typeahead = useTypeahead();
	const start = renderSlot(startAdornment, "start", `${id}-start`);
	const describedBy = idList(
		hasContent(helperText) && helperId,
		ariaDescribedby,
	);
	const labelledBy =
		ariaLabelledby ?? (hasContent(label) ? labelId : undefined);
	const openMenu = (
		event: React.SyntheticEvent,
		at?: number,
		isViaKeyboard = false,
	) => {
		if (disabled || readOnly) {
			return;
		}

		setHasOpened(true);
		setActive(at === undefined || at === -1 ? selectedOrFirst : at);
		setKeyboard(isViaKeyboard);
		if (open) {
			return;
		}

		setOpen(true);
		onOpen?.(event);
	};

	const closeMenu = (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: SelectCloseReason,
	) => {
		if (reason === "escapeKeyDown") {
			const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event;
			if (reportedEscapes.has(nativeEvent)) {
				return;
			}

			reportedEscapes.add(nativeEvent);
			popoverProps?.onClose?.(event, reason);
		}

		setOpen(false);
		onClose?.(event, reason);
	};

	const choose = (event: React.SyntheticEvent, i: number) => {
		if (readOnly || i < 0 || i >= rows.length) {
			return;
		}

		const row = rows[i];
		if (row.disabled) {
			return;
		}

		if (multiple) {
			const isHas = isSelected(row.value);
			const toggled = isHas
				? values.filter((v) => v !== row.value)
				: [...values, row.value];
			const order = new Map(
				rows.map((r, k) => [r.value, k] as [SelectValue, number]),
			);
			const next = toggled.toSorted(
				(a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9),
			);
			setValue(next);
			onChange?.(event, next);
			setActive(i);
		} else {
			if (!isSelected(row.value)) {
				setValue(row.value);
				onChange?.(event, row.value);
			}

			closeMenu(event, "select");
		}
	};

	const previousOpen = usePrevious(open);
	React.useEffect(() => {
		if (
			!open ||
			previousOpen !== false ||
			popoverProps?.disableAutoFocus === true
		) {
			return;
		}

		const focusIndex = active < 0 ? selectedOrFirst : active;
		const raf = requestAnimationFrame(() => {
			const target =
				listRef.current?.querySelector<HTMLElement>(
					`[data-row-index="${CSS.escape(String(focusIndex))}"]`,
				) ?? listRef.current;
			target?.focus({ preventScroll: true });
		});
		return () => {
			cancelAnimationFrame(raf);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);
	React.useEffect(() => {
		if (!open || active < 0) {
			return;
		}

		const raf = requestAnimationFrame(() => {
			const activeId = CSS.escape(optionId(active));
			scrollIntoViewNearest(document.querySelector(`#${activeId}`));
		});
		return () => {
			cancelAnimationFrame(raf);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, active]);
	const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (disabled || readOnly) {
			return;
		}

		const k = event.key;
		if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) {
			event.preventDefault();
			openMenu(event, undefined, true);
		} else if (k === "Home" || k === "End") {
			event.preventDefault();
			openMenu(
				event,
				edgeIndex(k === "Home" ? 1 : -1, rows.length, isEnabled),
				true,
			);
		} else if (isPrintableKey(event)) {
			event.preventDefault();
			openMenu(event, typeahead(k, texts, selectedIndex, isEnabled), true);
		}
	};

	const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
		rememberReactEvent(event);
		const target = (event.target as HTMLElement).closest<HTMLElement>(
			"[data-row-index]",
		);
		const focusedIndex = target ? Number(target.dataset.rowIndex) : active;
		const n = rows.length;
		let next: number | null = null;
		switch (event.key) {
			case "ArrowDown": {
				next = stepIndex(focusedIndex, 1, n, isEnabled);
				break;
			}

			case "ArrowUp": {
				if (event.altKey) {
					event.preventDefault();
					if (!multiple && focusedIndex >= 0) {
						choose(event, focusedIndex);
					} else {
						closeMenu(event, "select");
					}

					return;
				}

				next = stepIndex(focusedIndex, -1, n, isEnabled);
				break;
			}

			case "Home": {
				next = edgeIndex(1, n, isEnabled);
				break;
			}

			case "End": {
				next = edgeIndex(-1, n, isEnabled);
				break;
			}

			case "PageDown": {
				next = jumpIndex(focusedIndex, 10, n, isEnabled);
				break;
			}

			case "PageUp": {
				next = jumpIndex(focusedIndex, -10, n, isEnabled);
				break;
			}

			case "Enter":
			case " ": {
				setKeyboard(true);
				return;
			}

			case "Tab": {
				event.preventDefault();
				closeMenu(event, "tabKeyDown");
				return;
			}

			default: {
				if (isPrintableKey(event)) {
					event.preventDefault();
					const i = typeahead(event.key, texts, focusedIndex, isEnabled);
					if (i >= 0) {
						next = i;
					} else {
						return;
					}
				}
			}
		}

		if (next === null) {
			return;
		}

		event.preventDefault();
		setKeyboard(true);
		if (next < 0) {
			return;
		}

		setActive(next);
		listRef.current
			?.querySelector<HTMLElement>(
				`[data-row-index="${CSS.escape(String(next))}"]`,
			)
			?.focus({ preventScroll: true });
	};

	const shellProps = {
		rootRef: ref,
		kind: "gl-select",
		className,
		style,
		rootProps: rest,
		label,
		labelId,
		helperText,
		helperId,
		error,
		required,
		disabled,
		readOnly,
		fullWidth,
		size,
		variant,
	};
	const isHydrating = useIsHydrating();
	const [wasHydrating] = React.useState(isHydrating);
	const [hasOpened, setHasOpened] = React.useState(false);
	const layer = usePopupLayer({
		open: open && !native,
		anchorEl: anchor,
		placement: popoverProps?.placement ?? "bottom-start",
		offset: popoverProps?.offset ?? 8,
		matchWidth: popoverProps?.matchWidth ?? true,
		keepMounted: popoverProps?.keepMounted ?? false,
		disablePortal: popoverProps?.disablePortal ?? false,
		container: popoverProps?.container,
		disableAutoFocus: true,
		disableRestoreFocus: popoverProps?.disableRestoreFocus,
		disableEnforceFocus: popoverProps?.disableEnforceFocus,
		pageIsolation: "inert",
		disableScrollLock: popoverProps?.disableScrollLock,
		onBackdropClick(event) {
			popoverProps?.onClose?.(event, "backdropClick");
			closeMenu(event, "backdropClick");
		},
		getInitialFocusTarget() {
			return undefined;
		},
		getReturnTarget: (surface) =>
			surface.querySelector<HTMLElement>('[role="option"][tabindex="0"]') ??
			surface,
	});
	const { setElement: setPositioner, style: positionerStyle } =
		useContainingBlockPositioner(layer.isPresent, anchor, {
			placement: popoverProps?.placement ?? "bottom-start",
			offset: popoverProps?.offset ?? 8,
		});
	const { restoreFocus } = layer;
	const preserveInitialFocus = React.useCallback(
		(surfaceElement: HTMLDivElement | null) => {
			if (
				!surfaceElement ||
				hasOpened ||
				(!popoverProps?.disablePortal && !popoverProps?.disableEnforceFocus)
			) {
				return;
			}

			// Base UI focuses a selected item on mount; defaultOpen keeps the page's prior focus.
			const { ownerDocument } = surfaceElement;
			const previous = ownerDocument.activeElement;
			let frame = 0;
			queueMicrotask(() => {
				frame = requestAnimationFrame(() => {
					const { activeElement } = ownerDocument;
					if (
						!surfaceElement.isConnected ||
						!surfaceElement.contains(activeElement) ||
						!(activeElement instanceof HTMLElement)
					) {
						return;
					}

					if (
						previous instanceof HTMLElement &&
						previous !== ownerDocument.body
					) {
						restoreFocus(previous);
					} else {
						activeElement.blur();
					}
				});
			});
			return () => {
				cancelAnimationFrame(frame);
			};
		},
		[
			hasOpened,
			popoverProps?.disablePortal,
			popoverProps?.disableEnforceFocus,
			restoreFocus,
		],
	);
	const handleSurfaceRef = useForkRef(layer.surfaceRef, preserveInitialFocus);
	const onDocumentKeyDown = useEventCallback((event: KeyboardEvent) => {
		if (
			event.key !== "Escape" ||
			!layer.isReporting() ||
			event.defaultPrevented
		) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		const wrapped = documentedEvent(
			event,
			layer.surfaceRef.current ?? undefined,
		);
		closeMenu(wrapped, "escapeKeyDown");
	});
	React.useEffect(() => {
		if (!open || native) {
			return;
		}

		document.addEventListener("keydown", onDocumentKeyDown);
		return () => {
			document.removeEventListener("keydown", onDocumentKeyDown);
		};
	}, [open, native, onDocumentKeyDown]);
	if (native) {
		const stringValue = multiple
			? values.map(String)
			: values.length > 0
				? String(values[0])
				: "";
		return (
			<FieldShell
				{...shellProps}
				htmlFor={id}
				modifiers={cx(
					"gl-select-native-field",
					multiple && "gl-select-native-multiple",
				)}
			>
				<div
					className="gl-field-control gl-select-native-control"
					data-focused={nativeFocus && !disabled ? "" : undefined}
				>
					{start.el}
					<select
						id={id}
						name={name}
						className="gl-field-input gl-select-native"
						value={stringValue}
						multiple={multiple}
						disabled={disabled}
						required={required}
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledby}
						aria-describedby={describedBy}
						aria-invalid={error || undefined}
						aria-readonly={readOnly || undefined}
						data-empty={!multiple && stringValue === "" ? "" : undefined}
						onFocus={() => {
							setNativeFocus(true);
						}}
						onBlur={() => {
							setNativeFocus(false);
						}}
						onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
							if (readOnly) {
								return;
							}

							const element_ = event.target;
							const find = (s: string) =>
								rows.find((r) => String(r.value) === s);
							const next = multiple
								? [...element_.selectedOptions].map(
										(option) => find(option.value)?.value ?? option.value,
									)
								: element_.value === ""
									? null
									: (find(element_.value)?.value ?? element_.value);
							setValue(next);
							onChange?.(event, next);
						}}
					>
						{!multiple && (placeholder !== undefined || stringValue === "") ? (
							<option value="" disabled={required}>
								{placeholder ?? ""}
							</option>
						) : null}
						{rows.map((r) => (
							<option
								key={String(r.value)}
								value={String(r.value)}
								disabled={r.disabled}
							>
								{r.text}
							</option>
						))}
					</select>
					{multiple ? null : (
						<span className="gl-select-icon" aria-hidden="true">
							<Icon name="chevron-down" size={16} />
						</span>
					)}
				</div>
			</FieldShell>
		);
	}

	const placeholderElement = (
		<span className="gl-select-placeholder">{placeholder ?? ""}</span>
	);
	let display: React.ReactNode;
	if (renderValue && values.length > 0) {
		display = (
			<span className="gl-select-value">
				<span className="gl-select-current">{renderValue(value)}</span>
			</span>
		);
	} else if (multiple && values.length > 0) {
		display = (
			<span className="gl-select-chips">
				{values.map((v) => {
					const r = rows.find((x) => x.value === v);
					return (
						<span key={String(v)} className="gl-select-chip">
							{r ? r.label : String(v)}
						</span>
					);
				})}
			</span>
		);
	} else {
		const r = selectedIndex === -1 ? null : rows[selectedIndex];
		// Every label sits invisibly in the same grid cell, so the trigger is as wide as the longest one.
		display = (
			<span className="gl-select-value">
				{multiple
					? null
					: rows.map((x) => (
							<span
								key={`${typeof x.value}-${x.value}`}
								className="gl-select-sizer"
								aria-hidden="true"
							>
								{x.label}
							</span>
						))}
				{!multiple && placeholder !== undefined && placeholder !== "" ? (
					<span className="gl-select-sizer" aria-hidden="true">
						{placeholder}
					</span>
				) : null}
				<span className="gl-select-current">
					{r ? r.label : placeholderElement}
				</span>
			</span>
		);
	}

	const {
		open: _surfaceOpen,
		anchorEl: _surfaceAnchor,
		onClose: _surfaceClose,
		placement: _surfacePlacement,
		offset: _surfaceOffset,
		matchWidth: _surfaceWidth,
		padding: _surfacePadding,
		keepMounted: _surfaceKeep,
		disablePortal: _surfacePortal,
		container: _surfaceContainer,
		disableAutoFocus: _surfaceAutoFocus,
		disableRestoreFocus: _surfaceRestore,
		disableEnforceFocus: _surfaceEnforce,
		disableScrollLock: _surfaceLock,
		transitionDuration: _surfaceDuration,
		className: _surfaceClass,
		style: _surfaceStyle,
		children: _surfaceChildren,
		...popoverSurfaceProps
	} = popoverProps ?? {};
	const renderList = (isBase: boolean) => {
		const List = (isBase ? BaseSelect.List : "ul") as React.ElementType;
		return (
			<BaseOptionsContext value={isBase}>
				<List
					ref={listRef}
					id={listboxId}
					role="listbox"
					tabIndex={-1}
					className="gl-listbox gl-select-listbox"
					aria-labelledby={labelledBy}
					aria-label={
						labelledBy !== undefined && labelledBy !== ""
							? undefined
							: ariaLabel
					}
					aria-multiselectable={multiple || undefined}
					onClickCapture={rememberReactEvent}
					onKeyDown={onListKeyDown}
				>
					{rows.map((r, i) => {
						const own = (r.element?.props ?? {}) as {
							onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
							onPointerMove?: (
								event: React.PointerEvent<HTMLLIElement>,
							) => void;
						};
						const injected = {
							"data-row-index": i,
							id: optionId(i),
							value: r.value,
							selected: isSelected(r.value),
							disabled: r.disabled,
							"data-active": i === active && keyboard ? "" : undefined,
							onClick(event: React.MouseEvent<HTMLLIElement>) {
								own.onClick?.(event);
								rememberReactEvent(event);
							},
							onPointerMove(event: React.PointerEvent<HTMLLIElement>) {
								own.onPointerMove?.(event);
								const p = lastPointerRef.current;
								if (p.x === event.clientX && p.y === event.clientY) {
									return;
								}

								lastPointerRef.current = { x: event.clientX, y: event.clientY };
								if (r.disabled || (i === active && !keyboard)) {
									return;
								}

								setActive(i);
								setKeyboard(false);
							},
						};
						return r.element ? (
							// eslint-disable-next-line @eslint-react/no-clone-element -- Select preserves an Option child's attributes and injects its current state.
							React.cloneElement(r.element, {
								...injected,
								key: `${typeof r.value}-${r.value}`,
							})
						) : (
							<Option
								key={`${typeof r.value}-${r.value}`}
								{...injected}
								secondary={r.secondary}
								icon={r.icon}
							>
								{r.label}
							</Option>
						);
					})}
				</List>
			</BaseOptionsContext>
		);
	};

	const surface = (isBase: boolean) => (
		<div
			{...popoverSurfaceProps}
			ref={handleSurfaceRef}
			tabIndex={-1}
			className={cx(
				"gl-popover",
				`gl-popover-pad-${popoverProps?.padding ?? "sm"}`,
				"gl-select-popover",
				popoverProps?.className,
			)}
			style={{
				...layer.surfaceStyle,
				maxHeight:
					"min(max(var(--gl-available-height, var(--available-height)), 80px), 480px)",
				...popoverProps?.style,
			}}
			onFocus={(event) => {
				popoverSurfaceProps.onFocus?.(event);
				layer.markInside(event);
			}}
		>
			{renderList(isBase)}
		</div>
	);
	function renderPopup() {
		if (isHydrating && popoverProps?.disablePortal === true) {
			return open ? surface(false) : null;
		}

		return (
			<BaseSelect.Portal
				ref={layer.portalProps.ref}
				container={layer.portalProps.container}
				role={layer.portalProps.role}
				className={layer.portalProps.className}
				style={layer.portalProps.style}
				data-open={layer.portalProps["data-open"]}
			>
				<BaseSelect.Backdrop {...layer.backdropProps} />
				<BaseSelect.Positioner
					{...layer.positionerProps}
					ref={setPositioner}
					style={{ ...layer.positionerProps.style, ...positionerStyle }}
					alignItemWithTrigger={false}
				>
					<Grow
						{...layer.transitionProps}
						appear={!wasHydrating || hasOpened}
						timeout={popoverProps?.transitionDuration}
					>
						{surface(true)}
					</Grow>
				</BaseSelect.Positioner>
			</BaseSelect.Portal>
		);
	}

	return (
		<BaseSelect.Root<SelectValue, boolean>
			value={multiple ? values : (values[0] ?? null)}
			multiple={multiple}
			name={name}
			disabled={disabled}
			readOnly={readOnly}
			required={required}
			open={layer.isPresent}
			modal={false}
			onValueChange={(next, details) => {
				if (readOnly || disabled) {
					details.cancel();
					return;
				}

				const event = documentedEvent(
					details.event,
					listRef.current ?? undefined,
				);
				if (multiple && Array.isArray(next)) {
					const order = new Map(rows.map((row, index) => [row.value, index]));
					const ordered = next.toSorted(
						(a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9),
					);
					setValue(ordered);
					onChange?.(event, ordered);
				} else if (next !== value) {
					setValue(next);
					onChange?.(event, next);
				}
			}}
			onOpenChange={(next, details) => {
				details.cancel();
				const event = documentedEvent(
					details.event,
					triggerRef.current ?? undefined,
				);
				if (next) {
					if (!open) {
						openMenu(event);
					}
				} else {
					const reason = selectCloseReason(details.reason);
					if (reason === "escapeKeyDown" && layer.isReporting()) {
						event.preventDefault();
						event.stopPropagation();
						closeMenu(event, "escapeKeyDown");
						return;
					}

					if (
						reason === "select" ||
						(reason === "backdropClick" && details.reason === "trigger-press")
					) {
						closeMenu(event, reason);
					}
				}
			}}
		>
			<FieldShell
				{...shellProps}
				modifiers={cx(
					multiple && "gl-select-multiple",
					open && "gl-select-open",
				)}
				onLabelClick={() => triggerRef.current?.focus()}
			>
				<BaseSelect.Trigger
					ref={handleTriggerRef as React.Ref<HTMLButtonElement>}
					nativeButton={false}
					render={<div />}
					id={id}
					role="combobox"
					tabIndex={disabled ? -1 : 0}
					className="gl-field-control gl-select-trigger"
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={open ? listboxId : undefined}
					aria-labelledby={labelledBy}
					aria-label={
						labelledBy !== undefined && labelledBy !== ""
							? undefined
							: ariaLabel
					}
					aria-describedby={describedBy}
					aria-invalid={error || undefined}
					aria-required={required || undefined}
					aria-disabled={disabled || undefined}
					aria-readonly={readOnly || undefined}
					onMouseDownCapture={rememberReactEvent}
					onKeyDown={(event) => {
						onTriggerKeyDown(
							event as unknown as React.KeyboardEvent<HTMLDivElement>,
						);
						if (event.defaultPrevented) {
							event.preventBaseUIHandler();
						}
					}}
					onKeyUp={(event) => {
						if (event.key === " ") {
							event.preventBaseUIHandler();
						}
					}}
				>
					{start.el}
					{display}
					<span className="gl-select-icon" aria-hidden="true">
						<Icon name="chevron-down" size={16} />
					</span>
				</BaseSelect.Trigger>
				{layer.host}
				{renderPopup()}
			</FieldShell>
		</BaseSelect.Root>
	);
}
