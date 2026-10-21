/**
 * Layout system shared by Box, Stack, Grid, ImageList and Masonry (private to
 * the surfaces-layout slice): spacing tokens by name and the site's breakpoints.
 * Public types live in Box.tsx (SpaceToken, SpaceValue) and Grid.tsx
 * (LayoutBreakpoint, ResponsiveValue) so the generated index.d.ts declares them once.
 */
import type { SpaceToken, SpaceValue } from './Box';
import type { LayoutBreakpoint, ResponsiveValue } from './Grid';

export const SPACE_TOKENS: SpaceToken[] = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'section-sm', 'section'];

/** Token name -> CSS value: "lg" -> "var(--space-lg)", 0 -> "0px", "auto" -> "auto". */
export function space(value: SpaceValue | 'auto' | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === 0 || (value as unknown) === '0') return '0px';
  if (value === 'auto') return 'auto';
  return `var(--space-${value})`;
}

/** The site's breakpoints as min-width queries: the inverse of global.css's max-width ones. */
export const BREAKPOINTS: LayoutBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export function isResponsiveObject<T>(value: ResponsiveValue<T> | undefined): value is Partial<Record<LayoutBreakpoint, T>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One class per breakpoint that has an allowed value: prefix-xs-6, prefix-md-4… */
export function responsiveClasses<T extends string | number>(
  prefix: string,
  value: ResponsiveValue<T> | undefined,
  allowed: (v: T) => boolean,
): string[] {
  if (value === undefined || value === null) return [];
  const out: string[] = [];
  if (isResponsiveObject(value)) {
    for (const bp of BREAKPOINTS) {
      const v = value[bp];
      if (v !== undefined && v !== null && allowed(v)) out.push(`${prefix}-${bp}-${v}`);
    }
  } else if (allowed(value as T)) {
    out.push(`${prefix}-xs-${value}`);
  }
  return out;
}

/** Is `n` an integer in [min, max]? */
export function intIn(n: unknown, min: number, max: number): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}

/** Is `v` a spacing token name or 0? */
export function isSpace(v: unknown): v is SpaceValue {
  return v === 0 || SPACE_TOKENS.includes(v as SpaceToken);
}
