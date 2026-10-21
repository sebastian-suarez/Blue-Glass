import type { Combobox } from "@base-ui/react/combobox";
import type { Menu } from "@base-ui/react/menu";
import type { Select } from "@base-ui/react/select";
import type { Tooltip } from "@base-ui/react/tooltip";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, expectTypeOf, test, vi } from "vitest";
import type * as Reference from "../../design-system/source/index.js";
import {
	type AnchorEl,
	type Placement,
	splitPlacement,
	toPlacement,
	toPositionerProps,
	useBaseAnchor,
	type VirtualElement,
} from "./anchor.js";

const placements: Placement[] = [
	"top",
	"top-start",
	"top-end",
	"bottom",
	"bottom-start",
	"bottom-end",
	"left",
	"left-start",
	"left-end",
	"right",
	"right-start",
	"right-end",
];

test("the types are the documented ones", () => {
	expectTypeOf<Placement>().toEqualTypeOf<Reference.Placement>();
	expectTypeOf<VirtualElement>().toEqualTypeOf<Reference.VirtualElement>();
	expectTypeOf<AnchorEl>().toEqualTypeOf<Reference.AnchorEl>();
});

describe("placement", () => {
	test("splits into a side and an alignment, center when there's none", () => {
		expect(splitPlacement("bottom-start")).toEqual({
			side: "bottom",
			align: "start",
		});
		expect(splitPlacement("left")).toEqual({ side: "left", align: "center" });
	});

	test("comes back from Base UI's side and align for all twelve", () => {
		for (const placement of placements) {
			const { side, align } = splitPlacement(placement);
			expect(toPlacement(side, align)).toBe(placement);
		}
	});

	test("anything else from Base UI maps to nothing, never to a wrong placement", () => {
		expect(toPlacement("inline-start", "center")).toBeUndefined();
		expect(toPlacement("bottom", "middle")).toBeUndefined();
	});
});

describe("positioner props", () => {
	test("carry the side, alignment, gap and the reference's collision rules", () => {
		expect(toPositionerProps({ placement: "top-end", offset: 12 })).toEqual({
			side: "top",
			align: "end",
			sideOffset: 12,
			alignOffset: 0,
			collisionPadding: 8,
			collisionAvoidance: {
				side: "flip",
				align: "shift",
				fallbackAxisSide: "none",
			},
			positionMethod: "fixed",
		});
		expect(toPositionerProps({ placement: "bottom" }).sideOffset).toBe(8);
	});

	test("fit every Base UI positioner the ports use", () => {
		const props = toPositionerProps({ placement: "bottom-start" });
		expectTypeOf(props).toExtend<Partial<Menu.Positioner.Props>>();
		expectTypeOf(props).toExtend<Partial<Tooltip.Positioner.Props>>();
		expectTypeOf(props).toExtend<Partial<Select.Positioner.Props>>();
		expectTypeOf(props).toExtend<Partial<Combobox.Positioner.Props>>();
	});
});

describe("useBaseAnchor on the server", () => {
	const virtual: VirtualElement = {
		getBoundingClientRect() {
			throw new Error("Nothing is measured on the server");
		},
	};

	/**
	Server-renders the hook and returns what it gave Base UI.
	*/
	function serverAnchor(anchor: AnchorEl): string {
		// eslint-disable-next-line @typescript-eslint/naming-convention -- A component, in a Node test that can't hold JSX.
		function Probe() {
			const resolved = useBaseAnchor(anchor);
			return createElement(
				"output",
				null,
				resolved === null ? "none" : resolved === anchor ? "same" : "other",
			);
		}

		return renderToString(createElement(Probe));
	}

	test("never calls a function anchor or measures anything while rendering", () => {
		const anchor = vi.fn<() => VirtualElement>(() => virtual);
		// No anchor until the browser has committed and asked the function.
		expect(serverAnchor(anchor)).toBe("<output>none</output>");
		expect(anchor).not.toHaveBeenCalled();
	});

	test("passes a virtual element or null through as it is", () => {
		expect(serverAnchor(virtual)).toBe("<output>same</output>");
		expect(serverAnchor(null)).toBe("<output>none</output>");
	});

	test("gives what Base UI's anchor takes", () => {
		expectTypeOf(useBaseAnchor).returns.toExtend<
			Menu.Positioner.Props["anchor"]
		>();
	});
});
