/**
Pixel comparison for the parity gate. Two screenshots are compared region by region (the
preview's sections, then the whole page), so a small defect in one section isn't diluted by a
tall page. Anti-aliased pixels don't count, and the per-pixel colour threshold absorbs the
sub-pixel noise two identical renders can still show.
*/
import { Buffer } from "node:buffer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type { Region } from "./capture.ts";

export type RegionDiff = {
	label: string;

	/**
	Pixels that differ, not counting anti-aliasing.
	*/
	pixels: number;
	area: number;
};

export type ImageDiff = {
	reference: { width: number; height: number };
	candidate: { width: number; height: number };
	regions: RegionDiff[];

	/**
	The whole-page diff image: differing pixels in red over a faded reference.
	*/
	image: Buffer;
};

/**
The colour distance under which two pixels count as equal, on pixelmatch's 0–1 scale. 0.02 tells
neighbouring tokens apart (ink from ink-hover, danger from danger-hover), which pixelmatch's
default 0.1 doesn't, and still ignores one-step rounding noise.
*/
export const pixelThreshold = 0.02;

// The option names are pixelmatch's.
// eslint-disable-next-line @typescript-eslint/naming-convention
const matchOptions = { threshold: pixelThreshold, includeAA: false };

function crop(image: PNG, box: Region, width: number, height: number): Buffer {
	const out = Buffer.alloc(width * height * 4);
	const rowBytes = width * 4;
	for (let row = 0; row < height; row++) {
		const rowStart = (box.y + row) * image.width;
		const from = (rowStart + box.x) * 4;
		image.data.copy(out, row * rowBytes, from, from + rowBytes);
	}

	return out;
}

/**
Compares two PNG screenshots in each region, clipped to the area both images share. A size
difference is reported separately by the caller.
*/
export function diffImages(
	referencePng: Buffer,
	candidatePng: Buffer,
	regions: Region[],
): ImageDiff {
	const reference = PNG.sync.read(referencePng);
	const candidate = PNG.sync.read(candidatePng);
	const sharedWidth = Math.min(reference.width, candidate.width);
	const sharedHeight = Math.min(reference.height, candidate.height);
	const results: RegionDiff[] = regions.map((region) => {
		const x = Math.max(0, region.x);
		const y = Math.max(0, region.y);
		const width = Math.min(region.width, sharedWidth - x);
		const height = Math.min(region.height, sharedHeight - y);
		if (width <= 0 || height <= 0) {
			return { label: region.label, pixels: 0, area: 0 };
		}

		const box = { ...region, x, y };
		const pixels = pixelmatch(
			crop(reference, box, width, height),
			crop(candidate, box, width, height),
			undefined,
			width,
			height,
			matchOptions,
		);
		return { label: region.label, pixels, area: width * height };
	});

	const whole = {
		label: "page",
		x: 0,
		y: 0,
		width: sharedWidth,
		height: sharedHeight,
	};
	const output = new PNG({ width: sharedWidth, height: sharedHeight });
	pixelmatch(
		crop(reference, whole, sharedWidth, sharedHeight),
		crop(candidate, whole, sharedWidth, sharedHeight),
		output.data,
		sharedWidth,
		sharedHeight,
		{ ...matchOptions, alpha: 0.2 },
	);
	return {
		reference: { width: reference.width, height: reference.height },
		candidate: { width: candidate.width, height: candidate.height },
		regions: results,
		image: PNG.sync.write(output),
	};
}
