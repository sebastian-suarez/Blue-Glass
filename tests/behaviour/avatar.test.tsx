import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import "#ui/styles.css";
import { Avatar, AvatarGroup, Icon, type AvatarSize } from "#ui";

afterEach(() => {
	cleanup();
});

// A 1×1 PNG that loads, and bytes that aren't an image, so the photo fails without a network.
const photo =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const broken = "data:image/png;base64,AAAA";

const people = [
	"Ana Lopez",
	"Ben Ortiz",
	"Cy Diaz",
	"Di Ruiz",
	"Ed Mora",
	"Flo Vega",
	"Gus Rey",
];

function avatar(name: string): HTMLElement {
	return screen.getByRole("img", { name });
}

function group(name: string): HTMLElement {
	return screen.getByRole("group", { name });
}

function size(element: Element): [number, number] {
	const box = element.getBoundingClientRect();
	return [Math.round(box.width), Math.round(box.height)];
}

/**
The colour a token resolves to, read from a probe element styled with it.
*/
function resolvedColour(token: string): string {
	const probe = document.createElement("div");
	probe.style.color = `var(${token})`;
	document.body.append(probe);
	const { color } = getComputedStyle(probe);
	probe.remove();
	return color;
}

/**
The markup of a glyph as Icon draws it, to compare with what a component shows.
*/
function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
}

/**
Waits for the photo to load: the image named by alt is an <img> showing the source.
*/
async function loadedPhoto(name: string, source: string) {
	return vi.waitFor(
		() => {
			const image = avatar(name);
			if (!(image instanceof HTMLImageElement)) {
				throw new TypeError(`${name} isn't a photo yet`);
			}

			expect(image).toHaveAttribute("src", source);
			expect(image.complete).toBe(true);
			return image;
		},
		{ timeout: 5000 },
	);
}

/**
The first people as lettered avatars, the children of a group.
*/
function avatars(count: number) {
	return people.slice(0, count).map((name) => <Avatar key={name} alt={name} />);
}

/**
Checks that a group shows the first people, in reading order, and none of the rest.
*/
function expectShown(element: HTMLElement, count: number) {
	const shown = people
		.slice(0, count)
		.map((name) => within(element).getByRole("img", { name }));
	for (const [index, item] of shown.entries()) {
		if (index > 0) {
			expect(shown[index - 1].compareDocumentPosition(item)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
		}
	}

	for (const name of people.slice(count)) {
		expect(within(element).queryByRole("img", { name })).toBeNull();
	}
}

describe("Avatar", () => {
	test("a lettered avatar shows the initials from alt and is read as that name", () => {
		render(<Avatar alt="Sebastian Suarez" />);
		expect(avatar("Sebastian Suarez")).toHaveTextContent("SS");
	});

	test("the root is a span by default, component changes the element, and the ref is the root", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<>
				<Avatar ref={ref} alt="Sebastian Suarez" className="custom" />
				<Avatar component="div" alt="Limber Health" />
			</>,
		);
		const root = avatar("Sebastian Suarez");
		expect(root).toBeInstanceOf(HTMLSpanElement);
		expect(ref.current).toBe(root);
		expect(root).toHaveClass("custom");
		expect(avatar("Limber Health")).toBeInstanceOf(HTMLDivElement);
	});

	test("children replace the derived initials, and alt still names the avatar", () => {
		render(<Avatar alt="Sebastian Suarez">ss</Avatar>);
		expect(avatar("Sebastian Suarez")).toHaveTextContent("ss");
		expect(avatar("Sebastian Suarez")).not.toHaveTextContent("SS");
	});

	test("aria-hidden reaches the root, for an avatar beside a visible name", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<p>
				<Avatar ref={ref} aria-hidden="true">
					SS
				</Avatar>{" "}
				Sebastian Suarez
			</p>,
		);
		expect(ref.current).toHaveAttribute("aria-hidden", "true");
		expect(screen.queryByRole("img")).toBeNull();
	});

	test("with no photo, children or alt, it shows the user glyph", () => {
		const ref = React.createRef<HTMLSpanElement>();
		const user = glyph("user");
		render(<Avatar ref={ref} />);
		expect(ref.current?.querySelector("svg")?.getHTML()).toBe(user);
	});

	test("src shows the photo once it loads, with alt as its alt text", async () => {
		render(<Avatar src={photo} alt="Sebastian Suarez" />);
		await loadedPhoto("Sebastian Suarez", photo);
		expect(screen.queryByText("SS")).toBeNull();
	});

	test("srcSet, sizes and imgProps reach the img", async () => {
		render(
			<Avatar
				src={photo}
				srcSet={`${photo} 1x`}
				sizes="40px"
				alt="Sebastian Suarez"
				imgProps={{ referrerPolicy: "no-referrer", decoding: "async" }}
			/>,
		);
		const image = await loadedPhoto("Sebastian Suarez", photo);
		expect(image).toHaveAttribute("srcset", `${photo} 1x`);
		expect(image).toHaveAttribute("sizes", "40px");
		expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
		expect(image).toHaveAttribute("decoding", "async");
	});

	test("when the photo fails, children show", async () => {
		render(
			<Avatar src={broken} alt="Sebastian Suarez">
				S
			</Avatar>,
		);
		await vi.waitFor(() => {
			expect(avatar("Sebastian Suarez")).toHaveTextContent("S");
		});
		expect(document.querySelector("img")).toBeNull();
	});

	test("when the photo fails with no children, the initials from alt show", async () => {
		render(<Avatar src={broken} alt="Sebastian Suarez" />);
		await vi.waitFor(() => {
			expect(avatar("Sebastian Suarez")).toHaveTextContent("SS");
		});
		expect(document.querySelector("img")).toBeNull();
	});

	test("when the photo fails with no children or alt, the user glyph shows", async () => {
		const ref = React.createRef<HTMLSpanElement>();
		const user = glyph("user");
		render(<Avatar ref={ref} src={broken} />);
		await vi.waitFor(() => {
			expect(ref.current?.querySelector("svg")?.getHTML()).toBe(user);
		});
		expect(document.querySelector("img")).toBeNull();
	});

	test("variant is circle by default, and each variant puts its class on the root", () => {
		render(
			<>
				<Avatar alt="Ana Lopez" />
				<Avatar variant="circle" alt="Ben Ortiz" />
				<Avatar variant="tile" alt="Cy Diaz" />
			</>,
		);
		expect(avatar("Ana Lopez")).toHaveClass("gl-avatar-circle");
		expect(avatar("Ben Ortiz")).toHaveClass("gl-avatar-circle");
		expect(avatar("Cy Diaz")).toHaveClass("gl-avatar-tile");
	});

	test("size: xs is 24px, sm 32px, md (the default) 40px and lg 56px, as a circle or a tile", () => {
		const sizes = [
			["xs", 24],
			["sm", 32],
			["md", 40],
			["lg", 56],
		] as const satisfies ReadonlyArray<readonly [AvatarSize, number]>;
		render(
			<>
				<Avatar alt="Default Size" />
				{sizes.map(([avatarSize]) => (
					<React.Fragment key={avatarSize}>
						<Avatar size={avatarSize} alt={`Circle ${avatarSize}`} />
						<Avatar
							variant="tile"
							size={avatarSize}
							alt={`Tile ${avatarSize}`}
						/>
					</React.Fragment>
				))}
			</>,
		);
		expect(size(avatar("Default Size"))).toEqual([40, 40]);
		for (const [avatarSize, pixels] of sizes) {
			expect(size(avatar(`Circle ${avatarSize}`))).toEqual([pixels, pixels]);
			expect(size(avatar(`Tile ${avatarSize}`))).toEqual([pixels, pixels]);
		}

		for (const avatarSize of ["xs", "sm", "lg"]) {
			expect(avatar(`Circle ${avatarSize}`)).toHaveClass(
				`gl-avatar-${avatarSize}`,
			);
		}
	});

	test("orb picks one of the three orbs, and by default a name always gets the same one", () => {
		const names = [
			"Limber Health",
			"Intive",
			"SunDevs",
			"EPAM",
			"Gorilla Logic",
		];
		render(
			<>
				<Avatar orb={0} alt="Orb 0" />
				<Avatar orb={1} alt="Orb 1" />
				<Avatar orb={2} alt="Orb 2" />
				{names.map((name) => (
					<React.Fragment key={name}>
						<Avatar alt={name} />
						<Avatar alt={name} />
					</React.Fragment>
				))}
			</>,
		);
		const background = (element: Element) =>
			getComputedStyle(element).backgroundImage;
		const orbs = ["Orb 0", "Orb 1", "Orb 2"].map((name) =>
			background(avatar(name)),
		);
		expect(new Set(orbs).size).toBe(3);
		expect(avatar("Orb 1")).toHaveClass("gl-avatar-orb-1");
		expect(avatar("Orb 2")).toHaveClass("gl-avatar-orb-2");
		for (const name of names) {
			const [first, second] = screen.getAllByRole("img", { name });
			expect(orbs).toContain(background(first));
			expect(background(second)).toBe(background(first));
		}
	});
});

describe("AvatarGroup", () => {
	test("renders a group named by aria-label, and the ref is its div", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<AvatarGroup ref={ref} aria-label="Reviewers" className="custom">
				{avatars(3)}
			</AvatarGroup>,
		);
		const element = group("Reviewers");
		expect(element).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(element);
		expect(element).toHaveClass("custom");
		expectShown(element, 3);
	});

	test("component changes the group's element", () => {
		render(
			<AvatarGroup component="section" aria-label="Reviewers">
				{avatars(2)}
			</AvatarGroup>,
		);
		expect(group("Reviewers").tagName).toBe("SECTION");
	});

	test('max (5 by default) counts the "+N" as one, and the first avatars show', () => {
		render(
			<>
				<AvatarGroup aria-label="Default">{avatars(7)}</AvatarGroup>
				<AvatarGroup max={3} aria-label="Three">
					{avatars(7)}
				</AvatarGroup>
			</>,
		);
		expectShown(group("Default"), 4);
		expect(within(group("Default")).getByText("+3")).toBeVisible();
		expectShown(group("Three"), 2);
		expect(within(group("Three")).getByText("+5")).toBeVisible();
	});

	test('never "+1": when the count equals max, every avatar shows', () => {
		render(
			<>
				<AvatarGroup aria-label="Five">{avatars(5)}</AvatarGroup>
				<AvatarGroup max={4} aria-label="Four">
					{avatars(4)}
				</AvatarGroup>
			</>,
		);
		expectShown(group("Five"), 5);
		expectShown(group("Four"), 4);
		expect(screen.queryByText(/^\+/v)).toBeNull();
	});

	test('the "+N" is read as "N more"', () => {
		// A link takes its name from its content, so its name is what the group reads as.
		render(
			<a href="#reviewers">
				<AvatarGroup max={3}>{avatars(5)}</AvatarGroup>
			</a>,
		);
		expect(
			screen.getByRole("link", { name: "Ana Lopez Ben Ortiz 3 more" }),
		).toBeInTheDocument();
	});

	test("total counts the rest from the real total when only some avatars are passed", () => {
		render(
			<AvatarGroup total={10} aria-label="Reviewers">
				{avatars(3)}
			</AvatarGroup>,
		);
		expectShown(group("Reviewers"), 3);
		expect(within(group("Reviewers")).getByText("+7")).toBeVisible();
	});

	test("renderSurplus renders the surplus, given its count", () => {
		const renderSurplus = vi.fn((surplus: number) => (
			<a href="#all-reviewers">{`See ${surplus} more`}</a>
		));
		render(
			<AvatarGroup renderSurplus={renderSurplus} aria-label="Reviewers">
				{avatars(7)}
			</AvatarGroup>,
		);
		expect(renderSurplus).toHaveBeenCalledWith(3);
		expect(
			within(group("Reviewers")).getByRole("link", { name: "See 3 more" }),
		).toBeInTheDocument();
		expect(screen.queryByText("+3")).toBeNull();
	});

	test("size and variant apply to every avatar, and an avatar's own wins", () => {
		render(
			<AvatarGroup size="sm" variant="tile" aria-label="Projects">
				<Avatar alt="VSebCode" />
				<Avatar alt="This portfolio" />
				<Avatar size="lg" variant="circle" alt="RS50 bridge" />
			</AvatarGroup>,
		);
		for (const name of ["VSebCode", "This portfolio"]) {
			expect(size(avatar(name))).toEqual([32, 32]);
			expect(avatar(name)).toHaveClass("gl-avatar-tile");
		}

		expect(size(avatar("RS50 bridge"))).toEqual([56, 56]);
		expect(avatar("RS50 bridge")).toHaveClass("gl-avatar-circle");
	});

	test("spacing: md overlaps the avatars by 8px at 40px, and sm by 12px", () => {
		render(
			<>
				<AvatarGroup aria-label="Default">{avatars(2)}</AvatarGroup>
				<AvatarGroup spacing="sm" aria-label="Tight">
					{avatars(2)}
				</AvatarGroup>
			</>,
		);
		const overlap = (name: string) => {
			const [first, second] = within(group(name)).getAllByRole("img");
			const { right } = first.getBoundingClientRect();
			return Math.round(right - second.getBoundingClientRect().left);
		};

		expect(overlap("Default")).toBe(8);
		expect(overlap("Tight")).toBe(12);
	});

	test("each avatar is cut out by a 2px ring of color-canvas, or of --gl-avatar-ring when set", () => {
		const panel = React.createRef<HTMLDivElement>();
		render(
			<>
				<AvatarGroup aria-label="On the canvas">{avatars(2)}</AvatarGroup>
				<div ref={panel}>
					<AvatarGroup aria-label="On a panel">{avatars(2)}</AvatarGroup>
				</div>
			</>,
		);
		// As the README says: on a glass panel, set the variable to the panel's colour.
		panel.current?.style.setProperty("--gl-avatar-ring", "rgb(10, 20, 30)");
		const canvas = resolvedColour("--color-canvas");
		for (const item of within(group("On the canvas")).getAllByRole("img")) {
			expect(getComputedStyle(item).boxShadow).toContain(
				`${canvas} 0px 0px 0px 2px`,
			);
		}

		for (const item of within(group("On a panel")).getAllByRole("img")) {
			expect(getComputedStyle(item).boxShadow).toContain(
				"rgb(10, 20, 30) 0px 0px 0px 2px",
			);
		}
	});

	test('the first avatar sits on top, and the "+N" over the last one', () => {
		render(
			<AvatarGroup max={3} aria-label="Reviewers">
				{avatars(4)}
			</AvatarGroup>,
		);
		const [first, second] = within(group("Reviewers")).getAllByRole("img");
		// 2px inside an avatar's right edge lies in its overlap with the next: what's drawn there is on top.
		const topOver = (element: Element) => {
			const box = element.getBoundingClientRect();
			return document.elementFromPoint(
				box.right - 2,
				(box.top + box.bottom) / 2,
			);
		};

		expect(first.contains(topOver(first))).toBe(true);
		const overLast = topOver(second);
		expect(second.contains(overLast)).toBe(false);
		expect(overLast?.textContent).toContain("+2");
	});
});
