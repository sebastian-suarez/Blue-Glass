#!/usr/bin/env node
/**
 * design-system/tokens/tokens.json → src/styles/tokens.css
 *
 * A copy of design-system/tools/build-tokens.mjs with two changes: paths are arguments, and
 * the type classes sit in @layer gl-base. Unlayered, they'd beat every layered rule, so a
 * consumer's Tailwind utility could never override them. Custom properties stay unlayered.
 * tests/unit/tokens.test.ts checks the output still matches the reference apart from that.
 * It keeps the original's style (XO and Prettier skip it) so changes there carry over.
 *
 * Mirrors the Design System type's compile contract, so the CSS here matches what the
 * Blue Glass artifact page generates:
 *   :root, [data-theme="<first>"] { colours + shadows }
 *   [data-theme="<id>"]           { per further theme: overrides + aliases re-declared }
 *   :root                         { spacing, radius, every other family, --font-<key> }
 *   @layer gl-base { .<style> }   { one class per type style }
 *   @font-face                    { one per type.fonts entry }
 *
 * Invalid entries are dropped with a warning, the same way the page drops them.
 * Usage: node scripts/build-tokens.mjs [--strict] [--input <tokens.json>] [--output <tokens.css>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argument = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? fallback : resolve(process.argv[at + 1]);
};
const input = argument('--input', resolve(root, 'design-system/tokens/tokens.json'));
const output = argument('--output', resolve(root, 'src/styles/tokens.css'));
const tokens = JSON.parse(readFileSync(input, 'utf8'));

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const COLOR_FN = /^(rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)$/i;
const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const ALIAS = /^\{([^{}]+)\}$/;
const LENGTH = /^-?(\d+(\.\d+)?|\.\d+)(px|rem|em|%)$|^0$/;
const PLAIN = /^[A-Za-z0-9 #%(),./+_-]{1,200}$/;
const SKIP = new Set(['name', 'version', 'meta', 'color', 'type', 'shadow']);

const warnings = [];
const warn = (msg) => warnings.push(msg);
const clean = (n) => String(n).replace(/^(--|\.)/, '');
const prop = (n) => `--${clean(n).replace(/\./g, '\\.')}`;
const cls = (n) => `.${clean(n).replace(/\./g, '\\.')}`;
const balanced = (s) => [...s].reduce((d, c) => (d < 0 ? d : d + (c === '(' ? 1 : c === ')' ? -1 : 0)), 0) === 0;

const themes = tokens.color?.themes?.length ? tokens.color.themes : [{ id: 'light', name: 'Light' }];
const first = themes[0].id;
const colorTokens = tokens.color?.tokens ?? [];
const colorNames = new Set(colorTokens.map((t) => clean(t.name)));

/** A token's raw value in one theme; a missing theme inherits the first theme's. */
function rawIn(t, theme) {
  if (typeof t.value !== 'object' || t.value === null) return theme === first ? t.value : undefined;
  return t.value[theme] ?? (theme === first ? Object.values(t.value)[0] : undefined);
}

/** Validate a colour; follow aliases to catch missing targets and cycles. */
function colorValue(name, value, theme, seen = new Set()) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  const a = ALIAS.exec(v);
  if (a) {
    const target = clean(a[1]);
    if (!colorNames.has(target) || seen.has(target) || seen.size > 16) return null;
    const t = colorTokens.find((x) => clean(x.name) === target);
    seen.add(name);
    return colorValue(target, rawIn(t, theme) ?? rawIn(t, first), theme, seen) ? `var(${prop(target)})` : null;
  }
  if (HEX.test(v)) return v.toLowerCase();
  if (COLOR_FN.test(v)) return v;
  return null;
}

function shadowValue(value) {
  if (typeof value !== 'string' || value.length > 400 || /var\(|url\(/i.test(value)) return null;
  return balanced(value) ? value.trim() : null;
}

const used = new Set();
function claim(name, family) {
  const n = clean(name);
  if (!NAME.test(n)) return warn(`${family}: dropped "${name}" (invalid name)`), false;
  if (used.has(n)) return warn(`${family}: dropped duplicate "${name}"`), false;
  used.add(n);
  return true;
}

// ── Themed families: colour + shadow ────────────────────────────────────────────
const themed = [];
for (const t of colorTokens) if (claim(t.name, 'color')) themed.push({ ...t, kind: 'color' });
for (const t of tokens.shadow?.tokens ?? []) if (claim(t.name, 'shadow')) themed.push({ ...t, kind: 'shadow' });

const blocks = [];
themes.forEach((theme, i) => {
  const decls = [];
  for (const t of themed) {
    const raw = rawIn(t, theme.id);
    const isAlias = typeof raw === 'string' && ALIAS.test(raw.trim());
    const own = typeof t.value === 'object' && t.value !== null && t.value[theme.id] !== undefined;
    if (i > 0 && !own && !isAlias) continue; // later themes: overrides and aliases only
    const value = t.kind === 'color' ? colorValue(clean(t.name), raw, theme.id) : shadowValue(raw);
    if (value == null) {
      if (i === 0) warn(`${t.kind}: dropped "${t.name}" (unreadable value ${JSON.stringify(raw)})`);
      continue;
    }
    decls.push(`  ${prop(t.name)}: ${value};`);
  }
  const selector = i === 0 ? `:root, [data-theme="${theme.id}"]` : `[data-theme="${theme.id}"]`;
  if (decls.length) blocks.push(`${selector} {\n${decls.join('\n')}\n}`);
});

// ── Unthemed families: spacing, radius, then every other {tokens:[…]} family ──
const plain = [];
const families = ['spacing', 'radius', ...Object.keys(tokens).filter((k) => !SKIP.has(k) && k !== 'spacing' && k !== 'radius')];
for (const family of families) {
  const list = tokens[family]?.tokens;
  if (!Array.isArray(list)) continue;
  for (const t of list) {
    if (!claim(t.name, family)) continue;
    const v = typeof t.value === 'number' ? String(t.value) : String(t.value ?? '').trim();
    const ok =
      family === 'spacing' || family === 'radius'
        ? LENGTH.test(v) || /^-?\d+(\.\d+)?$/.test(v)
        : PLAIN.test(v) && balanced(v) && !/url\(|var\(/i.test(v);
    if (!ok) {
      warn(`${family}: dropped "${t.name}" (unreadable value ${JSON.stringify(t.value)})`);
      continue;
    }
    const out = (family === 'spacing' || family === 'radius') && /^-?\d+(\.\d+)?$/.test(v) && v !== '0' ? `${v}px` : v;
    plain.push(`  ${prop(t.name)}: ${out};`);
  }
}
for (const [key, stack] of Object.entries(tokens.type?.families ?? {})) {
  if (typeof stack !== 'string' || stack.length > 200 || /[;{}<>\\()]/.test(stack)) {
    warn(`type.families: dropped "${key}"`);
    continue;
  }
  plain.push(`  --font-${key.toLowerCase()}: ${stack};`);
}
if (plain.length) blocks.push(`:root {\n${plain.join('\n')}\n}`);

// ── Type styles → classes, in @layer gl-base ─────────────────────────────────────
const styleNames = new Set();
const typeBlocks = [];
const px = (v) => (typeof v === 'number' ? `${v}px` : String(v));
for (const group of tokens.type?.groups ?? []) {
  for (const s of group.styles ?? []) {
    const n = clean(s.name);
    if (!NAME.test(n) || styleNames.has(n)) {
      warn(`type: dropped style "${s.name}"`);
      continue;
    }
    const size = px(s.fontSize);
    if (!LENGTH.test(size)) {
      warn(`type: dropped style "${s.name}" (fontSize ${s.fontSize})`);
      continue;
    }
    styleNames.add(n);
    const family = (s.family ?? group.family ?? 'sans').toLowerCase();
    const d = [`  font-family: var(--font-${family});`, `  font-size: ${size};`];
    if (s.lineHeight != null) d.push(`  line-height: ${typeof s.lineHeight === 'number' && s.lineHeight < 10 ? s.lineHeight : px(s.lineHeight)};`);
    if (s.fontWeight != null) {
      const w = s.fontWeight === 'normal' ? 400 : s.fontWeight === 'bold' ? 700 : String(s.fontWeight).split(' ')[0];
      d.push(`  font-weight: ${w};`);
    }
    if (s.letterSpacing != null) d.push(`  letter-spacing: ${px(s.letterSpacing)};`);
    if (s.fontStyle) d.push(`  font-style: ${s.fontStyle};`);
    if (s.opticalSize != null) d.push(`  font-variation-settings: 'opsz' ${Number(s.opticalSize)};`);
    typeBlocks.push(`${cls(n)} {\n${d.join('\n')}\n}`);
  }
}
if (typeBlocks.length) {
  const indented = typeBlocks.join('\n\n').replace(/^(?=.)/gm, '  ');
  blocks.push(`@layer gl-fallback, gl-base, gl-components;\n\n@layer gl-base {\n${indented}\n}`);
}

// ── Fonts ───────────────────────────────────────────────────────────────────────
for (const f of tokens.type?.fonts ?? []) {
  if (!f.family || !f.file) continue;
  const file = f.file.includes('/') ? f.file : `fonts/${f.file}`;
  const format = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[file.split('.').pop()] ?? 'woff2';
  blocks.push(
    `@font-face {\n  font-family: "${f.family}";\n  src: url("../../${file}") format("${format}");\n` +
      `  font-weight: ${f.weight ?? '400'};\n  font-style: ${f.style ?? 'normal'};\n  font-display: swap;\n}`,
  );
}

const header = `/* ${tokens.name ?? 'Tokens'} — generated from design-system/tokens/tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */`;
writeFileSync(output, `${header}\n\n${blocks.join('\n\n')}\n`);
console.log(`tokens.css: ${themed.length} themed, ${plain.length} plain, ${styleNames.size} type styles → ${output}`);
for (const w of warnings) console.warn(`warn: ${w}`);
if (warnings.length && process.argv.includes('--strict')) process.exit(1);
