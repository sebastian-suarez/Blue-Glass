"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";

export type AppBarProps = React.HTMLAttributes<HTMLElement> & {
	position?: "static" | "sticky" | "fixed";
	elevateOnScroll?: boolean;
	component?: React.ElementType;
	children?: React.ReactNode;
};

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
	variant?: "regular" | "dense";
	disableGutters?: boolean;
	component?: React.ElementType;
	children?: React.ReactNode;
};

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
