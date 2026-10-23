import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
} from "#ui";

afterEach(() => {
	cleanup();
});

type Click = { type: string; currentTarget: EventTarget };

function recordClicks() {
	const seen: Click[] = [];
	const onClick = vi.fn((event: React.MouseEvent<HTMLElement>) => {
		seen.push({ type: event.type, currentTarget: event.currentTarget });
	});
	return { seen, onClick };
}

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

function isDisabled(element: Element): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

function isInOrder(first: Node, second: Node): boolean {
	return (
		first.compareDocumentPosition(second) === Node.DOCUMENT_POSITION_FOLLOWING
	);
}

const services = [
	"Astro 7",
	"TypeScript",
	"Cloudflare",
	"CloudFront",
	"PostgreSQL",
	"MongoDB",
	"GitHub Actions",
	"OpenAPI",
	"Rust",
	"Node.js",
];

describe("List", () => {
	test("renders a ul named by its aria-label, or an ol with component, and the ref is the list", () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<>
				<List ref={ref} aria-label="Recent roles">
					<ListItem>EPAM</ListItem>
				</List>
				<List component="ol" aria-label="Steps">
					<ListItem>Plan</ListItem>
				</List>
			</>,
		);
		const list = screen.getByRole("list", { name: "Recent roles" });
		expect(list.tagName).toBe("UL");
		expect(ref.current).toBe(list);
		expect(screen.getByRole("list", { name: "Steps" }).tagName).toBe("OL");
	});

	test("subheader renders first, before the rows", () => {
		render(
			<List
				aria-label="Services"
				subheader={<ListSubheader>Develop</ListSubheader>}
			>
				<ListItem>Astro 7</ListItem>
			</List>,
		);
		const list = screen.getByRole("list", { name: "Services" });
		expect(
			isInOrder(
				within(list).getByText("Develop"),
				within(list).getByText("Astro 7"),
			),
		).toBe(true);
	});

	test("dense and divided put their classes on the list, and dense reaches every row that doesn't opt out", () => {
		render(
			<>
				<List dense divided aria-label="Services">
					<ListItem>Astro 7</ListItem>
					<ListItemButton>TypeScript</ListItemButton>
					<ListItem dense={false}>Cloudflare</ListItem>
				</List>
				<List aria-label="Roles">
					<ListItem>EPAM</ListItem>
				</List>
			</>,
		);
		const dense = screen.getByRole("list", { name: "Services" });
		expect(dense).toHaveClass("gl-list-dense", "gl-list-divided");
		expect(within(dense).getByText("Astro 7")).toHaveClass(
			"gl-list-item-dense",
		);
		expect(screen.getByRole("button", { name: "TypeScript" })).toHaveClass(
			"gl-list-button-dense",
		);
		expect(within(dense).getByText("Cloudflare")).not.toHaveClass(
			"gl-list-item-dense",
		);

		const regular = screen.getByRole("list", { name: "Roles" });
		expect(regular).not.toHaveClass("gl-list-dense");
		expect(regular).not.toHaveClass("gl-list-divided");
		expect(within(regular).getByText("EPAM")).not.toHaveClass(
			"gl-list-item-dense",
		);
	});
});

describe("ListItem", () => {
	test("renders an li, or the element component names, and the ref is the row", () => {
		const ref = React.createRef<HTMLElement>();
		const divRef = React.createRef<HTMLElement>();
		render(
			<>
				<List aria-label="Roles">
					<ListItem ref={ref}>EPAM</ListItem>
				</List>
				<ListItem ref={divRef} component="div">
					Intive
				</ListItem>
			</>,
		);
		const row = screen.getByRole("listitem");
		expect(row.tagName).toBe("LI");
		expect(ref.current).toBe(row);
		expect(divRef.current?.tagName).toBe("DIV");
		expect(divRef.current).toHaveTextContent("Intive");
	});

	test("divider, disableGutters, disablePadding and alignItems put their classes on the row", () => {
		render(
			<List aria-label="Roles">
				<ListItem>Plain</ListItem>
				<ListItem divider>Divider</ListItem>
				<ListItem disableGutters>No gutters</ListItem>
				<ListItem disablePadding>No padding</ListItem>
				<ListItem alignItems="flex-start">Top</ListItem>
				<ListItem alignItems="center">Centre</ListItem>
			</List>,
		);
		const variants = [
			["Divider", "gl-list-item-divider"],
			["No gutters", "gl-list-item-no-gutters"],
			["No padding", "gl-list-item-flush"],
			["Top", "gl-list-item-align-start"],
		] as const;
		for (const [name, className] of variants) {
			expect(screen.getByText(name)).toHaveClass(className);
			expect(screen.getByText("Plain")).not.toHaveClass(className);
		}

		expect(screen.getByText("Centre")).not.toHaveClass(
			"gl-list-item-align-start",
		);
	});

	test("secondaryAction renders inside a static row", () => {
		render(
			<List aria-label="Recent roles">
				<ListItem secondaryAction="Mar 2026 – Present">EPAM</ListItem>
			</List>,
		);
		expect(
			within(screen.getByRole("listitem")).getByText("Mar 2026 – Present"),
		).toBeVisible();
	});

	test("on a row that holds a ListItemButton, secondaryAction sits beside the button in the same li, never inside it", () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<List aria-label="Own projects">
				<ListItem
					ref={ref}
					secondaryAction={<button type="button">Repo</button>}
				>
					<ListItemButton>VSebCode</ListItemButton>
				</ListItem>
			</List>,
		);
		const row = screen.getByRole("button", { name: "VSebCode" });
		const action = screen.getByRole("button", { name: "Repo" });
		expect(row.contains(action)).toBe(false);
		expect(action.contains(row)).toBe(false);
		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(1);
		expect(items[0]).toBe(ref.current);
		expect(row.closest("li")).toBe(ref.current);
		expect(action.closest("li")).toBe(ref.current);
	});
});

describe("ListItemButton", () => {
	test("inside a List, each one brings its own li", () => {
		render(
			<List aria-label="Sections">
				<ListItemButton>Own projects</ListItemButton>
				<ListItemButton href="#client-work">Client work</ListItemButton>
			</List>,
		);
		const items = within(
			screen.getByRole("list", { name: "Sections" }),
		).getAllByRole("listitem");
		expect(items).toHaveLength(2);
		expect(within(must(items[0])).getByRole("button")).toHaveAccessibleName(
			"Own projects",
		);
		expect(within(must(items[1])).getByRole("link")).toHaveAccessibleName(
			"Client work",
		);
	});

	test("is a button holding the ref, and a click calls onClick with the click event", async () => {
		const ref = React.createRef<HTMLElement>();
		const { seen, onClick } = recordClicks();
		render(
			<List aria-label="Sections">
				<ListItemButton ref={ref} onClick={onClick}>
					Client work
				</ListItemButton>
			</List>,
		);
		const row = screen.getByRole("button", { name: "Client work" });
		expect(row).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toBe(row);
		await userEvent.click(row);
		expect(seen).toHaveLength(1);
		expect(seen[0]?.type).toBe("click");
		expect(seen[0]?.currentTarget).toBe(row);
	});

	test("href makes it a link, with target and rel, holding the ref", () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<List aria-label="Client work">
				<ListItemButton
					ref={ref}
					href="#limber-health"
					target="_blank"
					rel="noreferrer"
				>
					Limber Health
				</ListItemButton>
			</List>,
		);
		const link = screen.getByRole("link", { name: "Limber Health" });
		expect(link).toBeInstanceOf(HTMLAnchorElement);
		expect(link).toHaveAttribute("href", "#limber-health");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");
		expect(ref.current).toBe(link);
	});

	test("component renders the row as another element", async () => {
		const ref = React.createRef<HTMLElement>();
		const { onClick } = recordClicks();
		render(
			<ListItemButton ref={ref} component="div" onClick={onClick}>
				Experience
			</ListItemButton>,
		);
		const row = must(ref.current);
		expect(row.tagName).toBe("DIV");
		expect(row).toHaveTextContent("Experience");
		await userEvent.click(row);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("selected sets aria-pressed on a button row, and a row without it is no toggle", () => {
		render(
			<List aria-label="Sections">
				<ListItemButton selected>Own projects</ListItemButton>
				<ListItemButton selected={false}>Client work</ListItemButton>
				<ListItemButton>Experience</ListItemButton>
			</List>,
		);
		expect(
			screen.getByRole("button", { name: "Own projects" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Client work" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(
			screen.getByRole("button", { name: "Experience" }),
		).not.toHaveAttribute("aria-pressed");
	});

	test('selected sets aria-current="page" on a link row, and only on the selected one', () => {
		render(
			<List aria-label="Client work">
				<ListItemButton selected href="#limber-health">
					Limber Health
				</ListItemButton>
				<ListItemButton href="#intive" selected={false}>
					Intive
				</ListItemButton>
			</List>,
		);
		const current = screen.getByRole("link", { name: "Limber Health" });
		expect(current).toHaveAttribute("aria-current", "page");
		expect(current).not.toHaveAttribute("aria-pressed");
		expect(screen.getByRole("link", { name: "Intive" })).not.toHaveAttribute(
			"aria-current",
		);
	});

	test("disabled: a button row is disabled, and neither a press nor Enter calls onClick", async () => {
		const { onClick } = recordClicks();
		render(
			<List aria-label="Sections">
				<ListItemButton disabled onClick={onClick}>
					Résumé
				</ListItemButton>
			</List>,
		);
		const row = screen.getByRole("button", { name: "Résumé" });
		expect(isDisabled(row)).toBe(true);
		await userEvent.click(row, { force: true });
		row.focus();
		await userEvent.keyboard("{Enter}");
		expect(onClick).not.toHaveBeenCalled();
	});

	test("disabled: a link row is aria-disabled, and a press neither calls onClick nor navigates", async () => {
		const { onClick } = recordClicks();
		const before = window.location.href;
		render(
			<List aria-label="Sections">
				<ListItemButton disabled href="#resume" onClick={onClick}>
					Résumé
				</ListItemButton>
			</List>,
		);
		const row = screen.getByRole("link", { name: "Résumé" });
		expect(row).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(row, { force: true });
		row.focus();
		await userEvent.keyboard("{Enter}");
		expect(onClick).not.toHaveBeenCalled();
		expect(window.location.href).toBe(before);
	});

	test("end renders inside the row", () => {
		render(
			<List aria-label="Sections">
				<ListItemButton end="4">Own projects</ListItemButton>
			</List>,
		);
		expect(
			screen.getByRole("button", { name: /^Own projects/v }),
		).toContainElement(screen.getByText("4"));
	});

	test("autoFocus focuses the row on mount", async () => {
		render(
			<List aria-label="Sections">
				<ListItemButton>Own projects</ListItemButton>
				{/* eslint-disable-next-line jsx-a11y-x/no-autofocus -- the documented prop under test */}
				<ListItemButton autoFocus>Client work</ListItemButton>
			</List>,
		);
		const row = screen.getByRole("button", { name: "Client work" });
		await expect.poll(() => document.activeElement).toBe(row);
	});

	test('dense and alignItems="flex-start" put their classes on the row', () => {
		render(
			<List aria-label="Sections">
				<ListItemButton>Plain</ListItemButton>
				<ListItemButton dense>Dense</ListItemButton>
				<ListItemButton alignItems="flex-start">Top</ListItemButton>
			</List>,
		);
		const row = (name: string) => screen.getByRole("button", { name });
		expect(row("Dense")).toHaveClass("gl-list-button-dense");
		expect(row("Top")).toHaveClass("gl-list-button-align-start");
		expect(row("Plain")).not.toHaveClass("gl-list-button-dense");
		expect(row("Plain")).not.toHaveClass("gl-list-button-align-start");
	});

	test('a row submits its form only with type="submit"', async () => {
		const onSubmit = vi.fn((event: React.SyntheticEvent) => {
			event.preventDefault();
		});
		render(
			<form onSubmit={onSubmit}>
				<List aria-label="Actions">
					<ListItemButton>Preview</ListItemButton>
					<ListItemButton type="submit">Send</ListItemButton>
				</List>
			</form>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Preview" }));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});
});

describe("Keyboard", () => {
	test("Tab moves between interactive rows and secondary actions; static rows aren't stops", async () => {
		render(
			<>
				<button type="button">Before</button>
				<List aria-label="Own projects">
					<ListItem secondaryAction={<button type="button">Repo</button>}>
						<ListItemButton>VSebCode</ListItemButton>
					</ListItem>
					<ListItem>Clean Architecture template</ListItem>
					<ListItemButton href="#rs50">RS50 bridge</ListItemButton>
				</List>
				<button type="button">After</button>
			</>,
		);
		screen.getByRole("button", { name: "Before" }).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "VSebCode" }),
		);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Repo" }),
		);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: "RS50 bridge" }),
		);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "After" }),
		);
	});

	test("Enter and Space activate a button row, and Enter a link row", async () => {
		const buttonClicks = recordClicks();
		const linkClicks = recordClicks();
		render(
			<List aria-label="Sections">
				<ListItemButton onClick={buttonClicks.onClick}>
					Own projects
				</ListItemButton>
				<ListItemButton
					href="#client-work"
					onClick={(event: React.MouseEvent<HTMLElement>) => {
						event.preventDefault();
						linkClicks.onClick(event);
					}}
				>
					Client work
				</ListItemButton>
			</List>,
		);
		const button = screen.getByRole("button", { name: "Own projects" });
		button.focus();
		await userEvent.keyboard("{Enter}");
		expect(buttonClicks.seen).toHaveLength(1);
		await userEvent.keyboard("[Space]");
		expect(buttonClicks.seen).toHaveLength(2);
		for (const click of buttonClicks.seen) {
			expect(click.type).toBe("click");
			expect(click.currentTarget).toBe(button);
		}

		const link = screen.getByRole("link", { name: "Client work" });
		link.focus();
		await userEvent.keyboard("{Enter}");
		expect(linkClicks.seen).toHaveLength(1);
		expect(linkClicks.seen[0]?.type).toBe("click");
		expect(linkClicks.seen[0]?.currentTarget).toBe(link);
	});

	test("arrow keys don't move focus between rows: a list is no composite widget", async () => {
		render(
			<List aria-label="Sections">
				<ListItemButton>Own projects</ListItemButton>
				<ListItemButton>Client work</ListItemButton>
			</List>,
		);
		const first = screen.getByRole("button", { name: "Own projects" });
		first.focus();
		await userEvent.keyboard("{ArrowDown}");
		expect(document.activeElement).toBe(first);
		await userEvent.keyboard("{ArrowRight}");
		expect(document.activeElement).toBe(first);

		const second = screen.getByRole("button", { name: "Client work" });
		second.focus();
		await userEvent.keyboard("{ArrowUp}");
		expect(document.activeElement).toBe(second);
	});
});

describe("ListItemText and ListItemIcon", () => {
	test("primary comes before the secondary line, children stand in for primary, and the refs are spans", () => {
		const textRef = React.createRef<HTMLSpanElement>();
		const iconRef = React.createRef<HTMLSpanElement>();
		render(
			<List aria-label="Sections">
				<ListItemButton>
					<ListItemIcon ref={iconRef}>
						<span aria-hidden="true">*</span>
					</ListItemIcon>
					<ListItemText
						ref={textRef}
						primary="Experience"
						secondary="10 roles since 2017"
					/>
				</ListItemButton>
				<ListItem>
					<ListItemText secondary="builds static HTML and CSS">
						Astro 7
					</ListItemText>
				</ListItem>
			</List>,
		);
		const text = must(textRef.current);
		expect(text).toBeInstanceOf(HTMLSpanElement);
		expect(
			isInOrder(
				within(text).getByText("Experience"),
				within(text).getByText("10 roles since 2017"),
			),
		).toBe(true);
		expect(
			screen.getByRole("button", { name: /^Experience/v }),
		).toContainElement(text);
		expect(iconRef.current).toBeInstanceOf(HTMLSpanElement);
		expect(iconRef.current).toHaveTextContent("*");
		expect(
			isInOrder(
				screen.getByText("Astro 7"),
				screen.getByText("builds static HTML and CSS"),
			),
		).toBe(true);
	});

	test("inset puts its class on the text, and noWrap cuts the text to one line with an ellipsis", () => {
		const insetRef = React.createRef<HTMLSpanElement>();
		const noWrapRef = React.createRef<HTMLSpanElement>();
		const plainRef = React.createRef<HTMLSpanElement>();
		render(
			<List aria-label="Own projects">
				<ListItem>
					<ListItemText ref={insetRef} inset primary="Clean Architecture" />
				</ListItem>
				<ListItem>
					<ListItemText ref={noWrapRef} noWrap primary="RS50 bridge" />
				</ListItem>
				<ListItem>
					<ListItemText ref={plainRef} primary="VSebCode" />
				</ListItem>
			</List>,
		);
		expect(insetRef.current).toHaveClass("gl-list-text-inset");
		expect(plainRef.current).not.toHaveClass("gl-list-text-inset");
		const cut = getComputedStyle(screen.getByText("RS50 bridge"));
		expect(cut.whiteSpace).toBe("nowrap");
		expect(cut.textOverflow).toBe("ellipsis");
		expect(cut.overflow).toBe("hidden");
		expect(getComputedStyle(screen.getByText("VSebCode")).whiteSpace).not.toBe(
			"nowrap",
		);
	});
});

describe("ListSubheader", () => {
	test("renders an li, or the element component names, with the ref; inset puts its class on it", () => {
		const ref = React.createRef<HTMLElement>();
		const divRef = React.createRef<HTMLElement>();
		render(
			<>
				<List aria-label="Services">
					<ListSubheader ref={ref} inset>
						Develop
					</ListSubheader>
					<ListItem>Astro 7</ListItem>
				</List>
				<ListSubheader ref={divRef} component="div">
					Serve
				</ListSubheader>
			</>,
		);
		const subheader = screen.getByText("Develop");
		expect(subheader.tagName).toBe("LI");
		expect(ref.current).toBe(subheader);
		expect(subheader).toHaveClass("gl-list-subheader-inset");
		expect(divRef.current?.tagName).toBe("DIV");
		expect(divRef.current).not.toHaveClass("gl-list-subheader-inset");
	});

	test("a sticky subheader stays at the top of a scrolling list, where a plain one scrolls away", () => {
		const scrolling = { maxHeight: 120, overflowY: "auto" } as const;
		render(
			<>
				<List
					aria-label="Sticky"
					style={scrolling}
					subheader={<ListSubheader sticky>Develop</ListSubheader>}
				>
					{services.map((name) => (
						<ListItem key={name}>{name}</ListItem>
					))}
				</List>
				<List
					aria-label="Plain"
					style={scrolling}
					subheader={<ListSubheader>Serve</ListSubheader>}
				>
					{services.map((name) => (
						<ListItem key={name}>{name}</ListItem>
					))}
				</List>
			</>,
		);
		const sticky = screen.getByRole("list", { name: "Sticky" });
		const plain = screen.getByRole("list", { name: "Plain" });
		sticky.scrollTop = 200;
		plain.scrollTop = 200;
		expect(sticky.scrollTop).toBe(200);
		expect(plain.scrollTop).toBe(200);
		expect(screen.getByText("Develop").getBoundingClientRect().top).toBeCloseTo(
			sticky.getBoundingClientRect().top,
			0,
		);
		expect(
			screen.getByText("Serve").getBoundingClientRect().bottom,
		).toBeLessThanOrEqual(plain.getBoundingClientRect().top);
	});
});
