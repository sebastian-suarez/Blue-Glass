import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import "../../styles/index.css";
import { Select } from "./Select.js";

afterEach(() => {
	cleanup();
});

test("an in-place list fits a transformed containing block and follows its resize", async () => {
	const options = Array.from({ length: 24 }, (_, hour) => ({
		value: String(hour),
		label: `${String(hour).padStart(2, "0")}:00`,
	}));
	const stage = (height: number) => (
		<div
			data-testid="stage"
			style={{ height, padding: 8, transform: "translateZ(0)" }}
		>
			<Select
				defaultOpen
				label="Hour"
				options={options}
				PopoverProps={{
					disablePortal: true,
					disableScrollLock: true,
					disableEnforceFocus: true,
					transitionDuration: 0,
				}}
			/>
		</div>
	);
	const { rerender } = render(stage(300));
	const list = screen.getByRole("listbox", { name: "Hour" });
	const surface = list.closest<HTMLElement>(".gl-select-popover")!;
	const bounds = () => screen.getByTestId("stage").getBoundingClientRect();
	await expect
		.poll(() => surface.getBoundingClientRect().height)
		.toBeGreaterThan(80);
	await expect
		.poll(() => surface.getBoundingClientRect().bottom)
		.toBeLessThanOrEqual(bounds().bottom);
	const initialHeight = surface.getBoundingClientRect().height;
	rerender(stage(240));
	await expect
		.poll(() => surface.getBoundingClientRect().height)
		.toBeLessThan(initialHeight);
	await expect
		.poll(() => surface.getBoundingClientRect().bottom)
		.toBeLessThanOrEqual(bounds().bottom);
});
