"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useForkRef, useIsoLayoutEffect } from "../../internal/hooks.js";

function toPixels(value: string): number {
	// eslint-disable-next-line unicorn/prefer-number-coercion -- Number() turns a value with a unit into NaN.
	return Number.parseFloat(value);
}

export type TextareaAutosizeProps =
	React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
		minRows?: number;
		maxRows?: number;
	};

export function TextareaAutosize({
	minRows = 1,
	maxRows,
	className,
	style,
	onChange,
	value,
	ref,
	...rest
}: TextareaAutosizeProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
	const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
	const handleRef = useForkRef(innerRef, ref);
	const resize = React.useCallback(() => {
		const textarea = innerRef.current;
		if (textarea === null) {
			return;
		}

		const computed = getComputedStyle(textarea);
		const lineHeight = toPixels(computed.lineHeight);
		const line =
			lineHeight > 0 ? lineHeight : toPixels(computed.fontSize) * 1.6;
		const padding =
			toPixels(computed.paddingTop) + toPixels(computed.paddingBottom);
		const border =
			toPixels(computed.borderTopWidth) + toPixels(computed.borderBottomWidth);
		textarea.style.height = "0px";
		const content = textarea.scrollHeight - padding;
		let height = Math.max(content, minRows * line);
		if (maxRows !== undefined && maxRows > 0) {
			height = Math.min(height, maxRows * line);
		}

		textarea.style.height = `${Math.ceil(height + padding + border)}px`;
		textarea.style.overflowY =
			maxRows !== undefined && maxRows > 0 && content > maxRows * line
				? "auto"
				: "hidden";
	}, [minRows, maxRows]);

	useIsoLayoutEffect(() => {
		resize();
	});

	React.useEffect(() => {
		const textarea = innerRef.current;
		if (textarea === null || typeof ResizeObserver === "undefined") {
			return;
		}

		let lastWidth = textarea.clientWidth;
		const observer = new ResizeObserver(() => {
			if (textarea.clientWidth === lastWidth) {
				return;
			}

			lastWidth = textarea.clientWidth;
			resize();
		});
		observer.observe(textarea);
		return () => {
			observer.disconnect();
		};
	}, [resize]);

	return (
		<textarea
			ref={handleRef}
			rows={minRows}
			className={cx("gl-textarea-autosize", className)}
			style={{ resize: "none", ...style }}
			value={value}
			onChange={(event) => {
				onChange?.(event);
				if (value === undefined) {
					resize();
				}
			}}
			{...rest}
		/>
	);
}
