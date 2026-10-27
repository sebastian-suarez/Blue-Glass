import { setTimeout as delay } from "node:timers/promises";
import type { Page } from "playwright";

export class GateError extends Error {}

export const pollFor = 5000;

const controlSelector = (name: string, suffix = "") =>
	`[id="control-${name}${suffix}"]`;

export async function showControls(page: Page): Promise<void> {
	const tab = page.getByRole("tab", { name: /^Controls/v });
	if ((await tab.count()) > 0) {
		await tab.first().click();
	}
}

export async function controlNames(page: Page): Promise<string[]> {
	const names = await page.$$eval("[id^='control-']", (nodes) => [
		...new Set(
			nodes.map((node) =>
				node.id.replace(/^control-/v, "").replace(/-\d+$/v, ""),
			),
		),
	]);
	return names.toSorted();
}

export type Widget =
	| { kind: "radio" | "select"; options: string[]; current: string }
	| { kind: "checkbox"; current: boolean }
	| { kind: "text" | "number"; current: string }
	| { kind: "other"; tag: string };

export async function widgetOf(
	page: Page,
	name: string,
): Promise<Widget | undefined> {
	return page.evaluate((control): Widget | undefined => {
		const id = `control-${control}`;
		const radios = [
			...document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
		].filter((radio) => radio.name === id);
		if (radios.length > 0) {
			return {
				kind: "radio",
				options: radios.map((radio) => radio.value),
				current: radios.find((radio) => radio.checked)?.value ?? "",
			};
		}

		const element =
			[...document.querySelectorAll("[id^='control-']")].find(
				(node) => node.id === id,
			) ?? null;
		if (element === null) {
			return undefined;
		}

		const tag = element.tagName.toLowerCase();
		const type = element.getAttribute("type") ?? "text";
		if (tag === "select") {
			const select = element as HTMLSelectElement;
			return {
				kind: "select",
				options: [...select.options]
					.filter(
						(option) =>
							!option.disabled &&
							option.hidden === false &&
							option.label !== "Choose option...",
					)
					.map((option) => option.label),
				current: select.selectedOptions[0]?.label ?? "",
			};
		}

		const field = element as HTMLInputElement;
		if (tag === "input" && type === "checkbox") {
			return { kind: "checkbox", current: field.checked };
		}

		if (tag === "input" && type === "number") {
			return { kind: "number", current: field.value };
		}

		return tag === "textarea" || (tag === "input" && type === "text")
			? { kind: "text", current: field.value }
			: { kind: "other", tag };
	}, name);
}

export async function setWidget(
	page: Page,
	name: string,
	widget: Widget,
	value: string | boolean,
): Promise<void> {
	switch (widget.kind) {
		case "radio": {
			const index = widget.options.indexOf(String(value));
			if (index === -1) {
				throw new GateError(
					`the panel offers ${name} no option "${String(value)}"`,
				);
			}

			await page.locator(controlSelector(name, `-${index}`)).check();
			break;
		}

		case "select": {
			await page
				.locator(controlSelector(name))
				.selectOption({ label: String(value) });
			break;
		}

		case "checkbox": {
			const box = page.locator(controlSelector(name));
			if ((await box.isChecked()) !== value) {
				await box.evaluate((node) => {
					(node as HTMLInputElement).click();
				});
			}

			break;
		}

		case "text":
		case "number": {
			await page.locator(controlSelector(name)).fill(String(value));
			break;
		}

		case "other": {
			throw new GateError(
				`the panel's control for ${name} is a <${widget.tag}>, which a reader can't set`,
			);
		}
	}
}

export function currentOf(widget: Widget | undefined): string | undefined {
	return widget === undefined || widget.kind === "other"
		? undefined
		: String(widget.current);
}

export function otherValues(widget: Widget): Array<string | boolean> {
	switch (widget.kind) {
		case "radio":
		case "select": {
			return widget.options.filter((option) => option !== widget.current);
		}

		case "checkbox": {
			return [!widget.current];
		}

		case "number": {
			return [String(Number(widget.current) + 1)];
		}

		case "text": {
			return [`${widget.current} more`];
		}

		case "other": {
			return [];
		}
	}
}

export async function waitForWidget(
	page: Page,
	name: string,
): Promise<Widget | undefined> {
	const start = Date.now();
	/* eslint-disable no-await-in-loop -- polled until the panel fills */
	do {
		const widget = await widgetOf(page, name);
		if (widget !== undefined) {
			return widget;
		}

		await delay(100);
	} while (Date.now() - start < pollFor);
	/* eslint-enable no-await-in-loop */

	return undefined;
}
