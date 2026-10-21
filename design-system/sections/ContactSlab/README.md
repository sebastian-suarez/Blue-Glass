# ContactSlab

The closing section: a glass slab with the call to action on one side and the email link, profiles and résumé on the other, then the footer.

**Composed from:** `Paper` (the site's `.contact-slab`), the `text-title-lg` and `text-body-lg` styles, `Link` (`underline="hover"`, `color="ink"`, with `arrow-ne`), and a footer on a `color-line` hairline. Two columns from 900px.

## How to reuse it

- The headline states availability, under 14ch per line. The copy says who, where and when, in at most 46ch.
- The email is the largest link on the page: `clamp(18px, 2.3vw, 28px)` with -0.035em tracking.
