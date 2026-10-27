import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Alert,
	type AlertProps,
	type AlertSeverity,
	AlertTitle,
	Button,
	Icon,
	Snackbar,
} from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

function spoken(element: Element): string {
	const parts: string[] = [];
	const walk = (node: Node) => {
		if (node instanceof Text) {
			parts.push(node.data);
			return;
		}

		if (
			!(node instanceof Element) ||
			node.getAttribute("aria-hidden") === "true"
		) {
			return;
		}

		const style = getComputedStyle(node);
		if (style.display === "none" || style.visibility === "hidden") {
			return;
		}

		const label = node.getAttribute("aria-label");
		if (label !== null && label !== "") {
			parts.push(label);
			return;
		}

		for (const child of node.childNodes) {
			walk(child);
		}
	};

	for (const child of element.childNodes) {
		walk(child);
	}

	return parts.join(" ").replaceAll(/\s+/gv, " ").trim();
}

function isVisuallyHidden(element: Element): boolean {
	const box = element.getBoundingClientRect();
	return (
		element.checkVisibility({ visibilityProperty: true }) &&
		box.width <= 1 &&
		box.height <= 1
	);
}

function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
}

function resolvedColour(token: string): string {
	const probe = document.createElement("div");
	probe.style.color = `var(${token})`;
	document.body.append(probe);
	const { color } = getComputedStyle(probe);
	probe.remove();
	return color;
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function Around({ children }: { readonly children: React.ReactNode }) {
	return (
		<>
			<button type="button">Before</button>
			{children}
			<button type="button">After</button>
		</>
	);
}

const severities = [
	{ severity: "success", role: "status", word: "Success" },
	{ severity: "info", role: "status", word: "Info" },
	{ severity: "warning", role: "alert", word: "Warning" },
	{ severity: "error", role: "alert", word: "Error" },
] as const satisfies ReadonlyArray<{
	severity: AlertSeverity;
	role: string;
	word: string;
}>;

describe("Alert", () => {
	test("renders a div that holds the role, the message, className, the ref and the other attributes", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Alert
				ref={ref}
				id="deploy-note"
				className="custom"
				style={{ maxWidth: 600 }}
			>
				Merging to main publishes the site.
			</Alert>,
		);
		const alert = screen.getByRole("status");
		expect(alert).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(alert);
		expect(alert).toHaveAttribute("id", "deploy-note");
		expect(alert).toHaveClass("custom");
		expect(getComputedStyle(alert).maxWidth).toBe("600px");
		expect(
			within(alert).getByText("Merging to main publishes the site."),
		).toBeVisible();
	});

	test.each(severities)(
		"severity $severity gives the role $role, its own glyph and the word $word read first",
		({ severity, role, word }) => {
			const markups = new Map(
				severities.map((each) => [each.severity, glyph(each.severity)]),
			);
			render(<Alert severity={severity}>Published to S3.</Alert>);
			const alert = screen.getByRole(role);
			expect(spoken(alert)).toBe(`${word}: Published to S3.`);
			const shown = alert.querySelector("svg")?.getHTML();
			for (const [other, markup] of markups) {
				if (other === severity) {
					expect(shown).toBe(markup);
				} else {
					expect(shown).not.toBe(markup);
				}
			}
		},
	);

	test("severity is info by default: the status role and the word Info", () => {
		const markup = glyph("info");
		render(<Alert>Cache invalidation queued.</Alert>);
		const alert = screen.getByRole("status");
		expect(spoken(alert)).toBe("Info: Cache invalidation queued.");
		expect(alert.querySelector("svg")?.getHTML()).toBe(markup);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	test("the severity's word is visually hidden and comes before the message; the glyph isn't read", () => {
		render(<Alert severity="error">Couldn&apos;t reach the bucket.</Alert>);
		const alert = screen.getByRole("alert");
		const word = within(alert).getByText("Error:");
		expect(isVisuallyHidden(word)).toBe(true);
		expect(spoken(alert)).toBe("Error: Couldn't reach the bucket.");
		expect(
			isVisuallyHidden(within(alert).getByText("Couldn't reach the bucket.")),
		).toBe(false);
	});

	test("severityText replaces the word read before the message", () => {
		render(
			<Alert severity="warning" severityText="Heads up">
				TLS certificate renews in 9 days.
			</Alert>,
		);
		expect(spoken(screen.getByRole("alert"))).toBe(
			"Heads up: TLS certificate renews in 9 days.",
		);
		expect(screen.queryByText("Warning:")).toBeNull();
	});

	test("variant is standard by default, and the variant and severity put their classes on the root", () => {
		const variants = [
			"standard",
			"outlined",
			"filled",
		] as const satisfies ReadonlyArray<AlertProps["variant"]>;
		const refs = new Map(
			variants.map((variant) => [variant, React.createRef<HTMLDivElement>()]),
		);
		const fallback = React.createRef<HTMLDivElement>();
		render(
			<>
				<Alert ref={fallback}>Default</Alert>
				{variants.map((variant) => (
					<Alert
						key={variant}
						ref={refs.get(variant)}
						severity="error"
						variant={variant}
					>
						{variant}
					</Alert>
				))}
			</>,
		);
		expect(fallback.current).toHaveClass("gl-alert-standard");
		expect(fallback.current).toHaveClass("gl-alert-info");
		for (const variant of variants) {
			const root = must(refs.get(variant)?.current);
			expect(root).toHaveClass(`gl-alert-${variant}`);
			expect(root).toHaveClass("gl-alert-error");
			for (const other of variants) {
				if (other !== variant) {
					expect(root).not.toHaveClass(`gl-alert-${other}`);
				}
			}
		}
	});

	test("each severity puts its class on the root", () => {
		const refs = new Map(
			severities.map(({ severity }) => [
				severity,
				React.createRef<HTMLDivElement>(),
			]),
		);
		render(
			<>
				{severities.map(({ severity }) => (
					<Alert key={severity} ref={refs.get(severity)} severity={severity}>
						{severity}
					</Alert>
				))}
			</>,
		);
		for (const { severity } of severities) {
			expect(refs.get(severity)?.current).toHaveClass(`gl-alert-${severity}`);
		}
	});

	test("role replaces the default role", () => {
		render(
			<>
				<Alert severity="error" role="status">
					Couldn&apos;t reach the bucket.
				</Alert>
				<Alert severity="info" role="alert">
					Cache invalidation queued.
				</Alert>
			</>,
		);
		expect(spoken(screen.getByRole("status"))).toBe(
			"Error: Couldn't reach the bucket.",
		);
		expect(spoken(screen.getByRole("alert"))).toBe(
			"Info: Cache invalidation queued.",
		);
	});

	test("inside a Snackbar an error Alert has no role of its own: the snackbar's status announces it", async () => {
		render(
			<Snackbar open>
				<Alert severity="error">Couldn&apos;t reach the bucket.</Alert>
			</Snackbar>,
		);
		const message = await screen.findByText("Couldn't reach the bucket.");
		await expect.element(message).toBeVisible();
		expect(screen.queryByRole("alert")).toBeNull();
		const statuses = screen
			.getAllByRole("status")
			.filter((status) =>
				status.textContent.includes("Couldn't reach the bucket."),
			);
		expect(statuses).toHaveLength(1);
		expect(spoken(must(statuses[0]))).toMatch(/^Error: /v);
	});

	test("inside a Snackbar an info Alert adds no status of its own, so the message is announced once", async () => {
		render(
			<Snackbar open>
				<Alert severity="info">Cache invalidation queued.</Alert>
			</Snackbar>,
		);
		const message = await screen.findByText("Cache invalidation queued.");
		await expect.element(message).toBeVisible();
		const statuses = screen
			.getAllByRole("status")
			.filter((status) =>
				status.textContent.includes("Cache invalidation queued."),
			);
		expect(statuses).toHaveLength(1);
		expect(spoken(must(statuses[0]))).toMatch(/^Info: /v);
	});

	test("icon replaces the glyph, still unread; false hides it, and the word still names the state", () => {
		render(
			<>
				<Alert severity="success" icon={<span>✦</span>}>
					Published to S3.
				</Alert>
				<Alert severity="error" icon={false}>
					<AlertTitle>Upload failed</AlertTitle>
					Couldn&apos;t reach the bucket.
				</Alert>
			</>,
		);
		const custom = screen.getByRole("status");
		expect(within(custom).getByText("✦")).toBeVisible();
		expect(custom.querySelector("svg")).toBeNull();
		expect(spoken(custom)).toBe("Success: Published to S3.");

		const bare = screen.getByRole("alert");
		expect(bare.querySelector("svg")).toBeNull();
		expect(spoken(bare)).toBe(
			"Error: Upload failed Couldn't reach the bucket.",
		);
	});

	test("AlertTitle is the first line: read after the word and before the sentence, and shown above it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Alert severity="error" style={{ width: 600 }}>
				<AlertTitle ref={ref} className="custom">
					Upload failed
				</AlertTitle>
				<span>Couldn&apos;t reach the bucket. Try again.</span>
			</Alert>,
		);
		const alert = screen.getByRole("alert");
		const title = within(alert).getByText("Upload failed");
		expect(title).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(title);
		expect(title).toHaveClass("custom");
		expect(spoken(alert)).toBe(
			"Error: Upload failed Couldn't reach the bucket. Try again.",
		);
		const sentence = within(alert).getByText(
			"Couldn't reach the bucket. Try again.",
		);
		expect(title.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			sentence.getBoundingClientRect().top + 0.5,
		);
	});

	test("action renders after the message", () => {
		render(
			<Alert
				severity="warning"
				action={
					<Button variant="text" size="sm">
						Renew now
					</Button>
				}
			>
				Auto-renew is off.
			</Alert>,
		);
		const alert = screen.getByRole("alert");
		const renew = within(alert).getByRole("button", { name: "Renew now" });
		expect(renew).toBeVisible();
		expect(spoken(alert)).toBe("Warning: Auto-renew is off. Renew now");
	});

	test("without onClose there is no close button", () => {
		render(<Alert severity="success">Published to S3.</Alert>);
		expect(within(screen.getByRole("status")).queryByRole("button")).toBeNull();
	});

	test("onClose shows a 32px close button named Close, and pressing it calls onClose with the click event", async () => {
		const calls: Array<{
			type: string;
			isMouseEvent: boolean;
			currentTarget: EventTarget;
		}> = [];
		const onClose = vi.fn((event: React.MouseEvent<HTMLButtonElement>) => {
			calls.push({
				type: event.type,
				isMouseEvent: event.nativeEvent instanceof MouseEvent,
				currentTarget: event.currentTarget,
			});
		});
		render(
			<Alert severity="success" onClose={onClose}>
				Résumé PDF rebuilt from main.
			</Alert>,
		);
		const alert = screen.getByRole("status");
		const close = within(alert).getByRole("button", { name: "Close" });
		const box = close.getBoundingClientRect();
		expect([Math.round(box.width), Math.round(box.height)]).toEqual([32, 32]);
		expect(onClose).not.toHaveBeenCalled();
		await userEvent.click(close);
		expect(calls).toEqual([
			{ type: "click", isMouseEvent: true, currentTarget: close },
		]);
	});

	test("closeText names the close button and is its tooltip", () => {
		render(
			<Alert severity="success" closeText="Dismiss" onClose={() => undefined}>
				Published to S3.
			</Alert>,
		);
		const close = within(screen.getByRole("status")).getByRole("button", {
			name: "Dismiss",
		});
		expect(close).toHaveAttribute("title", "Dismiss");
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});
});

describe("Alert keyboard", () => {
	test("the action, then the close button, are in the tab order after the content before them", async () => {
		render(
			<Around>
				<Alert
					severity="error"
					action={
						<Button variant="text" size="sm">
							Retry
						</Button>
					}
					onClose={() => undefined}
				>
					Couldn&apos;t reach the bucket.
				</Alert>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("Retry")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Close")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});

	test("Enter and Space press the action and the close button", async () => {
		const onRetry = vi.fn<() => void>();
		const onClose = vi.fn<() => void>();
		render(
			<Around>
				<Alert
					severity="error"
					action={
						<Button variant="text" size="sm" onClick={onRetry}>
							Retry
						</Button>
					}
					onClose={onClose}
				>
					Couldn&apos;t reach the bucket.
				</Alert>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("Retry")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		expect(onRetry).toHaveBeenCalledTimes(1);
		await userEvent.keyboard(" ");
		expect(onRetry).toHaveBeenCalledTimes(2);

		await userEvent.tab();
		await expect.element(button("Close")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		expect(onClose).toHaveBeenCalledTimes(1);
		await userEvent.keyboard(" ");
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	test("on the filled variant the focus ring of the action and the close button turns on-ink", async () => {
		render(
			<Around>
				<Alert
					severity="error"
					variant="filled"
					action={
						<Button variant="text" size="sm">
							Retry
						</Button>
					}
					onClose={() => undefined}
				>
					Couldn&apos;t reach the bucket.
				</Alert>
				<Alert severity="error" onClose={() => undefined}>
					A standard alert.
				</Alert>
			</Around>,
		);
		const onInk = resolvedColour("--on-ink");
		const ring = (element: Element) => {
			const style = getComputedStyle(element);
			return style.outlineStyle === "none" ? "none" : style.outlineColor;
		};

		const closes = screen.getAllByRole("button", { name: "Close" });
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("Retry")).toHaveFocus();
		expect(ring(button("Retry"))).toBe(onInk);
		await userEvent.tab();
		await expect.element(must(closes[0])).toHaveFocus();
		expect(ring(must(closes[0]))).toBe(onInk);
		await userEvent.tab();
		await expect.element(must(closes[1])).toHaveFocus();
		expect(ring(must(closes[1]))).not.toBe("none");
		expect(ring(must(closes[1]))).not.toBe(onInk);
	});
});
