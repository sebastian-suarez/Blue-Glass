"use client";
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
	expanded?: boolean;
	defaultExpanded?: boolean;
	// eslint-disable-next-line unicorn/consistent-boolean-name -- The documented parameter name.
	onChange?: (event: React.SyntheticEvent, expanded: boolean) => void;
	disabled?: boolean;
	headingLevel?: HeadingLevel;
	TransitionProps?: Partial<
		Pick<
			CollapseProps,
			"timeout" | "unmountOnExit" | "mountOnEnter" | "onEntered" | "onExited"
		>
	>;
	children?: React.ReactNode;
};

export type AccordionSummaryProps =
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		secondary?: React.ReactNode;
		meta?: React.ReactNode;
		expandIcon?: React.ReactNode;
		children?: React.ReactNode;
	};

export type AccordionDetailsProps = React.HTMLAttributes<HTMLDivElement> & {
	meta?: React.ReactNode;
	inset?: boolean;
	children?: React.ReactNode;
};

export type PaneAccordionItem = {
	id?: string;
	title: React.ReactNode;
	text?: React.ReactNode;
	chips?: React.ReactNode[];
	more?: React.ReactNode;
	tone?: "default" | "alt" | "accent";
};

export type PaneAccordionProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange"
> & {
	items: PaneAccordionItem[];
	orientation?: "auto" | "horizontal" | "vertical";
	open?: string[];
	defaultOpen?: string[];
	onChange?: (event: React.SyntheticEvent, open: string[]) => void;
	headingLevel?: HeadingLevel;
};

type AccordionContextValue = {
	headingLevel: HeadingLevel;
	summaryId: string;
	regionId: string;
};

const AccordionContext = React.createContext<AccordionContextValue | undefined>(
	undefined,
);

/* eslint-disable jsx-a11y-x/heading-has-content -- Base UI's Header renders the summary inside. */
const headings: Record<HeadingLevel, React.ReactElement> = {
	2: <h2 />,
	3: <h3 />,
	4: <h4 />,
	5: <h5 />,
	6: <h6 />,
};
/* eslint-enable jsx-a11y-x/heading-has-content */

const rowItem = "row";
const openRow = [rowItem];
const closedRow: string[] = [];

export function Accordion({
	expanded: expandedProp,
	defaultExpanded = false,
	onChange,
	disabled = false,
	headingLevel = 3,
	TransitionProps: transitionProps,
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

	let next: number;
	switch (key) {
		case "ArrowDown": {
			next = (index + 1) % count;
			break;
		}

		case "ArrowUp": {
			next = (index - 1 + count) % count;
			break;
		}

		case "Home": {
			next = 0;
			break;
		}

		case "End": {
			next = count - 1;
			break;
		}
	}

	event.preventDefault();
	triggers[next].focus();
}

const isShown = (node: React.ReactNode) =>
	node !== undefined && node !== null && node !== false;

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
	const hasExpandIcon = Boolean(expandIcon);
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
			{hasExpandIcon ? (
				<span className="gl-accordion-expand-icon" aria-hidden="true">
					{expandIcon}
				</span>
			) : (
				<span className="gl-accordion-toggle" aria-hidden="true" />
			)}
		</>
	);
	if (!context) {
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
				aria-controls={context.regionId}
				className={buttonClassName}
				onClick={(event) => {
					rememberReactEvent(event);
					onClick?.(event);
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

function slugOf(title: React.ReactNode, index: number): string {
	if (typeof title === "string" || typeof title === "number") {
		const slug = String(title)
			.toLowerCase()
			.replaceAll(/[^\da-z]+/gu, "-")
			.replaceAll(/^-|-$/gu, "");
		if (slug !== "") {
			return slug;
		}
	}

	return `pane-${index}`;
}

function stateName(state: boolean | undefined): "open" | "closed" | undefined {
	if (state === undefined) {
		return undefined;
	}

	return state ? "open" : "closed";
}

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

export function PaneAccordion({
	items,
	orientation = "auto",
	open,
	defaultOpen,
	onChange,
	headingLevel = 3,
	defaultValue,
	id,
	className,
	onKeyDown,
	ref,
	...rest
}: PaneAccordionProps & { ref?: React.Ref<HTMLDivElement> }) {
	const baseId = useId(id);
	const panes = items.map((item, index) => ({
		item,
		key: item.id ?? slugOf(item.title, index),
	}));
	const ids = panes.map((pane) => pane.key);
	const [isControlled] = React.useState(open !== undefined);
	const isCompact = useMediaQuery(compactQueries[orientation]);
	const [inner, setInner] = React.useState<Record<string, boolean>>(() => {
		const keys = isCompact && !isControlled ? ids : (defaultOpen ?? []);
		return Object.fromEntries(keys.map((key) => [key, true]));
	});
	const isPaneOpen = (key: string): boolean | undefined =>
		isControlled ? (open ?? []).includes(key) : inner[key];

	const press = useEventCallback((event: React.SyntheticEvent, key: string) => {
		const isOpening = !isPaneOpen(key);
		const next: Record<string, boolean> = {};
		for (const other of ids) {
			const isOpen = isPaneOpen(other);
			if (isOpen !== undefined) {
				next[other] = isOpen;
			}
		}

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

		let next: number;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowDown": {
				next = (index + 1) % count;
				break;
			}

			case "ArrowLeft":
			case "ArrowUp": {
				next = (index - 1 + count) % count;
				break;
			}

			case "Home": {
				next = 0;
				break;
			}

			default: {
				next = count - 1;
			}
		}

		event.preventDefault();
		buttons[next].focus();
	};

	return (
		<BaseAccordion.Root
			ref={ref}
			multiple
			id={id}
			value={ids.filter((key) => isPaneOpen(key))}
			className={cx(
				"gl-pane-accordion",
				`gl-pane-accordion-${orientation}`,
				className,
			)}
			onKeyDown={handleKeyDown}
			{...rest}
		>
			{panes.map(({ item, key }) => {
				const bodyId = `${baseId}-${key}-body`;
				const hasChips = Array.isArray(item.chips) && item.chips.length > 0;
				const hasMore = item.more !== undefined && item.more !== null;
				return (
					<BaseAccordion.Item
						key={key}
						value={key}
						className={cx("gl-pane", `gl-pane-${item.tone ?? "default"}`)}
						data-state={stateName(isPaneOpen(key))}
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
