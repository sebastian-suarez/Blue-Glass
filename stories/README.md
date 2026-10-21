# Stories

Storybook documents the package. `npm run storybook` serves it, `npm run build-storybook` builds it, and `npx vitest run --project storybook` renders every story in Chromium and fails any with an axe violation.

## A component's stories

- **File:** a phase that ports `<Name>` adds `src/components/<Name>/<Name>.stories.tsx`.
- **Title:** `"<Group>/<Name>"`, with the group from the `@dsCard group="…"` comment that opens `design-system/components/<Name>/preview.html`.
- **Docs page:** set `component`, and pass the README to `componentDocs` from `blocks/component-docs.tsx`. The page shows the README, the stories, then the props table.
- **Stories:** one per section of the preview, in its order. A story's `name` is the section's title and its `parameters.docs.description.story` the section's note, word for word; it renders the section's content with the same props and copy.
- **Layout:** the decorator in `.storybook/frame.tsx` draws the preview's frame and section grid. The preview's other helpers are in `blocks/preview-kit.tsx`: `Stack`, `Row`, `Tiles`, `Labelled`, `Caption` and `Stage`. A component a preview defines for its example, like Button's contact block, becomes a function in the stories file.
- **Frame:** `parameters.frame` is `{ field: false }` for LightField's stories and `false` for the site's sections, which bring their own page. Phase 1 puts `<LightField variant="compact" />` in `.storybook/frame-field.tsx`.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
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
	parameters: { docs: { description: { story: note } } },
	render: () => (
		<Row>
			<Button>See the work</Button>
		</Row>
	),
};
```
