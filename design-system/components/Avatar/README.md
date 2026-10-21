# Avatar

A person or a company as ink initials on one of the site's orbs, the header's glass monogram tile or a photo, alone or overlapped in an `AvatarGroup` that counts the rest as "+N".

**Source:** the circle is the site's orb (`.tab-orb` / `.company-orb`: `linear-gradient(135deg, #f6fbff, #93afcf)` with `inset 0 0 1px #fff` and `0 1px 4px #546b8e25`), with `.orb-1` and `.orb-2` as the other two gradients. The `tile` variant is the header's monogram `.signature` exactly at `md`: 40px, `radius-tile`, `linear-gradient(135deg, #fff9, #fff3)`, a `#fff9` border and `shadow-tile`. Lowercase letters on a tile are set as that monogram (26px weight 500 at −5px tracking, nudged 6px left, like the header's "ss"); capitals are set as initials. The other sizes scale from `md`. Initials on an orb, photos, the fallback chain and the group are additions, matching MUI.

## When to use

- A person, a team or a company next to its name: a byline, a reviewer, an employer strip.
- `circle` for people and companies, `tile` for a monogram or a product mark.
- `AvatarGroup` for "who's involved" when the count matters more than every face.

## What you provide

- `alt`: the name. It's the photo's alt text and the source of the initials, and a lettered avatar is read as that name (`role="img"`). Next to a visible name, leave `alt` off and add `aria-hidden`, or the name is read twice.
- `src` (and `srcSet`, `sizes`) for a photo. While it loads the orb shows through. If it fails, the avatar shows `children`, then the initials from `alt`, then the `user` glyph.
- `children`: your own initials or an icon, when the derived ones aren't right. Lowercase on a tile ("ss") reads as a monogram.
- For a group: `aria-label` on the `AvatarGroup` ("Reviewers"), and avatars as its children.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `circle` · `tile` | `circle` |
| `size` | `xs` (24px) · `sm` (32px) · `md` (40px) · `lg` (56px) | `md` |
| `orb` | `0` (.tab-orb) · `1` (.orb-1) · `2` (.orb-2) | picked from `alt`, stable per name |
| `src`, `srcSet`, `sizes`, `imgProps` | the photo | — |
| `component` | element | `span` |

`AvatarGroup`

| Prop | Values | Default |
| --- | --- | --- |
| `max` | most avatars shown, the "+N" counting as one; never "+1" | `5` |
| `total` | the real count when you pass only some | number of children |
| `size`, `variant` | applied to every avatar (an avatar's own wins) | — |
| `spacing` | `md` (8px overlap at 40px) · `sm` (12px, for photos: it covers initials) | `md` |
| `renderSurplus` | `(n) => node`, e.g. a link to the full list | "+N", read as "N more" |

Each avatar in a group is cut out of the page by a 2px `color-canvas` ring, the first on top and the "+N" over the last. On a glass panel, set `--gl-avatar-ring` to the panel's colour.

## Do and don't

- Do keep initials to one or two letters. The circle sets them at 15px on `md`, ink on the orb (5.1:1 at its darkest edge).
- Do use a real photo or initials. Don't invent portraits, and don't use an avatar as decoration.
- Don't put a status on colour alone: pair a `Badge` dot with a label ("Available").
- Don't make an avatar a button by itself. Wrap it in a `Button` or a link that has a name.
