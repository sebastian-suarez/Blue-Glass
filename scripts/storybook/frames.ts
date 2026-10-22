/**
What the Storybook gate (run.ts) reads from the manager and its preview frame: the events and
errors the injected recorder keeps, and the story's snapshot, which counts as settled once it
holds for 300ms.
*/
import { setTimeout as delay } from "node:timers/promises";
import type { Frame, Page } from "playwright";
import { GateError } from "./panel.ts";

export type Worker = { page: Page; errors: string[] };

const settleFor = 300;
const settleWithin = 5000;

export type Recorded = {
	__glEvents: Array<{ type: string; payload: unknown }>;
	__glErrors?: string[];
	__glFired?: number;
};

export async function errorsOf(
	worker: Worker,
	frame?: Frame,
): Promise<string[]> {
	const drain = async (target: Page | Frame) =>
		target
			.evaluate(
				() => (globalThis as unknown as Recorded).__glErrors?.splice(0) ?? [],
			)
			.catch(() => []);
	const found = [
		...worker.errors.splice(0),
		...(await drain(worker.page)),
		...(frame === undefined ? [] : await drain(frame)),
	];
	return [...new Set(found)];
}

export async function firedIn(worker: Worker, frame?: Frame): Promise<number> {
	const read = async (target: Page | Frame) =>
		target
			.evaluate(() => (globalThis as unknown as Recorded).__glFired ?? 0)
			.catch(() => 0);
	const inFrame = frame === undefined ? 0 : await read(frame);
	return (await read(worker.page)) + inFrame;
}

export async function eventCount(frame: Frame): Promise<number> {
	return frame.evaluate(
		() => (globalThis as unknown as Recorded).__glEvents.length,
	);
}

/**
How many times the preview reported new args for this story after the first `since` events.
*/
export async function argWritesSince(
	frame: Frame,
	id: string,
	since: number,
): Promise<number> {
	return frame.evaluate(
		(target) =>
			(globalThis as unknown as Recorded).__glEvents
				.slice(target.since)
				.filter(
					(event) =>
						event.type === "storyArgsUpdated" &&
						(event.payload as { storyId?: string } | undefined)?.storyId ===
							target.id,
				).length,
		{ id, since },
	);
}

/**
Waits for the preview to report `type` for this story or docs entry, after the first `since`
events. A render error for it ends the wait as a failure.
*/
export async function waitForEvent(
	frame: Frame,
	wanted: {
		type: "storyRendered" | "storyArgsUpdated" | "docsRendered";
		id: string;
		since: number;
		timeout?: number;
	},
): Promise<void> {
	const { type, id, since, timeout = 20_000 } = wanted;
	const result = await frame
		.waitForFunction(
			(target) => {
				const events = (globalThis as unknown as Recorded).__glEvents.slice(
					target.since,
				);
				const isAbout = (payload: unknown) =>
					(typeof payload === "string"
						? payload
						: (payload as { storyId?: string } | undefined)?.storyId) ===
					target.id;
				const failures = new Set([
					"storyErrored",
					"storyThrewException",
					"storyMissing",
					"playFunctionThrewException",
				]);
				const failed = events.find(
					(event) =>
						failures.has(event.type) &&
						(isAbout(event.payload) || typeof event.payload !== "string"),
				);
				if (failed !== undefined) {
					return `${failed.type}: ${JSON.stringify(failed.payload).slice(0, 300)}`;
				}

				return events.some(
					(event) => event.type === target.type && isAbout(event.payload),
				)
					? "ok"
					: false;
			},
			{ type, id, since },
			{ timeout },
		)
		.then(async (handle) => handle.jsonValue())
		.catch(() => `no ${type} for ${id} within ${timeout / 1000}s`);
	if (result !== "ok") {
		throw new GateError(String(result));
	}
}

/**
The story's snapshot, after pausing infinite and SVG animations at 0, which would otherwise
never hold still.
*/
export async function snapshot(frame: Frame): Promise<string> {
	return frame.evaluate(() => {
		for (const animation of document.getAnimations()) {
			const timing = animation.effect?.getComputedTiming();
			if (timing === undefined || Number.isFinite(timing.endTime)) {
				continue;
			}

			animation.pause();
			animation.currentTime = 0;
		}

		for (const svg of document.querySelectorAll("svg")) {
			svg.pauseAnimations();
			svg.setCurrentTime(0);
		}

		const skipped = new Set(["SCRIPT", "STYLE", "LINK", "NOSCRIPT"]);
		const copy = document.body.cloneNode(true) as HTMLElement;
		for (const node of copy.querySelectorAll("script, style, link, noscript")) {
			node.remove();
		}

		const values = [
			...document.querySelectorAll<HTMLInputElement>("input, textarea, select"),
		].map((field) => `${field.value}:${String(field.checked)}`);
		const boxes = [...document.body.querySelectorAll("*")]
			.filter((element) => !skipped.has(element.tagName))
			.map((element) => {
				const box = element.getBoundingClientRect();
				return [box.x, box.y, box.width, box.height]
					.map((value) => Math.round(value))
					.join(",");
			});
		return [copy.outerHTML, values.join("|"), boxes.join(";")].join("\n");
	});
}

/**
Waits until the snapshot holds for `settleFor`, within `settleWithin`, and returns it.
*/
export async function settled(frame: Frame): Promise<string> {
	await frame.evaluate(async () => document.fonts.ready);
	const start = Date.now();
	let last = await snapshot(frame);
	let since = Date.now();
	/* eslint-disable no-await-in-loop -- each reading follows the last */
	while (Date.now() - start < settleWithin) {
		await delay(100);
		const now = await snapshot(frame);
		if (now !== last) {
			last = now;
			since = Date.now();
			continue;
		}

		if (Date.now() - since >= settleFor) {
			return now;
		}
	}
	/* eslint-enable no-await-in-loop */

	throw new GateError(
		`the story never settles: it still changed after ${settleWithin / 1000}s`,
	);
}
