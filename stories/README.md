# Stories

Storybook documents the package. `npm run storybook` serves it, `npm run build-storybook` builds it, and `npx vitest run --project storybook` renders every story in Chromium and fails any with an axe violation.

## A component's stories

- **File:** a phase that ports `<Name>` adds `src/components/<Name>/<Name>.stories.tsx`.
- **Title:** `"<Group>/<Name>"`, with the group from the `@dsCard group="…"` comment that opens `design-system/components/<Name>/preview.html`.
- **Docs page:** set `component`, and pass the README to `componentDocs` from `blocks/component-docs.tsx`. The page shows the README, the stories, then the props table.
- **Stories:** one per section of the preview, in its order. A story's `name` is the section's title and its `parameters.docs.description.story` the section's note, word for word; it renders the section's content with the same props and copy.
- **Layout:** the decorator in `.storybook/frame.tsx` draws the preview's frame and section grid. The preview's other helpers are in `blocks/preview-kit.tsx`: `Stack`, `Row`, `Tiles`, `Labelled`, `Caption` and `Stage`. A component a preview defines for its example, like Button's contact block, becomes a function in the stories file.
- **Frame:** `parameters.frame` is `{ field: false }` for LightField's stories and `false` for the site's sections, which bring their own page. Phase 1 puts `<LightField variant="compact" />` in `.storybook/frame-field.tsx`.
- **Controls:** off for every story (`.storybook/preview.tsx`), and on again only in Default, for the args it renders through.
  - The args are the props the preview gives one instance: the `meta.component` one, or the root of a compound component (ToggleButton's group, Tabs, Table). Default renders that instance with `{...args}`, keeping the preview's copy and layout, so its HTML stays the preview's. Other instances keep their own props.
  - `parameters.controls.include` lists the args that act, each a boolean, number or string with a value. Leave out a prop whose parent owns it (a grouped ToggleButton's `selected`), one whose default follows another prop (Link's `color`, Paper's `radius`), and one that acts only after mount (the charts' `reveal`).
  - A union prop of `meta.component` takes its options from docgen. Give `argTypes` to anything else: `control: "text"` for content (`children`, `label`), and `options` for a story's own values (a tab's `value`) or a prop that isn't the component's (the group's `orientation`).
  - Handlers are `fn<() => void>()` args, so the Actions panel logs them. They stay out of `include`.
  - **State:** list the controlled prop (`value`, `expanded`, and in phase 2 `open`) with the preview's default as its arg, never a `default*` prop, which the component reads only at mount. Default's render, a named function in the file, calls `useArgs` and has the handler log and then call `updateArgs`, so a click and the panel agree.
  - `tests/unit/stories.test.ts` checks it: each listed arg must change Default's server HTML, and no other story may turn Controls on. `tests/unit/stories.json` holds the exemptions, each with its reason.
- **Viewports:** the toolbar offers phone (390×844), tablet (834×1112) and desktop (1280×900). Phone and desktop are the sizes the gates capture at (`scripts/lib/viewports.ts`).
  - A stories file in `tests/ssr/layout.json` adds a phone twin of the story whose layout changes: `<Name>OnPhone`, which spreads the story, names it "<name> on a phone", tags it `!autodocs` (off the docs page) and pins `globals.viewport` to `phone`.
  - The Vitest project runs the twin's axe test at 390px.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Button/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Row } from "../../../stories/blocks/preview-kit.js";
import { Button } from "./Button.js";

const meta = {
	title: "Inputs/Button",
	component: Button,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Button>;

export default meta;

const note = "The glass pill. Verb first, sentence case.";

export const Default: StoryObj<typeof meta> = {
	args: {
		children: "See the work",
		variant: "glass",
		size: "md",
		disabled: false,
		onClick: fn<() => void>(),
	},
	argTypes: { children: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: ["children", "variant", "size", "disabled"],
		},
		docs: { description: { story: note } },
	},
	render: (args) => (
		<Row>
			<Button {...args} />
		</Row>
	),
};
```

A stateful Default bridges the prop through `useArgs` (from `storybook/preview-api`), as Tabs' does:

```tsx
function SiteSectionsWithArgs(args: TabsProps) {
	const [, updateArgs] = useArgs<TabsProps>();
	return (
		<SiteSections
			{...args}
			onChange={(event, value) => {
				args.onChange?.(event, value);
				updateArgs({ value });
			}}
		/>
	);
}

export const Default: Story = {
	args: { value: "work", variant: "underline", onChange: fn<() => void>() },
	argTypes: {
		value: { control: "inline-radio", options: ["work", "projects"] },
	},
	parameters: {
		controls: { disable: false, include: ["value", "variant"] },
	},
	render: SiteSectionsWithArgs,
};
```
