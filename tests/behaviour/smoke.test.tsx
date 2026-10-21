// Proves the behaviour projects reach both targets through "#ui". Each phase's specs replace
// the reference-only branch with real behaviour tests that run on both.
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { expect, test } from "vitest";
import "#ui/styles.css";
import * as ui from "#ui";

const target = import.meta.env.BLUE_GLASS_TARGET as "package" | "reference";

test("the entry point loads", () => {
	expect(typeof ui).toBe("object");
});

test.runIf(target === "reference")(
	"the reference renders a Button with its styles",
	() => {
		const { Button } = ui as unknown as {
			Button: React.ComponentType<{
				variant?: string;
				children?: React.ReactNode;
			}>;
		};
		render(<Button variant="primary">Email me</Button>);
		const button = screen.getByRole("button", { name: "Email me" });
		expect(button.className).toContain("gl-button-primary");
		// The ink fill comes from the reference stylesheet, so the CSS alias resolved.
		expect(getComputedStyle(button).backgroundColor).toBe("rgb(35, 48, 71)");
	},
);
