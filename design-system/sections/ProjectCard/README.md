# ProjectCard

The "Own projects" section: a sticky intro column beside a stack of glass cards, each with a diagram, its stack as chips and a "go" link.

**Composed from:** `Card` (the site's `.card.glass-panel`: 40px padding, 26px gap, `shadow-panel-hover` on a fine pointer), `CardHeader`, `Diagram`, and `CardActions` with chips and a `Button variant="text"`. The intro column is sticky from 900px.

## How to reuse it

- Title in `text-card-title` and the blurb in `color-muted`, then the diagram, then the footer.
- Only link a repository that is public. With no repository, omit the link.
