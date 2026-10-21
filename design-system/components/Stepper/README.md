# Stepper

Where a process is: numbered 28px marks joined by a line, done steps checked in ink, the current step ringed, and on phones a compact MobileStepper.

**Source:** An addition, matching MUI's Stepper, Step, StepLabel, StepContent and MobileStepper. The marks use the site's colours: done is the primary button's ink fill with an `on-ink` check (`.btn-primary`), current an ink ring on `glass-raised`, upcoming a `dg-edge` ring (the diagram edge, 3:1) with a `color-muted` number, error a `danger` ring with the `error` glyph on `danger-soft`. Connectors are `color-line` hairlines that turn `color-ink` once the step before is done. StepContent opens with Collapse, the site's grid-rows reveal (`.pane .more`). MobileStepper's pinned bar is the glass pill; its progress fill is `color-blue`.

## When to use

- Horizontal for three to five short steps a person moves through in order: a deploy, a checkout, a setup.
- Vertical when each step carries detail or actions, or on narrow screens.
- `alternativeLabel` when labels are long or carry captions.
- `nonLinear` when steps can be done in any order; each label becomes a button.
- MobileStepper for one step per screen on a phone: back, the position, next.
- On phones (700px and below) a plain horizontal Stepper keeps every mark but shows only the current or failed step's label; the rest stay readable to screen readers. Use vertical or `alternativeLabel` when every label must show.

## What you provide

- `activeStep` (0-based). In a linear stepper the steps before it are done; `Step completed` overrides that.
- `Step` children, each with a `StepLabel` (the label, plus `optional` for a caption such as "Optional" or a date, `error` when it failed) and, in vertical steppers, a `StepContent` with the detail and the step's buttons.
- `onChange(event, step)` with `nonLinear`.
- `aria-label` on the Stepper naming the process.
- For MobileStepper: `steps`, `activeStep`, and `backButton` / `nextButton` (glass Buttons with chevron icons, disabled at the ends).

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `orientation` | `horizontal` · `vertical` | `horizontal` |
| `activeStep` | number, 0-based | `0` |
| `alternativeLabel` | boolean: labels under the marks | `false` |
| `nonLinear` | boolean: labels are buttons | `false` |
| Step `completed` · `active` · `disabled` · `expanded` | boolean | from `activeStep` |
| StepLabel `optional` · `error` · `icon` | caption node · boolean · mark content | none |
| StepContent `transitionDuration` | ms or `{ enter, exit }` | 450 / 300 |
| MobileStepper `variant` | `dots` · `progress` · `text` | `dots` |
| MobileStepper `position` | `static` · `bottom` · `top` (glass bar, `z-mobile-stepper`) | `static` |
| MobileStepper `getStepText` | `(step, steps) => string` | "Step 2 of 5" |

## Keyboard

- A linear Stepper isn't interactive; the active step carries `aria-current="step"` and done or failed steps say so to screen readers.
- `nonLinear`: each label is a button in the tab order; Enter or Space opens that step.
- MobileStepper: its back and next buttons are ordinary buttons. The step text is announced politely on every change.

## Do and don't

- Do keep labels to two or three words; put the rest in `optional` or StepContent.
- Do say why a step failed in its caption ("Terraform plan failed"), never colour alone.
- Don't use a horizontal Stepper on a phone; use vertical or MobileStepper.
- Don't use it for navigation between unrelated pages; that's Tabs or BottomNavigation.
