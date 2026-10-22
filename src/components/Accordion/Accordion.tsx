"use client";
/**
Accordion, AccordionSummary, AccordionDetails and PaneAccordion, ported from
design-system/components/Accordion/reference.tsx onto Base UI's Accordion.

- An Accordion is one row, and rows sit in any element (gl-accordion-surface is a class, not a
  component), so each row is a Base UI Accordion of one item: the root renders as that item, one
  element, the reference's row. Its Header and Trigger make the summary, a button in a heading.
- The details open with Collapse, as the documented TransitionProps (Collapse's timeout,
  mountOnEnter, unmountOnExit, onEntered, onExited) require. Base UI's Panel animates on its own
  terms, without timeouts or callbacks, so it isn't used; the trigger points at the Collapse's
  region instead.
- Base UI 1.9 dropped the accordion's arrow keys (APG no longer asks for them). The README keeps
  Up, Down, Home and End between the summaries of one list, and all four arrows between panes,
  as the reference handles them.
- PaneAccordion is one Base UI Accordion with a pane per item. Its state is the reference's: a
  pane is open, closed, or not yet touched, which compact layouts show with its chips revealed.
*/
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { documentedEvent, rememberReactEvent } from "../../internal/events.js";
import {
	useControlled,
	useEventCallback,
	useId,
} from "../../internal/hooks.js";
import { Collapse, type CollapseProps } from "../Transitions/index.js";
import { useMediaQuery } from "../useMediaQuery/index.js";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export type AccordionProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange"
> & {
	/**
	Open (controlled). Pair with onChange.
	*/
	expanded?: boolean;
	/**
	Open on first render (uncontrolled).
	*/
	defaultExpanded?: boolean;
	/**
	Called when the summary is pressed, with the requested state.
	*/
	onChange?: (event: React.SyntheticEvent, expanded: boolean) => void;
	/**
	Dims the row; the summary can't be focused or pressed.
	*/
	disabled?: boolean;
	/**
	Level of the heading that wraps the summary button. Default 3.
	*/
	headingLevel?: HeadingLevel;
	/**
	Props for the Collapse that reveals the details: timeout ({ enter: 300, exit: 200 } by default), unmountOnExit.
	*/
	// eslint-disable-next-line @typescript-eslint/naming-convention -- The documented name.
	TransitionProps?: Partial<
		Pick<
			CollapseProps,
			"timeout" | "unmountOnExit" | "mountOnEnter" | "onEntered" | "onExited"
		>
	>;
	/**
	An AccordionSummary first, then the AccordionDetails.
	*/
	children?: React.ReactNode;
};

export type AccordionSummaryProps =
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		/**
		Second column, in color-muted (.career-position): a role, a short fact.
		*/
		secondary?: React.ReactNode;
		/**
		Third column, right-aligned in color-muted (.career-date): a date, a count.
		*/
		meta?: React.ReactNode;
		/**
		Replace the plus/minus toggle with an icon; it turns 180° when open (use chevron-down).
		*/
		expandIcon?: React.ReactNode;
		/**
		The row's title (.career-employer): 17px, -0.02em.
		*/
		children?: React.ReactNode;
	};

export type AccordionDetailsProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	A small closing line at 11px (.career-description > span), such as the role's location.
	*/
	meta?: React.ReactNode;
	/**
	Indent the details under the second column (26% on the left), as the site does. Default true; false runs full width.
	*/
	inset?: boolean;
	children?: React.ReactNode;
};

export type PaneAccordionItem = {
	/**
	Stable id: the React key and the base of the pane's ids. Default: the title, slugified (or the index).
	*/
	id?: string;
	/**
	The pane's title (.pane-title), 22px.
	*/
	title: React.ReactNode;
	/**
	The blurb, always visible (.pane-text).
	*/
	text?: React.ReactNode;
	/**
	Tags revealed when the pane opens (.more > .chips).
	*/
	chips?: React.ReactNode[];
	/**
	Other content to reveal instead of chips.
	*/
	more?: React.ReactNode;
	/**
	default: glass-control. alt: fainter glass. accent: the ring-tinted pane with an accent title; one per set.
	*/
	tone?: "default" | "alt" | "accent";
};

export type PaneAccordionProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange"
> & {
	/**
	The panes, left to right.
	*/
	items: PaneAccordionItem[];
	/**
	auto: the site's layout, panes side by side, stacked at 899px and below.
	horizontal: side by side down to 701px, stacked on phones. vertical: always stacked.
	*/
	orientation?: "auto" | "horizontal" | "vertical";
	/**
	Ids of the open panes (controlled). Panes not listed are closed.
	*/
	open?: string[];
	/**
	Ids of the panes open on first render (uncontrolled).
	*/
	defaultOpen?: string[];
	/**
	Called when a pane is pressed, with the ids that are now open.
	*/
	onChange?: (event: React.SyntheticEvent, open: string[]) => void;
	/**
	Level of the heading around each pane's button. Default 3.
	*/
	headingLevel?: HeadingLevel;
};

type AccordionContextValue = {
	headingLevel: HeadingLevel;
	summaryId: string;
	regionId: string;
};

const AccordionContext = React.createContext<
	AccordionContextValue | undefined
>(undefined);

/**
The heading elements Base UI's Header renders as, by level.
*/
const headings: Record<HeadingLevel, React.ReactElement> = {
	2: <h2 />,
	3: <h3 />,
	4: <h4 />,
	5: <h5 />,
	6: <h6 />,
};

/**
The value of a row's one item, and the root's value open and closed.
*/
const rowItem = "row";
const openRow = [rowItem];
const closedRow: string[] = [];

/**
One row of the site's career list (.career-row): a summary button with the
plus/minus toggle, its details revealed with Collapse. Stack rows inside an
element with class "gl-accordion-surface" for the list's glass surface (.career-surface).
*/
export function Accordion({
	expanded: expandedProp,
	defaultExpanded = false,
	onChange,
	disabled = false,
	headingLevel = 3,
	TransitionProps: transitionProps,
	// A div's defaultValue does nothing, and Base UI's root would read it as its open items.
	defaultValue,
	id,
	className,
	children,
	ref,
	...rest
}: AccordionProps & { ref?: React.Ref<HTMLDivElement> }) {
	const [isExpanded, setExpanded] = useControlled(
		expandedProp,
		defaultExpanded,
	);
	const baseId = useId(id);
	const summaryId = `${baseId}-summary`;
	const regionId = `${baseId}-details`;
	const handleOpenChange = useEventCallback(
		(isOpen: boolean, details: BaseAccordion.Item.ChangeEventDetails) => {
			if (disabled) {
				return;
			}

			setExpanded(isOpen);
			onChange?.(documentedEvent(details.event), isOpen);
		},
	);
	const contextValue = React.useMemo<AccordionContextValue>(
		() => ({ headingLevel, summaryId, regionId }),
		[headingLevel, summaryId, regionId],
	);
	// eslint-disable-next-line @eslint-react/no-children-to-array -- The documented contract: the summary first, then the details.
	const [summary, ...details] = React.Children.toArray(children);
	return (
		<BaseAccordion.Root
			ref={ref}
			// The root renders as its one item, so the row stays one element, as in the reference.
			render={
				<BaseAccordion.Item
					value={rowItem}
					disabled={disabled}
					onOpenChange={handleOpenChange}
				/>
			}
			id={id}
			value={isExpanded ? openRow : closedRow}
			disabled={disabled}
			className={cx(
				"gl-accordion",
				isExpanded && "gl-accordion-expanded",
				disabled && "gl-accordion-disabled",
				className,
			)}
			{...rest}
		>
			<AccordionContext value={contextValue}>
				{summary}
				<Collapse
					in={isExpanded}
					timeout={{ enter: 300, exit: 200 }}
					{...transitionProps}
					className="gl-accordion-collapse"
				>
					<div
						id={regionId}
						role="region"
						aria-labelledby={summaryId}
						className="gl-accordion-region"
					>
						{details}
					</div>
				</Collapse>
			</AccordionContext>
		</BaseAccordion.Root>
	);
}

/**
Up/Down/Home/End move between sibling rows' summaries (WAI-ARIA APG accordion, optional keys).
*/
function moveBetweenRows(event: React.KeyboardEvent<HTMLButtonElement>): void {
	const { key } = event;
	if (
		(key !== "ArrowDown" &&
			key !== "ArrowUp" &&
			key !== "Home" &&
			key !== "End") ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey
	) {
		return;
	}

	const parent = event.currentTarget.closest(".gl-accordion")?.parentElement;
	if (!parent) {
		return;
	}

	const triggers = [
		...parent.querySelectorAll<HTMLButtonElement>(
			":scope > .gl-accordion > .gl-accordion-heading > .gl-accordion-summary",
		),
	].filter((button) => !button.disabled);
	const index = triggers.indexOf(event.currentTarget);
	const count = triggers.length;
	if (index === -1 || count < 2) {
		return;
	}

	let next = count - 1;
	if (key === "ArrowDown") {
		next = (index + 1) % count;
	} else if (key === "ArrowUp") {
		next = (index - 1 + count) % count;
	} else if (key === "Home") {
		next = 0;
	}

	event.preventDefault();
	triggers[next]?.focus();
}

const isShown = (node: React.ReactNode) =>
	node !== undefined && node !== null && node !== false;

/**
The row's header (.career-row summary): a full-width button in a heading,
columns for title, secondary and meta, and the plus that turns into a minus.
*/
export function AccordionSummary({
	secondary,
	meta,
	expandIcon,
	className,
	children,
	onClick,
	onKeyDown,
	ref,
	...rest
}: AccordionSummaryProps & { ref?: React.Ref<HTMLButtonElement> }) {
	const context = React.use(AccordionContext);
	const hasSecondary = isShown(secondary);
	const hasMeta = isShown(meta);
	const buttonClassName = cx(
		"gl-accordion-summary",
		hasSecondary && "gl-accordion-summary-has-secondary",
		hasMeta && "gl-accordion-summary-has-meta",
		className,
	);
	const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		onKeyDown?.(event);
		if (!event.defaultPrevented) {
			moveBetweenRows(event);
		}
	};

	const content = (
		<>
			<span className="gl-accordion-summary-primary">{children}</span>
			{hasSecondary ? (
				<span className="gl-accordion-summary-secondary">{secondary}</span>
			) : null}
			{hasMeta ? (
				<span className="gl-accordion-summary-meta">{meta}</span>
			) : null}
			{expandIcon ? (
				<span className="gl-accordion-expand-icon" aria-hidden="true">
					{expandIcon}
				</span>
			) : (
				<span className="gl-accordion-toggle" aria-hidden="true" />
			)}
		</>
	);
	if (!context) {
		// Outside an Accordion there is no row to open: a plain summary, as in the reference.
		return (
			<h3 className="gl-accordion-heading">
				<button
					ref={ref}
					type="button"
					className={buttonClassName}
					onClick={onClick}
					onKeyDown={handleKeyDown}
					{...rest}
				>
					{content}
				</button>
			</h3>
		);
	}

	return (
		<BaseAccordion.Header
			render={headings[context.headingLevel]}
			className="gl-accordion-heading"
		>
			<BaseAccordion.Trigger
				ref={ref}
				id={context.summaryId}
				// The details are the Collapse's region, not a Base UI panel.
				aria-controls={context.regionId}
				className={buttonClassName}
				onClick={(event) => {
					rememberReactEvent(event);
					onClick?.(event);
					// As in the reference, a press your handler prevents doesn't toggle the row.
					if (event.defaultPrevented) {
						event.preventBaseUIHandler();
					}
				}}
				onKeyDown={handleKeyDown}
				{...rest}
			>
				{content}
			</BaseAccordion.Trigger>
		</BaseAccordion.Header>
	);
}

/**
The revealed part of a row (.career-description): 14px copy in color-muted, paragraphs 10px apart.
*/
export function AccordionDetails({
	meta,
	inset = true,
	className,
	children,
	ref,
	...rest
}: AccordionDetailsProps & { ref?: React.Ref<HTMLDivElement> }) {
	return (
		<div
			ref={ref}
			className={cx(
				"gl-accordion-details",
				!inset && "gl-accordion-details-full",
				className,
			)}
			{...rest}
		>
			{children}
			{meta === undefined || meta === null ? null : (
				<span className="gl-accordion-details-meta">{meta}</span>
			)}
		</div>
	);
}

/* ---------- PaneAccordion: the site's horizontal accordion (.acc, scripts/accordion.ts) ---------- */

function slugOf(title: React.ReactNode, index: number): string {
	if (typeof title === "string" || typeof title === "number") {
		const slug = String(title)
			.toLowerCase()
			.replaceAll(/[^a-z\d]+/gu, "-")
			.replaceAll(/^-+|-+$/gu, "");
		if (slug !== "") {
			return slug;
		}
	}

	return `pane-${index}`;
}

/**
A pane's data-state: open, closed, or none before it's first pressed.
*/
function stateName(state: boolean | undefined): "open" | "closed" | undefined {
	if (state === undefined) {
		return undefined;
	}

	return state ? "open" : "closed";
}

/**
Which layouts are compact (accordion.ts: (hover: none), (max-width: 899px)): every pane toggles
on its own there, with its chips shown until it's closed.
*/
const compactQueries = {
	auto: "(hover: none), (max-width: 899px)",
	horizontal: "(hover: none), (max-width: 700px)",
	vertical: "all",
} as const;

const paneKeys = new Set([
	"ArrowRight",
	"ArrowDown",
	"ArrowLeft",
	"ArrowUp",
	"Home",
	"End",
]);

/**
The site's horizontal accordion (.acc): glass panes that widen to 2.6x on
hover, focus or press and reveal their chips. Narrow screens and touch get a
tap toggle with the chips shown, as scripts/accordion.ts does.
*/
export function PaneAccordion({
	items,
	orientation = "auto",
	open,
	defaultOpen,
	onChange,
	headingLevel = 3,
	// A div's defaultValue does nothing, and Base UI's root would read it as its open items.
	defaultValue,
	id,
	className,
	onKeyDown,
	ref,
	...rest
}: PaneAccordionProps & { ref?: React.Ref<HTMLDivElement> }) {
	const baseId = useId(id);
	const ids = items.map((item, index) => item.id ?? slugOf(item.title, index));
	const [isControlled] = React.useState(open !== undefined);
	// Behaviour only: CSS lays the panes out for the viewport before hydration.
	const isCompact = useMediaQuery(compactQueries[orientation]);
	// On compact layouts every pane starts open, its chips shown (the script's init). It reads
	// the first render's answer, which during hydration is the server's: an island keeps the
	// panes its server HTML opened.
	const [inner, setInner] = React.useState<Record<string, boolean>>(() => {
		const keys = isCompact && !isControlled ? ids : (defaultOpen ?? []);
		return Object.fromEntries(keys.map((key) => [key, true]));
	});
	const stateOf = (key: string): boolean | undefined =>
		isControlled ? (open ?? []).includes(key) : inner[key];

	const press = useEventCallback((event: React.SyntheticEvent, key: string) => {
		const isOpening = stateOf(key) !== true;
		const next: Record<string, boolean> = {};
		for (const other of ids) {
			const state = stateOf(other);
			if (state !== undefined) {
				next[other] = state;
			}
		}

		// Side by side, one pane opens at a time; compact panes toggle on their own.
		if (isOpening && !isCompact) {
			for (const other of ids) {
				if (other !== key) {
					next[other] = false;
				}
			}
		}

		next[key] = isOpening;
		if (!isControlled) {
			setInner(next);
		}

		onChange?.(
			event,
			ids.filter((other) => next[other]),
		);
	});

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		if (
			event.defaultPrevented ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			!paneKeys.has(event.key) ||
			!(event.target instanceof HTMLElement) ||
			!event.target.classList.contains("gl-pane-button")
		) {
			return;
		}

		const buttons = [
			...event.currentTarget.querySelectorAll<HTMLButtonElement>(
				":scope > .gl-pane > .gl-pane-heading > .gl-pane-button",
			),
		];
		const index = buttons.indexOf(event.target as HTMLButtonElement);
		const count = buttons.length;
		if (index === -1 || count < 2) {
			return;
		}

		let next = count - 1;
		if (event.key === "ArrowRight" || event.key === "ArrowDown") {
			next = (index + 1) % count;
		} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
			next = (index - 1 + count) % count;
		} else if (event.key === "Home") {
			next = 0;
		}

		event.preventDefault();
		buttons[next]?.focus();
	};

	return (
		<BaseAccordion.Root
			ref={ref}
			multiple
			id={id}
			value={ids.filter((key) => stateOf(key) === true)}
			className={cx(
				"gl-pane-accordion",
				`gl-pane-accordion-${orientation}`,
				className,
			)}
			onKeyDown={handleKeyDown}
			{...rest}
		>
			{items.map((item, index) => {
				const key = ids[index] ?? `pane-${index}`;
				const bodyId = `${baseId}-${key}-body`;
				const hasChips = Array.isArray(item.chips) && item.chips.length > 0;
				const hasMore = item.more !== undefined && item.more !== null;
				return (
					<BaseAccordion.Item
						key={key}
						value={key}
						className={cx("gl-pane", `gl-pane-${item.tone ?? "default"}`)}
						data-state={stateName(stateOf(key))}
						onOpenChange={(_isOpen, details) => {
							press(documentedEvent(details.event), key);
						}}
					>
						<BaseAccordion.Header
							render={headings[headingLevel]}
							className="gl-pane-heading"
						>
							<BaseAccordion.Trigger
								id={`${baseId}-${key}-button`}
								// The body is always there, chips or not, as in the reference.
								aria-controls={bodyId}
								className="gl-pane-button"
								onClick={(event) => {
									rememberReactEvent(event);
								}}
							>
								<span className="gl-pane-title">{item.title}</span>
							</BaseAccordion.Trigger>
						</BaseAccordion.Header>
						<div id={bodyId} className="gl-pane-body">
							{item.text === undefined || item.text === null ? null : (
								<p className="gl-pane-text">{item.text}</p>
							)}
							{hasMore || hasChips ? (
								<div className="gl-pane-more">
									<div className="gl-pane-more-inner">
										{hasMore ? (
											item.more
										) : (
											<ul className="gl-pane-chips">
												{item.chips?.map((chip, chipIndex) => (
													<li
														// Chips that aren't strings have nothing but their place to key on.
														// eslint-disable-next-line @eslint-react/no-array-index-key
														key={typeof chip === "string" ? chip : chipIndex}
														className="gl-pane-chip"
													>
														{chip}
													</li>
												))}
											</ul>
										)}
									</div>
								</div>
							) : null}
						</div>
					</BaseAccordion.Item>
				);
			})}
		</BaseAccordion.Root>
	);
}
