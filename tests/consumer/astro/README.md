# Astro consumer

A stand-in for the [portfolio](https://github.com/sebastian-suarez/portfolio) that uses the packed package the way the portfolio will: Astro 7 with static output, React 19 islands through `@astrojs/react`, and Tailwind 4 through `@tailwindcss/vite`. It's a separate project, so the root's XO and tsconfig leave it out.

## How it's checked

`npm run check:package` at the repo root:

1. Runs `npm ci` here. `package-lock.json` pins every dependency except the package itself.
2. Installs the tarball from `.cache/pack` with `npm install --no-save`, since a lockfile can't pin a file whose hash changes with every build.
3. Runs `astro build`, serves `dist/` and loads its pages in the root's Playwright Chromium.
4. Runs the checks in `scripts/lib/astro-consumer.ts`, each in a fresh browser context with JavaScript on or off. Page errors, console errors and failed requests fail a check too.

## What's here

- `src/styles/global.css` loads the package the documented way: the layer order first, then Tailwind, then `@sebastian-suarez/blue-glass/styles.css`. `src/layouts/Base.astro` imports it, as the portfolio's layout does.
- `src/pages/index.astro` (phase 0) holds a heading where Tailwind's `text-2xl font-semibold` must win over `text-heading`, a control with `text-heading` alone, and the `PackageExports` island (`client:visible`). The island renders the entry's export count and marks itself hydrated from an effect.

## Adding pages (phase 1)

- Add a page per scenario in `src/pages/`, using `Base.astro`. For example, `static.astro` renders Paper and Button with no client directive, so they're server HTML only, and `islands.astro` hydrates Tabs and Accordion.
- Astro passes an island's children as static HTML. So compound components (Tabs with Tab and TabPanel, Accordion and its panes) need a wrapper in `src/components/` that builds the whole tree in React, used as `<TabsDemo client:visible />`.
- Give the elements a check reads an `id`. Then add the page's checks to `checks` in `scripts/lib/astro-consumer.ts`: one with JavaScript on (styles, hydration, keyboard) and one with it off (the server HTML shows the content).
- Dependencies go in this folder's `package.json`, and `npm install` here updates `package-lock.json`. The root's stay as they are.

## Working on it by hand

After one `npm run check:package` the tarball stays installed here, so `npx astro dev` works in this folder. Run the check again after changing the package.
