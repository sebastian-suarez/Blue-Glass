import { type Browser, chromium } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";
import { visibleTexts } from "../../scripts/lib/capture.ts";

let browser: Browser;

beforeAll(async () => {
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser.close();
});

test("the server-HTML gate doesn't see text a clip-path cuts away or a transparent colour hides", async () => {
	const page = await browser.newPage();
	await page.setContent(`<div id="root">
		<p>Shown</p>
		<p style="clip-path: inset(100%)">Cut away</p>
		<p style="clip-path: inset(0 0 50% 0)">Half cut</p>
		<p style="color: transparent">Transparent</p>
		<p style="color: transparent; background: linear-gradient(red, blue); background-clip: text">Gradient</p>
	</div>`);
	expect(await visibleTexts(page)).toEqual(["Shown", "Half cut", "Gradient"]);
	await page.close();
}, 30_000);
