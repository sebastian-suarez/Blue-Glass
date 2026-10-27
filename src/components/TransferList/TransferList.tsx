"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useControlled, useId } from "../../internal/hooks.js";
import { Paper } from "../Paper/index.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import {
	edgeIndex,
	isPrintableKey,
	scrollIntoViewNearest,
	stepIndex,
	useTypeahead,
} from "../../internal/input-list.js";

export type TransferListItem =
	| string
	| {
			value: string;
			label?: React.ReactNode;
			secondary?: React.ReactNode;
			disabled?: boolean;
	  };
export type TransferListValue = {
	left: TransferListItem[];
	right: TransferListItem[];
};
export type TransferListSelection = {
	left: string[];
	right: string[];
};
export type TransferListProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> & {
	value?: TransferListValue;
	defaultValue?: TransferListValue;
	onChange?: (event: React.SyntheticEvent, value: TransferListValue) => void;
	selected?: TransferListSelection;
	defaultSelected?: Partial<TransferListSelection>;
	onSelectionChange?: (selection: TransferListSelection) => void;
	leftTitle?: React.ReactNode;
	rightTitle?: React.ReactNode;
	showMoveAll?: boolean;
	listHeight?: number;
	emptyText?: React.ReactNode;
	disabled?: boolean;
};
type Side = "left" | "right";
const keyOf = (item: TransferListItem) =>
	typeof item === "string" ? item : item.value;
const labelOf = (item: TransferListItem): React.ReactNode =>
	typeof item === "string" ? item : (item.label ?? item.value);
const textOf = (item: TransferListItem): string => {
	if (typeof item === "string") {
		return item;
	}

	return typeof item.label === "string" || typeof item.label === "number"
		? String(item.label)
		: item.value;
};

const isItemDisabled = (item: TransferListItem) =>
	typeof item !== "string" && item.disabled === true;
type PaneProps = {
	side: Side;
	id: string;
	title: React.ReactNode;
	items: TransferListItem[];
	selected: string[];
	onToggle: (
		side: Side,
		values: string[],
		mode: "toggle" | "all" | "none",
	) => void;
	listHeight: number;
	emptyText: React.ReactNode;
	disabled: boolean;
};
function Pane({
	side,
	id,
	title,
	items,
	selected,
	onToggle,
	listHeight,
	emptyText,
	disabled,
}: PaneProps) {
	const [active, setActive] = React.useState(-1);
	const [focused, setFocused] = React.useState(false);
	const [keyboard, setKeyboard] = React.useState(false);
	const pressingRef = React.useRef(false);
	const typeahead = useTypeahead();
	const n = items.length;
	const isEnabled = (i: number) => i >= 0 && i < n && !isItemDisabled(items[i]);
	const activeIdx = active < n ? active : n === 0 ? -1 : n - 1;
	const titleId = `${id}-${side}-title`;
	const countId = `${id}-${side}-count`;
	const optionId = (i: number) => `${id}-${side}-item-${i}`;
	const isSel = (item: TransferListItem) => selected.includes(keyOf(item));
	const selectable = items.filter((it) => !isItemDisabled(it));
	const count = items.filter((entry) => isSel(entry)).length;
	React.useEffect(() => {
		if (!focused || activeIdx < 0) {
			return;
		}

		const activeId = CSS.escape(optionId(activeIdx));
		scrollIntoViewNearest(document.querySelector(`#${activeId}`));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focused, activeIdx]);
	const toggle = (i: number) => {
		if (disabled || !isEnabled(i)) {
			return;
		}

		onToggle(side, [keyOf(items[i])], "toggle");
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
		if (disabled) {
			return;
		}

		let next: number | null = null;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowUp": {
				next = stepIndex(
					activeIdx,
					event.key === "ArrowDown" ? 1 : -1,
					n,
					isEnabled,
				);
				if (next !== activeIdx && next >= 0 && event.shiftKey) {
					toggle(next);
				}

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

			case " ": {
				event.preventDefault();
				setKeyboard(true);
				if (activeIdx >= 0) {
					toggle(activeIdx);
				}

				return;
			}

			default: {
				if (
					(event.key === "a" || event.key === "A") &&
					(event.ctrlKey || event.metaKey)
				) {
					event.preventDefault();
					const isAll = selectable.every((entry) => isSel(entry));
					onToggle(
						side,
						selectable.map((entry) => keyOf(entry)),
						isAll ? "none" : "all",
					);
					return;
				}

				if (isPrintableKey(event)) {
					const i = typeahead(
						event.key,
						items.map((entry) => textOf(entry)),
						activeIdx,
						isEnabled,
					);
					if (i >= 0) {
						next = i;
					}
				}
			}
		}

		if (next === null) {
			return;
		}

		event.preventDefault();
		setKeyboard(true);
		if (next >= 0) {
			setActive(next);
		}
	};

	return (
		<Paper variant="inset" className="gl-transfer-list-pane">
			<div className="gl-transfer-list-head">
				<span id={titleId} className="gl-transfer-list-title">
					{title}
				</span>
				<span id={countId} className="gl-transfer-list-count">
					<span aria-hidden="true">{`${count}/${n} selected`}</span>
					<span className="gl-sr-only">{`${count} of ${n} selected`}</span>
				</span>
			</div>
			<div className="gl-transfer-list-body" style={{ height: listHeight }}>
				<ul
					role="listbox"
					aria-multiselectable="true"
					aria-labelledby={titleId}
					aria-describedby={countId}
					aria-disabled={disabled || undefined}
					aria-activedescendant={
						focused && activeIdx >= 0 ? optionId(activeIdx) : undefined
					}
					tabIndex={disabled || n === 0 ? -1 : 0}
					className="gl-listbox gl-transfer-list-list"
					onKeyDown={onKeyDown}
					onFocus={() => {
						setFocused(true);
						setKeyboard(!pressingRef.current);
						if (active < 0 || active >= n) {
							setActive(edgeIndex(1, n, isEnabled));
						}
					}}
					onBlur={() => {
						setFocused(false);
					}}
					onPointerDown={() => {
						pressingRef.current = true;
						setKeyboard(false);
					}}
					onPointerUp={() => {
						pressingRef.current = false;
					}}
					onPointerCancel={() => {
						pressingRef.current = false;
					}}
				>
					{items.map((item, i) => {
						const isSelected = isSel(item);
						const isDis = isItemDisabled(item);
						const secondary =
							typeof item === "string" ? undefined : item.secondary;
						return (
							<li
								key={keyOf(item)}
								id={optionId(i)}
								role="option"
								aria-selected={isSelected}
								aria-disabled={isDis || undefined}
								className="gl-option"
								data-active={
									focused && keyboard && i === activeIdx ? "" : undefined
								}
								onClick={() => {
									if (isDis || disabled) {
										return;
									}

									setActive(i);
									toggle(i);
								}}
							>
								<span className="gl-option-text">
									<span>{labelOf(item)}</span>
									{secondary !== undefined &&
									secondary !== null &&
									secondary !== "" ? (
										<span className="gl-option-secondary">{secondary}</span>
									) : null}
								</span>
								{isSelected ? (
									<span className="gl-option-end">
										<Icon name="check" size={16} />
									</span>
								) : null}
							</li>
						);
					})}
				</ul>
				{n === 0 ? (
					<span className="gl-transfer-list-empty">{emptyText}</span>
				) : null}
			</div>
		</Paper>
	);
}

export function TransferList({
	ref,
	...props
}: TransferListProps & {
	ref?: React.Ref<HTMLDivElement>;
}) {
	const {
		value: valueProp,
		defaultValue,
		onChange,
		selected: selectedProp,
		defaultSelected,
		onSelectionChange,
		leftTitle = "Choices",
		rightTitle = "Chosen",
		showMoveAll = true,
		listHeight = 232,
		emptyText = "No items",
		disabled = false,
		className,
		id: idProp,
		...rest
	} = props;
	const id = useId(idProp);
	const [value, setValue] = useControlled<TransferListValue>(
		valueProp,
		defaultValue ?? { left: [], right: [] },
	);
	const [selected, setSelected] = useControlled<TransferListSelection>(
		selectedProp,
		{
			left: defaultSelected?.left ?? [],
			right: defaultSelected?.right ?? [],
		},
	);
	const [announcement, setAnnouncement] = React.useState("");
	const titleText = (node: React.ReactNode, fallback: string) =>
		typeof node === "string" ? node : fallback;
	const changeSelection = (next: TransferListSelection) => {
		setSelected(next);
		onSelectionChange?.(next);
	};

	const onToggle = (
		side: Side,
		values: string[],
		mode: "toggle" | "all" | "none",
	) => {
		const cur = selected[side];
		let list: string[];
		if (mode === "all") {
			list = [...new Set([...cur, ...values])];
		} else if (mode === "none") {
			list = cur.filter((v) => !values.includes(v));
		} else {
			list = [...cur];
			for (const entryValue of values) {
				list = list.includes(entryValue)
					? list.filter((entry) => entry !== entryValue)
					: [...list, entryValue];
			}
		}

		changeSelection({ ...selected, [side]: list });
	};

	const move = (event: React.SyntheticEvent, from: Side, isAll: boolean) => {
		if (disabled) {
			return;
		}

		const to: Side = from === "left" ? "right" : "left";
		const moving = value[from].filter(
			(it) =>
				!isItemDisabled(it) && (isAll || selected[from].includes(keyOf(it))),
		);
		if (moving.length === 0) {
			return;
		}

		const keys = new Set(moving.map((entry) => keyOf(entry)));
		const next: TransferListValue = {
			...value,
			[from]: value[from].filter((it) => !keys.has(keyOf(it))),
			[to]: [...value[to], ...moving],
		};
		setValue(next);
		onChange?.(event, next);
		changeSelection({
			...selected,
			[from]: selected[from].filter((v) => !keys.has(v)),
		});
		const dest = titleText(
			to === "left" ? leftTitle : rightTitle,
			to === "left" ? "the first list" : "the second list",
		);
		setAnnouncement(
			`Moved ${moving.length} ${moving.length === 1 ? "item" : "items"} to ${dest}.`,
		);
	};

	const isMovable = (side: Side, isAll: boolean) =>
		!disabled &&
		value[side].some(
			(it) =>
				!isItemDisabled(it) && (isAll || selected[side].includes(keyOf(it))),
		);
	const leftName = titleText(leftTitle, "the first list");
	const rightName = titleText(rightTitle, "the second list");
	const action = (label: string, icon: string, from: Side, isAll: boolean) => (
		<Button
			size="sm"
			className="gl-transfer-list-button"
			title={label}
			disabled={!isMovable(from, isAll)}
			onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
				move(event, from, isAll);
			}}
		>
			<Icon name={icon} size={16} />
			<span className="gl-sr-only">{label}</span>
		</Button>
	);
	return (
		<div
			ref={ref}
			id={idProp}
			className={cx(
				"gl-transfer-list",
				disabled && "gl-transfer-list-disabled",
				className,
			)}
			{...rest}
		>
			<div className="gl-transfer-list-grid">
				<Pane
					side="left"
					id={id}
					title={leftTitle}
					items={value.left}
					selected={selected.left}
					listHeight={listHeight}
					emptyText={emptyText}
					disabled={disabled}
					onToggle={onToggle}
				/>
				<div
					className="gl-transfer-list-actions"
					role="group"
					aria-label="Move items"
				>
					{showMoveAll
						? action(`Move all to ${rightName}`, "chevrons-right", "left", true)
						: null}
					{action(
						`Move selected to ${rightName}`,
						"chevron-right",
						"left",
						false,
					)}
					{action(
						`Move selected to ${leftName}`,
						"chevron-left",
						"right",
						false,
					)}
					{showMoveAll
						? action(`Move all to ${leftName}`, "chevrons-left", "right", true)
						: null}
				</div>
				<Pane
					side="right"
					id={id}
					title={rightTitle}
					items={value.right}
					selected={selected.right}
					listHeight={listHeight}
					emptyText={emptyText}
					disabled={disabled}
					onToggle={onToggle}
				/>
			</div>
			<span className="gl-sr-only" role="status" aria-live="polite">
				{announcement}
			</span>
		</div>
	);
}
