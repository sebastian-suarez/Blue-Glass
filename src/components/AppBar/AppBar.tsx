"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";

export type AppBarProps = React.HTMLAttributes<HTMLElement> & {
	/**
	`static`: in the flow with no fill, the site's header over the light field (default).
	`sticky`: sticks to the top of its scroll container, on glass. `fixed`: fixed to the
	viewport (or the nearest transformed ancestor), on glass. Both sit at z-app-bar.
	*/
	position?: "static" | "sticky" | "fixed";
	/**
	Sticky and fixed: lift the bar with a shadow only once its scroll container has scrolled.
	*/
	elevateOnScroll?: boolean;
	/**
	The element to render. Default "header".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

/**
The page's top bar (.identity-strip's header). Static it is the site's header,
transparent over the light field; sticky and fixed put it on glass with blur-control.
*/
export function AppBar({
	position = "static",
	elevateOnScroll = false,
	component: Component = "header",
	className,
	children,
	ref,
	...rest
}: AppBarProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const isFloating = position !== "static";
	const isWatching = isFloating && elevateOnScroll;
	const sentinelRef = React.useRef<HTMLSpanElement | null>(null);
	// The server can't know the scroll position, so the bar starts at rest.
	const [isScrolled, setIsScrolled] = React.useState(false);

	React.useEffect(() => {
		const sentinel = sentinelRef.current;
		if (
			!isWatching ||
			!sentinel ||
			typeof IntersectionObserver === "undefined"
		) {
			return undefined;
		}

		// The sentinel sits just above the bar: once it leaves the visible area, the
		// container has scrolled (sticky: the bar is stuck). Works for any scroll container.
		const observer = new IntersectionObserver((entries) => {
			const entry = entries.at(-1);
			if (entry) {
				setIsScrolled(!entry.isIntersecting);
			}
		});
		observer.observe(sentinel);
		return () => {
			observer.disconnect();
		};
	}, [isWatching]);

	// One stable structure, so toggling elevateOnScroll never remounts the bar.
	return (
		<>
			{isWatching ? (
				<span
					ref={sentinelRef}
					className="gl-app-bar-sentinel"
					aria-hidden="true"
				/>
			) : null}
			<Component
				ref={ref}
				className={cx(
					"gl-app-bar",
					`gl-app-bar-${position}`,
					isFloating && "gl-glass",
					isWatching &&
						(isScrolled ? "gl-app-bar-elevated" : "gl-app-bar-resting"),
					className,
				)}
				data-scrolled={isWatching ? String(isScrolled) : undefined}
				{...rest}
			>
				{children}
			</Component>
		</>
	);
}

export type ToolbarProps = React.HTMLAttributes<HTMLElement> & {
	/**
	`regular`: the site's identity strip, 38px 5% (28px from 1000px down). `dense`: 12px tall padding, for sticky bars.
	*/
	variant?: "regular" | "dense";
	/**
	Drop the 5% side padding.
	*/
	disableGutters?: boolean;
	/**
	The element to render. Default "div".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

/**
The bar's row (.identity-strip): flex, centred items, space-between, 25px
gaps, capped at size-header (1380px). It wraps under 700px.
*/
export function Toolbar({
	variant = "regular",
	disableGutters = false,
	component: Component = "div",
	className,
	children,
	ref,
	...rest
}: ToolbarProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-toolbar",
				variant === "dense" && "gl-toolbar-dense",
				disableGutters && "gl-toolbar-flush",
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}
