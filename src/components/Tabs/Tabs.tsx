"use client";
/**
Tabs, Tab and TabPanel, ported from design-system/components/Tabs/reference.tsx onto Base UI's
Tabs: its Root, List, Tab and Panel give the roles, aria-selected, the press that selects and the
orientation. Tabs keeps the value and passes it to Base UI's root, which never picks one itself.

Where Base UI and the documented API part ways, the API wins:
- Server HTML. Base UI wires aria-controls, aria-labelledby and the roving tab stop in effects,
  after hydration, the reference's defect (docs/reference-defects.md). Here the ids come from
  useId and each tab's value, the tab stop from the selection, and a tab names its panel as
  soon as Tabs' children hold it, or once a panel rendered deeper registers.
- Keys. Base UI's list lands on disabled tabs and leaves the selection to Enter. The README skips
  disabled tabs and selects as the arrows move, as the reference's own handler does.
- Panels. A deselected panel hides at once (Base UI would wait for exit animations), and
  keepMounted keeps a panel's content, not its element, so every aria-controls finds its panel.
*/
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
	/**
	The selected tab's value (controlled). false selects none.
	*/
	value?: TabValue | false;
	/**
	The tab selected first (uncontrolled). Default: the first enabled tab.
	*/
	defaultValue?: TabValue | false;
	/**
	Called with the new value when a tab is chosen by click or by the arrow keys.
	*/
	onChange?: (event: React.SyntheticEvent, value: TabValue) => void;
	/**
	underline: tabs in a row over a sliding ink mark (default). pill: the site's nav pill. side: the client-work selector beside its panels.
	*/
	variant?: "underline" | "pill" | "side";
	/**
	Stretch the tabs to share the row (underline and pill).
	*/
	fullWidth?: boolean;
	/**
	Names the tab list.
	*/
	"aria-label"?: string;
	/**
	Names the tab list by another element's id.
	*/
	"aria-labelledby"?: string;
	/**
	Tab elements, then the TabPanels (wrapped in a Paper or not).
	*/
	children?: React.ReactNode;
};

export type TabProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"value" | "type"
> & {
	/**
	Matches a TabPanel's value. Default: the tab's position (0, 1, 2…).
	*/
	value?: TabValue;
	/**
	The label; children work too.
	*/
	label?: React.ReactNode;
	/**
	Icon before the label, 16px. In the side variant it replaces the orb; null removes the orb.
	*/
	icon?: React.ReactNode;
	/**
	The side variant's orb tint, the site's orb-0, orb-1 and orb-2. Default: by position.
	*/
	orb?: 0 | 1 | 2;
	/**
	Can't be selected; the arrow keys skip it.
	*/
	disabled?: boolean;
	/**
	The label, when label isn't set.
	*/
	children?: React.ReactNode;
};

export type TabPanelProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	The value of the Tab that shows this panel.
	*/
	value: TabValue;
	/**
	Keep the content mounted while hidden, as the site does. false renders it only while selected. Default true.
	*/
	keepMounted?: boolean;
	/**
	The panel's content.
	*/
	children?: React.ReactNode;
};

type TabsContextValue = {
	variant: NonNullable<TabsProps["variant"]>;
	baseId: string;
	value: TabValue | false;
	/**
	The tab that holds tabindex 0: the selected tab, else the first enabled one.
	*/
	tabStop: TabValue | false;
	hasPanel: (value: TabValue) => boolean;
	registerPanel: (value: TabValue) => () => void;
};

const TabsContext = React.createContext<TabsContextValue | undefined>(
	undefined,
);

// Values become id fragments: keep [A-Za-z0-9-] and encode the rest, so "a b" and "a-b" stay apart.
const slug = (value: TabValue) =>
	String(value).replaceAll(
		/[^\dA-Za-z-]/gu,
		(character) => `_${(character.codePointAt(0) ?? 0).toString(16)}`,
	);
const tabIdOf = (baseId: string, value: TabValue) =>
	`${baseId}-tab-${slug(value)}`;
const panelIdOf = (baseId: string, value: TabValue) =>
	`${baseId}-panel-${slug(value)}`;
// 1 and "1" are different values, as Base UI compares them.
const keyOf = (value: TabValue) => `${typeof value}:${value}`;

/**
The indicator's width: the site's mobile tab mark is 16px.
*/
const markWidth = 16;

/**
Room kept clear of the faded edge when a tab is scrolled into view.
*/
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

/**
Adds the values of the TabPanels among `node`'s elements to `into`, without entering the panels,
so the server HTML can point each tab at its panel.
*/
function collectPanels(node: React.ReactNode, into: Set<TabValue>): void {
	if (Array.isArray(node)) {
		for (const child of node as React.ReactNode[]) {
			collectPanels(child, into);
		}

		return;
	}

	if (
		!React.isValidElement<{ children?: React.ReactNode; value?: TabValue }>(
			node,
		) ||
		// A nested Tabs names its own panels.
		node.type === Tabs
	) {
		return;
	}

	if (node.type === TabPanel) {
		if (node.props.value !== undefined) {
			into.add(node.props.value);
		}

		return;
	}

	collectPanels(node.props.children, into);
}

/**
A set of tabs and their panels, where Tab children form the tab list and every other child is the panel area.
*/
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
	// Behaviour only: CSS lays the side selector out as a row on phones; its keys follow after
	// hydration.
	const isPhone = useMediaQuery(media.phone);
	const isVertical = variant === "side" && !isPhone;

	// Tab children go to the list, their value defaulting to their position; the rest is the
	// panel area.
	const items: Array<{ value: TabValue; isDisabled: boolean }> = [];
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

	// A tab names its panel once the panel is known: among Tabs' children, or registered from
	// deeper down after mount, as the reference registers every panel.
	const childPanels = new Set<TabValue>();
	collectPanels(panels, childPanels);
	const [registered, setRegistered] = React.useState<readonly TabValue[]>([]);
	const registerPanel = React.useCallback((panelValue: TabValue) => {
		setRegistered((previous) =>
			previous.includes(panelValue) ? previous : [...previous, panelValue],
		);
		return () => {
			setRegistered((previous) =>
				previous.filter((item) => item !== panelValue),
			);
		};
	}, []);
	// Keyed by content, so hasPanel stays the same function while the panels do.
	const panelKey = [...childPanels].map(keyOf).join("\n");
	const panelKeys = React.useMemo(
		() => new Set(panelKey.split("\n")),
		[panelKey],
	);
	const hasPanel = React.useCallback(
		(tabValue: TabValue) =>
			panelKeys.has(keyOf(tabValue)) || registered.includes(tabValue),
		[panelKeys, registered],
	);

	const contextValue = React.useMemo<TabsContextValue>(
		() => ({ variant, baseId, value, tabStop, hasPanel, registerPanel }),
		[variant, baseId, value, tabStop, hasPanel, registerPanel],
	);

	// Which edges overflow (fades and scroll buttons), and where the underline mark sits. Compared
	// with what was rendered, outside React's update queue, and set only on a real change: an
	// updater function here would be rebased onto stale state while a scroll-priority update is
	// pending, and re-render forever (React error 185).
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
		const start = max > 1 && position > 1;
		const end = max > 1 && position < max - 1;
		const shown = shownRef.current;
		if (shown.overflow.start !== start || shown.overflow.end !== end) {
			shown.overflow = { start, end };
			setOverflow(shown.overflow);
		}

		if (variant === "underline") {
			const tab =
				value === false
					? null
					: ownerDocument(list).getElementById(tabIdOf(baseId, value));
			const x =
				tab && list.contains(tab)
					? Math.round(tab.offsetLeft + tab.offsetWidth / 2 - markWidth / 2)
					: undefined;
			if (shown.mark !== x) {
				shown.mark = x;
				setMark(x);
			}
		}
	});
	const tabKey = items
		.map((item) => `${String(item.value)}:${item.isDisabled ? 1 : 0}`)
		.join("|");
	useIsoLayoutEffect(() => {
		measure();
	}, [measure, value, variant, isVertical, tabKey]);
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

	// Keeps the selected tab in view in a scrolling row: at once on the first paint, smoothly
	// after.
	const hasPaintedRef = React.useRef(false);
	useIsoLayoutEffect(() => {
		const list = listRef.current;
		if (
			list &&
			!isVertical &&
			value !== false &&
			list.scrollWidth > list.clientWidth + 1
		) {
			const tab = ownerDocument(list).getElementById(tabIdOf(baseId, value));
			if (tab && list.contains(tab)) {
				revealTab(list, tab, hasPaintedRef.current && !shouldReduceMotion);
			}
		}

		hasPaintedRef.current = true;
	}, [value, isVertical, baseId, shouldReduceMotion]);

	// The next enabled tab from `from` (an index in `items`), wrapping at the ends.
	const enabledFrom = (from: number, direction: 1 | -1) => {
		const count = items.length;
		for (let step = 1; step <= count; step++) {
			const item = items[(((from + direction * step) % count) + count) % count];
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

		// Base UI's own navigation would land on disabled tabs and leave the selection behind.
		event.preventBaseUIHandler();
		const activeId = ownerDocument(list).activeElement?.id;
		const current = items.findIndex(
			(item) => tabIdOf(baseId, item.value) === activeId,
		);
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
		ownerDocument(list).getElementById(tabIdOf(baseId, target))?.focus();
		// Automatic activation: the selection follows focus.
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
					// Only presses come through: the root is controlled, so Base UI never picks a
					// value of its own.
					if (details.reason === "none" && next !== null) {
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

/**
One tab inside Tabs: a button with role="tab" that selects its panel.
*/
export function Tab({
	value = 0,
	label,
	icon,
	orb = 0,
	disabled = false,
	className,
	onClick,
	children,
	ref,
	...rest
}: TabProps & { ref?: React.Ref<HTMLButtonElement> }) {
	const context = React.use(TabsContext);
	const variant = context?.variant ?? "underline";
	let lead: React.ReactNode = icon ? (
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
		// Outside Tabs there is no list to join: a lone tab, as in the reference.
		return (
			<button
				ref={ref}
				type="button"
				role="tab"
				aria-selected={false}
				disabled={disabled}
				className={cx("gl-tab", className)}
				onClick={onClick}
				{...rest}
			>
				{content}
			</button>
		);
	}

	const { baseId, tabStop, hasPanel } = context;
	return (
		<BaseTabs.Tab
			ref={ref}
			value={value}
			disabled={disabled}
			id={tabIdOf(baseId, value)}
			aria-controls={hasPanel(value) ? panelIdOf(baseId, value) : undefined}
			tabIndex={tabStop === value ? 0 : -1}
			className={cx("gl-tab", className)}
			onClick={(event) => {
				rememberReactEvent(event);
				onClick?.(event);
				// As in the reference, a click your handler prevents doesn't select.
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

/**
The content for one tab: hidden until its tab is selected, then faded in with the site's 280ms crossfade.
*/
export function TabPanel({
	value,
	keepMounted = true,
	className,
	style,
	children,
	ref,
	...rest
}: TabPanelProps & { ref?: React.Ref<HTMLDivElement> }) {
	const context = React.use(TabsContext);
	const isActive = context ? context.value === value : true;
	// Fades in only when switched to, never on the first paint (project-tabs.ts animates only
	// after a switch).
	const [wasActive, setWasActive] = React.useState(isActive);
	const [shouldAnimate, setShouldAnimate] = React.useState(false);
	if (wasActive !== isActive) {
		setWasActive(isActive);
		if (isActive) {
			setShouldAnimate(true);
		}
	}

	const registerPanel = context?.registerPanel;
	useIsoLayoutEffect(() => registerPanel?.(value), [registerPanel, value]);
	const panelClassName = cx(
		"gl-tab-panel",
		shouldAnimate && "gl-tab-panel-animate",
		className,
	);
	// A display in `style` would beat [hidden]: a hidden panel stays hidden whatever it's given.
	const panelStyle: React.CSSProperties | undefined = isActive
		? style
		: { ...style, display: "none" };
	const content = isActive || keepMounted ? children : null;
	if (!context) {
		return (
			<div
				ref={ref}
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

	const { baseId } = context;
	return (
		<BaseTabs.Panel
			ref={ref}
			keepMounted
			value={value}
			id={panelIdOf(baseId, value)}
			aria-labelledby={tabIdOf(baseId, value)}
			hidden={!isActive}
			className={panelClassName}
			style={panelStyle}
			{...rest}
		>
			{content}
		</BaseTabs.Panel>
	);
}
