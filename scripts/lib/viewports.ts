/**
The two viewports every capture and layout check uses. Storybook's toolbar offers the same sizes
(.storybook/preview.tsx), and a story pinned to `phone` runs its axe test at that size.
*/
export const viewports = {
	desktop: { width: 1280, height: 900 },
	phone: { width: 390, height: 844 },
} as const;
