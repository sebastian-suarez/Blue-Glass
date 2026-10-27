"use client";
import * as React from "react";

export function fold(text: string): string {
	return text
		.normalize("NFD")
		.replaceAll(/[\u{300}-\u{36F}]/gu, "")
		.toLowerCase();
}

export function matchRange(
	text: string,
	query: string,
): [number, number] | null {
	const needle = fold(query.trim());
	if (needle === "") {
		return null;
	}

	let folded = "";
	const starts: number[] = [];
	const ends: number[] = [];
	let offset = 0;
	for (const character of text) {
		const part = fold(character);
		for (let remaining = part.length; remaining > 0; remaining--) {
			starts.push(offset);
			ends.push(offset + character.length);
		}

		folded += part;
		offset += character.length;
	}

	const index = folded.indexOf(needle);
	return index === -1 ? null : [starts[index], ends[index + needle.length - 1]];
}

export function stepIndex(
	from: number,
	direction: 1 | -1,
	count: number,
	isEnabled: (index: number) => boolean,
	shouldWrap = false,
): number {
	if (count <= 0) {
		return -1;
	}

	let index = from < 0 ? (direction > 0 ? -1 : count) : from;
	for (let visited = 0; visited < count; visited++) {
		index += direction;
		if (index >= count || index < 0) {
			if (!shouldWrap) {
				return from >= 0 && from < count ? from : -1;
			}

			index = index >= count ? 0 : count - 1;
		}

		if (isEnabled(index)) {
			return index;
		}
	}

	return from;
}

export function edgeIndex(
	direction: 1 | -1,
	count: number,
	isEnabled: (index: number) => boolean,
): number {
	return stepIndex(-1, direction, count, isEnabled);
}

export function jumpIndex(
	from: number,
	delta: number,
	count: number,
	isEnabled: (index: number) => boolean,
): number {
	if (count <= 0) {
		return -1;
	}

	const direction = delta > 0 ? 1 : -1;
	let target = Math.min(count - 1, Math.max(0, Math.max(from, 0) + delta));
	if (isEnabled(target)) {
		return target;
	}

	const forward = stepIndex(target, direction, count, isEnabled);
	if (forward !== target && isEnabled(forward)) {
		return forward;
	}

	target = stepIndex(target, direction === 1 ? -1 : 1, count, isEnabled);
	return isEnabled(target) ? target : from;
}

export function isPrintableKey(event: {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
}): boolean {
	return (
		event.key.length === 1 &&
		event.key !== " " &&
		!event.ctrlKey &&
		!event.metaKey &&
		!event.altKey
	);
}

export function useTypeahead(timeout = 500) {
	const searchRef = React.useRef<{
		text: string;
		timer: ReturnType<typeof setTimeout> | undefined;
	}>({ text: "", timer: undefined });
	React.useEffect(
		() => () => {
			clearTimeout(searchRef.current.timer);
		},
		[],
	);
	return React.useCallback(
		(
			character: string,
			labels: string[],
			active: number,
			isEnabled: (index: number) => boolean,
		): number => {
			const search = searchRef.current;
			const letter = fold(character);
			clearTimeout(search.timer);
			search.text += letter;
			search.timer = setTimeout(() => {
				search.text = "";
			}, timeout);
			const count = labels.length;
			const find = (needle: string, start: number) => {
				for (let visited = 0; visited < count; visited++) {
					const index = (((start + visited) % count) + count) % count;
					if (isEnabled(index) && fold(labels[index]).startsWith(needle)) {
						return index;
					}
				}

				return -1;
			};

			let index = find(
				search.text,
				search.text.length > 1 ? Math.max(active, 0) : active + 1,
			);
			if (index === -1 && search.text.length > 1) {
				const isRepeated = [...search.text].every(
					(part) => part === search.text[0],
				);
				index = find(isRepeated ? search.text[0] : letter, active + 1);
				if (!isRepeated) {
					search.text = letter;
				}
			}

			if (index === -1) {
				search.text = "";
			}

			return index;
		},
		[timeout],
	);
}

function pixels(value: string): number {
	// eslint-disable-next-line unicorn/prefer-number-coercion
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function scrollIntoViewNearest(
	element: Element | null | undefined,
): void {
	if (!element) {
		return;
	}

	let scroller = element.parentElement;
	while (scroller) {
		const overflow = getComputedStyle(scroller).overflowY;
		if (
			["auto", "scroll"].includes(overflow) &&
			scroller.scrollHeight > scroller.clientHeight
		) {
			break;
		}

		scroller = scroller.parentElement;
	}

	if (!scroller) {
		return;
	}

	const style = getComputedStyle(scroller);
	const box = scroller.getBoundingClientRect();
	const item = element.getBoundingClientRect();
	const top = box.top + scroller.clientTop + pixels(style.paddingTop);
	const bottom =
		box.top +
		scroller.clientTop +
		scroller.clientHeight -
		pixels(style.paddingBottom);
	if (item.top < top) {
		scroller.scrollTop -= top - item.top;
	} else if (item.bottom > bottom) {
		scroller.scrollTop += item.bottom - bottom;
	}
}
