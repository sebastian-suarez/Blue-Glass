# ClientWork

The client-work folio: a side selector of projects beside a glass stage that crossfades between them, each with its outcome and a figure that proves it.

**Composed from:** `Tabs variant="side"` (the site's `.project-selector` and `.project-tab` with orbs and the check mark), `TabPanel` (the 280ms `ease-folio` crossfade), `Paper`, `TimingChart` and `Diagram` with the site's datasets. Under 700px the selector becomes a row of tabs.

## How to reuse it

- Each panel has the company with its orb, then a `text-title-md` headline that names the result, then role and dates, a summary, then an "Outcome" line and the stack in `text-nano`.
- One figure per panel, built only from facts in the CV.
