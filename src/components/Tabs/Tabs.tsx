"use client";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { BaseUIEvent } from "@base-ui/react/types";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { ownerDocument } from "../../internal/dom.js";
import { documentedEvent, rememberReactEvent } from "../../internal/events.js";
import {
	useControlled,
	useEventCallback,
	useId,
	useIsoLayoutEffect,
	useShouldReduceMotion,
} from "../../internal/hooks.js";
import { Icon } from "../Icon/index.js";
import { media, useMediaQuery } from "../useMediaQuery/index.js";

export type TabValue = string | number;

export type TabsProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> & {
	value?: TabValue | false;
	defaultValue?: TabValue | false;
	onChange?: (event: React.SyntheticEvent, value: TabValue) => void;
	variant?: "underline" | "pill" | "side";
	fullWidth?: boolean;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	children?: React.ReactNode;
};

export type TabProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"value" | "type"
> & {
	value?: TabValue;
	label?: React.ReactNode;
	icon?: React.ReactNode;
	orb?: 0 | 1 | 2;
	disabled?: boolean;
	children?: React.ReactNode;
};

export type TabPanelProps = React.HTMLAttributes<HTMLDivElement> & {
	value: TabValue;
	keepMounted?: boolean;
	children?: React.ReactNode;
};

type TabsContextValue = {
	variant: NonNullable<TabsProps["variant"]>;
	baseId: string;
	value: TabValue | false;
	tabStop: TabValue | false;
	hasPanel: (value: TabValue) => boolean;
	tabId: (value: TabValue) => string;
	panelId: (value: TabValue) => string;
	registerPanel: (value: TabValue, id: string | undefined) => () => void;
};

const TabsContext = React.createContext<TabsContextValue | undefined>(
	undefined,
);

const slug = (value: TabValue) =>
	(typeof value === "number" ? "_n" : "") +
	String(value).replaceAll(
		/[^\d\-A-Za-z]/gu,
		(character) => `_${(character.codePointAt(0) ?? 0).toString(16)}`,
	);
const tabIdOf = (baseId: string, value: TabValue) =>
	`${baseId}-tab-${slug(value)}`;
const panelIdOf = (baseId: string, value: TabValue) =>
	`${baseId}-panel-${slug(value)}`;
const keyOf = (value: TabValue) => `${typeof value}:${value}`;

const idLine = (key: string, id: string | undefined) =>
	JSON.stringify([key, id ?? null]);
const idsOf = (key: string) =>
	new Map(
		key
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [valueKey, id] = JSON.parse(line) as [string, string | null];
				return [valueKey, id ?? undefined] as const;
			}),
	);

const markWidth = 16;

function markLeft(tab: HTMLElement): number {
	const halfTab = tab.offsetWidth / 2;
	const halfMark = markWidth / 2;
	return Math.round(tab.offsetLeft + halfTab - halfMark);
}

const edge = 40;

const navigationKeys = new Set([
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"ArrowDown",
	"Home",
	"End",
]);

function revealTab(list: HTMLElement, tab: HTMLElement, isSmooth: boolean) {
	if (getComputedStyle(list).direction === "rtl") {
		tab.scrollIntoView({ block: "nearest", inline: "nearest" });
		return;
	}

	const left = tab.offsetLeft - edge;
	const right = tab.offsetLeft + tab.offsetWidth + edge - list.clientWidth;
	let target: number | undefined;
	if (left < list.scrollLeft) {
		target = Math.max(0, left);
	} else if (right > list.scrollLeft) {
		target = right;
	}

	if (target !== undefined) {
		list.scrollTo({ left: target, behavior: isSmooth ? "smooth" : "auto" });
	}
}

function collectPanels(
	node: React.ReactNode,
	into: Map<string, string | undefined>,
): void {
	if (Array.isArray(node)) {
		for (const child of node as React.ReactNode[]) {
			collectPanels(child, into);
		}

		return;
	}

	if (
		!React.isValidElement<{
			children?: React.ReactNode;
			value?: TabValue;
			id?: string;
		}>(node) ||
		node.type === Tabs
	) {
		return;
	}

	if (node.type === TabPanel) {
		if (node.props.value !== undefined) {
			into.set(keyOf(node.props.value), node.props.id);
		}

		return;
	}

	collectPanels(node.props.children, into);
}

export function Tabs({
	value: valueProp,
	defaultValue,
	onChange,
	variant = "underline",
	fullWidth = false,
	id,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledby,
	className,
	children,
	ref,
	...rest
}: TabsProps & { ref?: React.Ref<HTMLDivElement> }) {
	const baseId = useId(id);
	const listRef = React.useRef<HTMLDivElement | null>(null);
	const shouldReduceMotion = useShouldReduceMotion();
	const isPhone = useMediaQuery(media.phone);
	const isVertical = variant === "side" && !isPhone;

	const items: Array<{ value: TabValue; isDisabled: boolean; id: string }> = [];
	const tabs: React.ReactNode[] = [];
	const panels: React.ReactNode[] = [];
	// eslint-disable-next-line @eslint-react/no-children-to-array -- The documented contract: Tab children form the list.
	for (const child of React.Children.toArray(children)) {
		if (React.isValidElement<TabProps>(child) && child.type === Tab) {
			const tabValue = child.props.value ?? items.length;
			tabs.push(
				// eslint-disable-next-line @eslint-react/no-clone-element -- A Tab's value and orb default to its position.
				React.cloneElement(child, {
					value: tabValue,
					orb: child.props.orb ?? ((items.length % 3) as 0 | 1 | 2),
				}),
			);
			items.push({
				value: tabValue,
				isDisabled: Boolean(child.props.disabled),
				id: child.props.id ?? tabIdOf(baseId, tabValue),
			});
		} else {
			panels.push(child);
		}
	}

	const enabled = items.filter((item) => !item.isDisabled);
	const first = enabled.at(0)?.value ?? false;
	const [value, setValue] = useControlled<TabValue | false>(
		valueProp,
		defaultValue ?? first,
	);
	const tabStop =
		value !== false && enabled.some((item) => item.value === value)
			? value
			: first;

	const select = useEventCallback(
		(event: React.SyntheticEvent, next: TabValue) => {
			if (next === value) {
				return;
			}

			setValue(next);
			onChange?.(event, next);
		},
	);

	const tabIdKey = items
		.map((item) => idLine(keyOf(item.value), item.id))
		.join("\n");
	const tabIds = React.useMemo(() => idsOf(tabIdKey), [tabIdKey]);
	const tabId = React.useCallback(
		(tabValue: TabValue) =>
			tabIds.get(keyOf(tabValue)) ?? tabIdOf(baseId, tabValue),
		[tabIds, baseId],
	);

	const childPanels = new Map<string, string | undefined>();
	collectPanels(panels, childPanels);
	const [registered, setRegistered] = React.useState<
		ReadonlyMap<string, string | undefined>
	>(() => new Map());
	const registerPanel = React.useCallback(
		(panelValue: TabValue, panelElementId: string | undefined) => {
			const key = keyOf(panelValue);
			setRegistered((previous) =>
				previous.has(key) && previous.get(key) === panelElementId
					? previous
					: new Map(previous).set(key, panelElementId),
			);
			return () => {
				setRegistered((previous) => {
					if (!previous.has(key)) {
						return previous;
					}

					const next = new Map(previous);
					next.delete(key);
					return next;
				});
			};
		},
		[],
	);
	const panelKey = [...childPanels]
		.map(([key, panelElementId]) => idLine(key, panelElementId))
		.join("\n");
	const panelIds = React.useMemo(() => idsOf(panelKey), [panelKey]);
	const hasPanel = React.useCallback(
		(tabValue: TabValue) =>
			panelIds.has(keyOf(tabValue)) || registered.has(keyOf(tabValue)),
		[panelIds, registered],
	);
	const panelId = React.useCallback(
		(tabValue: TabValue) =>
			panelIds.get(keyOf(tabValue)) ??
			registered.get(keyOf(tabValue)) ??
			panelIdOf(baseId, tabValue),
		[panelIds, registered, baseId],
	);

	const contextValue = React.useMemo<TabsContextValue>(
		() => ({
			variant,
			baseId,
			value,
			tabStop,
			hasPanel,
			tabId,
			panelId,
			registerPanel,
		}),
		[variant, baseId, value, tabStop, hasPanel, tabId, panelId, registerPanel],
	);

	const [overflow, setOverflow] = React.useState({ start: false, end: false });
	const [mark, setMark] = React.useState<number | undefined>(undefined);
	const shownRef = React.useRef({ overflow, mark });
	useIsoLayoutEffect(() => {
		shownRef.current = { overflow, mark };
	});
	const measure = useEventCallback(() => {
		const list = listRef.current;
		if (!list) {
			return;
		}

		const max = isVertical ? 0 : list.scrollWidth - list.clientWidth;
		const position = Math.abs(list.scrollLeft);
		const isPastStart = max > 1 && position > 1;
		const isBeforeEnd = max > 1 && position < max - 1;
		const shown = shownRef.current;
		if (
			shown.overflow.start !== isPastStart ||
			shown.overflow.end !== isBeforeEnd
		) {
			shown.overflow = { start: isPastStart, end: isBeforeEnd };
			setOverflow(shown.overflow);
		}

		if (variant !== "underline") {
			return;
		}

		const tab =
			value === false
				? null
				: // eslint-disable-next-line unicorn/prefer-query-selector -- An id needs no CSS escaping here.
					ownerDocument(list).getElementById(tabId(value));
		const x = tab && list.contains(tab) ? markLeft(tab) : undefined;
		if (shown.mark === x) {
			return;
		}

		shown.mark = x;
		setMark(x);
	});
	const tabKey = items
		.map((item) => `${String(item.value)}:${item.isDisabled ? 1 : 0}`)
		.join("|");
	useIsoLayoutEffect(() => {
		measure();
	}, [measure, value, variant, isVertical, tabKey, tabId]);
	React.useEffect(() => {
		const list = listRef.current;
		if (!list || typeof ResizeObserver === "undefined") {
			return;
		}

		const observer = new ResizeObserver(() => {
			measure();
		});
		observer.observe(list);
		for (const child of list.children) {
			observer.observe(child);
		}

		return () => {
			observer.disconnect();
		};
	}, [measure, tabKey]);

	const hasPaintedRef = React.useRef(false);
	useIsoLayoutEffect(() => {
		const list = listRef.current;
		if (
			list &&
			!isVertical &&
			value !== false &&
			list.scrollWidth > list.clientWidth + 1
		) {
			// eslint-disable-next-line unicorn/prefer-query-selector -- An id needs no CSS escaping here.
			const tab = ownerDocument(list).getElementById(tabId(value));
			if (tab && list.contains(tab)) {
				revealTab(list, tab, hasPaintedRef.current && !shouldReduceMotion);
			}
		}

		hasPaintedRef.current = true;
	}, [value, isVertical, tabId, shouldReduceMotion]);

	const enabledFrom = (from: number, direction: 1 | -1) => {
		const count = items.length;
		for (let step = 1; step <= count; step++) {
			const offset = direction * step;
			const item = items[(((from + offset) % count) + count) % count];
			if (!item.isDisabled) {
				return item.value;
			}
		}

		return undefined;
	};

	const handleKeyDown = (
		event: BaseUIEvent<React.KeyboardEvent<HTMLDivElement>>,
	) => {
		const list = listRef.current;
		if (!list || !navigationKeys.has(event.key)) {
			return;
		}

		event.preventBaseUIHandler();
		const activeId = ownerDocument(list).activeElement?.id;
		const current = items.findIndex((item) => item.id === activeId);
		if (current === -1 || enabled.length === 0) {
			return;
		}

		const isRtl = !isVertical && getComputedStyle(list).direction === "rtl";
		const nextKeys = isVertical
			? ["ArrowDown", "ArrowRight"]
			: [isRtl ? "ArrowLeft" : "ArrowRight"];
		const previousKeys = isVertical
			? ["ArrowUp", "ArrowLeft"]
			: [isRtl ? "ArrowRight" : "ArrowLeft"];
		let target: TabValue | undefined;
		if (nextKeys.includes(event.key)) {
			target = enabledFrom(current, 1);
		} else if (previousKeys.includes(event.key)) {
			target = enabledFrom(current, -1);
		} else if (event.key === "Home") {
			target = enabled.at(0)?.value;
		} else if (event.key === "End") {
			target = enabled.at(-1)?.value;
		}

		if (target === undefined) {
			return;
		}

		event.preventDefault();
		// eslint-disable-next-line unicorn/prefer-query-selector -- An id needs no CSS escaping here.
		ownerDocument(list).getElementById(tabId(target))?.focus();
		select(event, target);
	};

	const scrollByPage = (direction: 1 | -1) => {
		const list = listRef.current;
		if (!list) {
			return;
		}

		const sign = getComputedStyle(list).direction === "rtl" ? -1 : 1;
		list.scrollBy({
			left: direction * sign * list.clientWidth * 0.8,
			behavior: shouldReduceMotion ? "auto" : "smooth",
		});
	};

	return (
		<TabsContext value={contextValue}>
			<BaseTabs.Root
				ref={ref}
				id={id}
				value={value === false ? null : value}
				orientation={isVertical ? "vertical" : "horizontal"}
				className={cx(
					"gl-tabs",
					`gl-tabs-${variant}`,
					fullWidth && "gl-tabs-full",
					panels.length > 0 && "gl-tabs-with-panels",
					className,
				)}
				onValueChange={(next: TabValue | null, details) => {
					if (next !== null && details.reason === "none") {
						select(documentedEvent(details.event), next);
					}
				}}
				{...rest}
			>
				<div
					className="gl-tabs-bar"
					data-overflow-start={overflow.start ? "" : undefined}
					data-overflow-end={overflow.end ? "" : undefined}
				>
					<BaseTabs.List
						ref={listRef}
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledby}
						className="gl-tabs-list"
						onKeyDown={handleKeyDown}
						onScroll={
							isVertical
								? undefined
								: () => {
										measure();
									}
						}
					>
						{tabs}
						{variant === "underline" && mark !== undefined ? (
							<span
								className="gl-tabs-indicator"
								aria-hidden="true"
								style={{ transform: `translateX(${mark}px)` }}
							/>
						) : null}
					</BaseTabs.List>
					{isVertical ? null : (
						<>
							<button
								type="button"
								className="gl-tabs-scroll gl-tabs-scroll-start"
								tabIndex={-1}
								aria-hidden="true"
								onClick={() => {
									scrollByPage(-1);
								}}
							>
								<Icon name="chevron-left" size={16} />
							</button>
							<button
								type="button"
								className="gl-tabs-scroll gl-tabs-scroll-end"
								tabIndex={-1}
								aria-hidden="true"
								onClick={() => {
									scrollByPage(1);
								}}
							>
								<Icon name="chevron-right" size={16} />
							</button>
						</>
					)}
				</div>
				{panels.length > 0 ? (
					<div className="gl-tabs-panels">{panels}</div>
				) : null}
			</BaseTabs.Root>
		</TabsContext>
	);
}

export function Tab({
	value = 0,
	label,
	icon,
	orb = 0,
	disabled = false,
	className,
	onClick,
	onKeyDown,
	children,
	ref,
	...rest
}: TabProps & { ref?: React.Ref<HTMLButtonElement> }) {
	const context = React.use(TabsContext);
	const variant = context?.variant ?? "underline";
	const hasIcon = Boolean(icon);
	let lead: React.ReactNode = hasIcon ? (
		<span className="gl-tab-icon">{icon}</span>
	) : null;
	if (variant === "side" && icon === undefined) {
		lead = (
			<span className={`gl-tab-orb gl-tab-orb-${orb}`} aria-hidden="true" />
		);
	}

	const content = (
		<>
			{lead}
			<span className="gl-tab-label">{label ?? children}</span>
			{variant === "side" ? (
				<span className="gl-tab-mark" aria-hidden="true">
					<Icon name="check" size={15} />
				</span>
			) : null}
		</>
	);
	if (!context) {
		return (
			<button
				ref={ref}
				type="button"
				role="tab"
				aria-selected={false}
				disabled={disabled}
				data-disabled={disabled ? "" : undefined}
				className={cx("gl-tab", className)}
				onClick={onClick}
				onKeyDown={onKeyDown}
				{...rest}
			>
				{content}
			</button>
		);
	}

	const { tabStop, hasPanel, tabId, panelId } = context;
	return (
		<BaseTabs.Tab
			ref={ref}
			value={value}
			disabled={disabled}
			id={tabId(value)}
			aria-controls={hasPanel(value) ? panelId(value) : undefined}
			tabIndex={tabStop === value ? 0 : -1}
			className={cx("gl-tab", className)}
			onClick={(event) => {
				rememberReactEvent(event);
				onClick?.(event);
				if (event.defaultPrevented) {
					event.preventBaseUIHandler();
				}
			}}
			onKeyDown={(event) => {
				onKeyDown?.(event);
				if (event.defaultPrevented) {
					event.preventBaseUIHandler();
				}
			}}
			{...rest}
		>
			{content}
		</BaseTabs.Tab>
	);
}

export function TabPanel({
	value,
	keepMounted = true,
	id,
	className,
	style,
	children,
	ref,
	...rest
}: TabPanelProps & { ref?: React.Ref<HTMLDivElement> }) {
	const context = React.use(TabsContext);
	const isActive = context ? context.value === value : true;
	const [wasActive, setWasActive] = React.useState(isActive);
	const [shouldAnimate, setShouldAnimate] = React.useState(false);
	if (wasActive !== isActive) {
		setWasActive(isActive);
		if (isActive) {
			setShouldAnimate(true);
		}
	}

	const registerPanel = context?.registerPanel;
	useIsoLayoutEffect(
		() => registerPanel?.(value, id),
		[registerPanel, value, id],
	);
	const panelClassName = cx(
		"gl-tab-panel",
		shouldAnimate && "gl-tab-panel-animate",
		className,
	);
	const panelStyle: React.CSSProperties | undefined = isActive
		? style
		: { ...style, display: "none" };
	const content = isActive || keepMounted ? children : null;
	if (!context) {
		return (
			<div
				ref={ref}
				id={id}
				role="tabpanel"
				tabIndex={0}
				className={panelClassName}
				style={panelStyle}
				{...rest}
			>
				{content}
			</div>
		);
	}

	const { baseId, tabId } = context;
	return (
		<BaseTabs.Panel
			ref={ref}
			keepMounted
			value={value}
			id={id ?? panelIdOf(baseId, value)}
			aria-labelledby={tabId(value)}
			hidden={!isActive}
			className={panelClassName}
			style={panelStyle}
			{...rest}
		>
			{content}
		</BaseTabs.Panel>
	);
}
