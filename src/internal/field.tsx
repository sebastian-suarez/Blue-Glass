"use client";
import { Field } from "@base-ui/react/field";
import * as React from "react";
import { Icon } from "../components/Icon/index.js";
import { cx } from "./cx.js";

export type FieldShellProps = {
	rootRef?: React.Ref<HTMLDivElement>;
	kind: string;
	className?: string;
	style?: React.CSSProperties;
	rootProps?: Record<string, unknown>;
	label?: React.ReactNode;
	labelId: string;
	htmlFor?: string;
	onLabelClick?: () => void;
	helperText?: React.ReactNode;
	helperId: string;
	counter?: React.ReactNode;
	error?: boolean;
	required?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	fullWidth?: boolean;
	size?: "sm" | "md";
	variant?: "outlined" | "filled";
	multiline?: boolean;
	modifiers?: string | false;
	children?: React.ReactNode;
};
export function hasContent(node: React.ReactNode): boolean {
	return (
		node !== undefined &&
		node !== null &&
		node !== false &&
		node !== true &&
		node !== ""
	);
}

export function idList(
	...ids: Array<string | false | null | undefined>
): string | undefined {
	const s = ids.filter(Boolean).join(" ");
	return s === "" ? undefined : s;
}

export function FieldShell({
	rootRef,
	...p
}: FieldShellProps): React.ReactElement {
	const isShowLabel = hasContent(p.label);
	const isShowHelper = hasContent(p.helperText);
	const hasFooter = isShowHelper || Boolean(p.counter);
	const LabelTag =
		p.htmlFor !== undefined && p.htmlFor !== "" ? "label" : "span";
	return (
		<Field.Root
			ref={rootRef}
			invalid={p.error === true}
			disabled={p.disabled}
			className={cx(
				"gl-field",
				p.kind,
				p.variant === "filled" && "gl-field-filled",
				p.size === "sm" && "gl-field-sm",
				p.multiline && "gl-field-multiline",
				p.fullWidth && "gl-field-full",
				p.error && "gl-field-error",
				p.disabled && "gl-field-disabled",
				p.readOnly && "gl-field-readonly",
				p.modifiers,
				p.className,
			)}
			style={p.style}
			{...p.rootProps}
		>
			{isShowLabel ? (
				<Field.Label
					render={<LabelTag />}
					nativeLabel={p.htmlFor !== undefined && p.htmlFor !== ""}
					id={p.labelId}
					htmlFor={p.htmlFor}
					className="gl-field-label"
					onClick={(event) => {
						if (!p.onLabelClick) {
							return;
						}

						p.onLabelClick();
						event.preventBaseUIHandler();
					}}
				>
					{p.label}
					{p.required === true ? (
						<span className="gl-field-asterisk" aria-hidden="true">
							*
						</span>
					) : null}
				</Field.Label>
			) : null}
			{p.children}
			{hasFooter ? (
				<div className="gl-field-footer">
					{isShowHelper ? (
						<span
							id={p.helperId}
							className={cx(
								"gl-field-helper",
								p.error && "gl-field-helper-error",
							)}
						>
							{p.error === true ? <Icon name="error" size={14} /> : null}
							<span>{p.helperText}</span>
						</span>
					) : null}
					{p.counter}
				</div>
			) : null}
		</Field.Root>
	);
}

function isText(node: React.ReactNode): boolean {
	return typeof node === "string" || typeof node === "number";
}

export function renderSlot(
	node: React.ReactNode,
	position: "start" | "end",
	fallbackId: string,
): {
	el: React.ReactNode;
	id: string;
	text: boolean;
} {
	if (!hasContent(node)) {
		return { el: null, id: fallbackId, text: false };
	}

	if (
		React.isValidElement<{
			id?: string;
			children?: React.ReactNode;
		}>(node) &&
		(
			node.type as {
				__glAdornment?: boolean;
			}
		).__glAdornment === true
	) {
		const { props } = node;
		const id = props.id ?? fallbackId;
		return {
			el:
				props.id !== undefined && props.id !== ""
					? node
					: // eslint-disable-next-line @eslint-react/no-clone-element -- Preserve a caller's adornment and attach its description id.
						React.cloneElement(node, { id }),
			id,
			text: isText(props.children),
		};
	}

	return {
		el: (
			<span
				id={fallbackId}
				className={cx("gl-field-adornment", `gl-field-adornment-${position}`)}
			>
				{node}
			</span>
		),
		id: fallbackId,
		text: isText(node),
	};
}

export function focusFromPadding(
	event: React.MouseEvent<HTMLElement>,
	input: HTMLElement | null,
	isDisabled?: boolean,
): void {
	if (!input || isDisabled === true || event.button !== 0) {
		return;
	}

	const t = event.target as HTMLElement;
	if (
		t === input ||
		t.closest('button, a, input, textarea, select, [role="button"]')
	) {
		return;
	}

	event.preventDefault();
	if (document.activeElement !== input) {
		input.focus();
	}
}
