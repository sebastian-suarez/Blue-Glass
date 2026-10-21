import * as React from 'react';
import { cx } from '../internal/cx';

/** Every type token (tokens.json "type"), named without the `text-` prefix. */
export type TypographyVariant =
  | 'display' | 'title-xl' | 'title-lg' | 'title-md' | 'statement'
  | 'heading' | 'card-title' | 'title-sm' | 'subtitle'
  | 'lede' | 'lede-sm' | 'body-lg' | 'body' | 'body-sm' | 'small' | 'caption' | 'micro' | 'nano'
  | 'button' | 'kicker' | 'label' | 'name'
  | 'code'
  | 'diagram-node' | 'diagram-label';

export type TypographyColor =
  | 'inherit' | 'ink' | 'muted' | 'ink-soft' | 'accent' | 'link' | 'blue-deep'
  | 'danger' | 'warning' | 'success' | 'info';

/** The element each variant renders by default. */
const ELEMENTS: Record<TypographyVariant, string> = {
  display: 'h1',
  'title-xl': 'h1',
  'title-lg': 'h2',
  'title-md': 'h2',
  statement: 'p',
  heading: 'h2',
  'card-title': 'h3',
  'title-sm': 'h3',
  subtitle: 'h4',
  lede: 'p',
  'lede-sm': 'p',
  'body-lg': 'p',
  body: 'p',
  'body-sm': 'p',
  small: 'p',
  caption: 'span',
  micro: 'span',
  nano: 'span',
  button: 'span',
  kicker: 'span',
  label: 'span',
  name: 'span',
  code: 'code',
  'diagram-node': 'span',
  'diagram-label': 'span',
};

/** The site's fluid sizes for the display group (global.css: .hero h1, .hiw-intro h1, .contact h2, .project-identity h3, .scrub). */
const FLUID: Partial<Record<TypographyVariant, string>> = {
  display: 'clamp(44px, 5.6vw, 80px)',
  'title-xl': 'clamp(40px, 5vw, 72px)',
  'title-lg': 'clamp(34px, 4.4vw, 60px)',
  'title-md': 'clamp(34px, 3.6vw, 50px)',
  statement: 'clamp(26px, 3vw, 42px)',
};

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export interface TypographyProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  /** The type token to set, without `text-`: display, heading, body, micro, code… Default body. */
  variant?: TypographyVariant;
  /** Render as another element; the variant's look stays. Default from the variant (heading → h2, body → p, micro → span…). */
  component?: React.ElementType;
  /** Text colour token. Default inherit. */
  color?: TypographyColor;
  /** Text alignment. Default inherit. */
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
  /** One line, cut with an ellipsis. */
  noWrap?: boolean;
  /** A bottom margin of half a line (0.5em). The root has no margin otherwise. */
  gutterBottom?: boolean;
  /** Line breaking: balance (default on h1–h6, as the site), pretty (default on p) or plain wrap. */
  textWrap?: 'balance' | 'pretty' | 'wrap';
  /** Use the site's fluid size for the display group, e.g. display = clamp(44px, 5.6vw, 80px). */
  fluid?: boolean;
  children?: React.ReactNode;
}

/** Text set in one of the Blue Glass type tokens, on the element that variant means. */
export const Typography = React.forwardRef<HTMLElement, TypographyProps>(function Typography(
  {
    variant = 'body', component, color = 'inherit', align = 'inherit', noWrap = false, gutterBottom = false,
    textWrap, fluid = false, className, style, children, ...rest
  },
  ref,
) {
  const Component: React.ElementType = component ?? ELEMENTS[variant] ?? 'span';
  const tag = typeof Component === 'string' ? Component : '';
  const wrap = textWrap ?? (HEADINGS.has(tag) ? 'balance' : tag === 'p' ? 'pretty' : undefined);
  const fluidSize = fluid ? FLUID[variant] : undefined;
  return (
    <Component
      ref={ref}
      className={cx(
        'gl-typography',
        `text-${variant}`,
        variant === 'code' && 'gl-typography-code',
        color !== 'inherit' && `gl-typography-${color}`,
        align !== 'inherit' && `gl-typography-align-${align}`,
        noWrap && 'gl-typography-nowrap',
        gutterBottom && 'gl-typography-gutter',
        wrap && !noWrap && `gl-typography-${wrap}`,
        className as string | undefined,
      )}
      style={fluidSize ? { fontSize: fluidSize, ...(style as React.CSSProperties | undefined) } : style}
      {...rest}
    >
      {children}
    </Component>
  );
});
