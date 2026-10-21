import { expect, test } from "vitest";
import { cx } from "./cx.js";
import { toMs } from "./dom.js";

test("cx joins the truthy class names", () => {
	expect(cx("gl-button", false, undefined, "gl-button-primary", 0, null)).toBe(
		"gl-button gl-button-primary",
	);
	expect(cx()).toBe("");
});

test("toMs reads milliseconds and seconds", () => {
	expect(toMs("160ms")).toBe(160);
	expect(toMs(" 0.2s ")).toBe(200);
	expect(toMs("nonsense")).toBe(0);
});
