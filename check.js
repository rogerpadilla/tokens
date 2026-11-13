import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { primer } from './primer.js';

const COMMENT = /\/\*[\s\S]*?\*\//g;
/** A script's line comment, matched only at the start of a line so `https://` survives. */
const LINE_COMMENT = /^[ \t]*\/\/.*$/gm;
/** A print block, one nesting level deep: paper is not a theme, so its literal black is the right answer. */
const PRINT = /@media\s+print\s*\{(?:[^{}]|\{[^{}]*\})*\}/g;
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/gi;
/** A width a media query writes, rather than naming one of breakpoints.css's. */
const WIDTH = /\((?:min-|max-)?width\b[^)]*\)/g;
/** A token set in CSS or a `style` attribute (`--x: ...`), or from a script (`setProperty('--x', ...)`, `{ '--x': ... }`); a quoted CLI flag is neither. */
const DEFINITION = /(--[\w-]+)\s*:|['"](--[\w-]+)['"]\s*:|setProperty\(\s*['"](--[\w-]+)['"]/g;
const PACKAGED = ['primer.css', 'scale.css'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'));
/**
 * The properties scale.css owns, and a number written in one: a time, a radius, a spacing. Zero is
 * no value; spacing allows a hairline nudge of 2px, and `em`, which follows its own text.
 */
const SCALES = [
  { property: /^(?:transition|animation)(?:-duration|-delay)?$/, number: /(?<![\w.-])(\d*\.?\d+)(m?s)\b/g, allows: () => false },
  { property: /^border-(?:[a-z]+-)*radius$/, number: /(?<![\w.-])(\d*\.?\d+)(px|r?em|%)/g, allows: () => false },
  {
    property: /^(?:(?:padding|margin)(?:-[a-z]+)*|(?:row-|column-)?gap)$/,
    number: /(?<![\w.-])(-?\d*\.?\d+)(px|rem)\b/g,
    allows: (amount, unit) => unit === 'px' && Math.abs(amount) <= 2,
  },
];

/** Every number a declaration writes where scale.css has a token for it. */
function offScale(css) {
  return [...css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)].flatMap(([, property, value]) => {
    const scale = SCALES.find((candidate) => candidate.property.test(property));
    if (!scale) return [];
    return [...value.matchAll(scale.number)]
      .filter(([, amount, unit]) => Number(amount) !== 0 && !scale.allows(Number(amount), unit))
      .map(([literal]) => `${property} ${literal}`);
  });
}

/** A stylesheet's CSS, or a component's `<style>` blocks, comments stripped; a script has none, and only defines tokens. */
export function styleOf(path, text) {
  const css = path.endsWith('.css') ? text : [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(([, block]) => block).join('\n');
  return css.replace(COMMENT, '');
}

/** Every custom property a stylesheet declares, with its value. */
export function tokensIn(css) {
  return new Map([...css.replace(COMMENT, '').matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
}

/**
 * What breaks the rules: a colour, a duration, a radius or a spacing written anywhere but a custom
 * property, a width a media query writes rather than naming a breakpoint, a `var()` naming nothing anywhere in `files`. With `colourFiles`, a colour is allowed only
 * in those files, a token elsewhere included.
 */
export function audit(files, { external = [], colourFiles } = {}) {
  const styles = files.map(({ path, text }) => ({ path, css: styleOf(path, text).replace(PRINT, '') }));
  const defined = new Set([...files.map(({ text }) => text), ...PACKAGED].flatMap((text) => [...text.matchAll(DEFINITION)].map((match) => match[1] ?? match[2] ?? match[3])));
  return styles.flatMap(({ path, css }) => {
    const outsideTokens = css.replace(/--[\w-]+\s*:[^;}]+/g, '');
    const colours = colourFiles
      ? colourFiles.some((file) => path === file || path.endsWith(`/${file}`))
        ? []
        : [...css.matchAll(COLOUR)].map(([match]) => `${path}: ${match} outside a colour file`)
      : [...outsideTokens.matchAll(COLOUR)].map(([match]) => `${path}: ${match} outside a token`);
    const literals = [...colours, ...offScale(outsideTokens).map((literal) => `${path}: ${literal} outside a token`)];
    const unknown = [...css.matchAll(/var\(\s*(--[\w-]+)/g)]
      .map(([, name]) => name)
      .filter((name) => !defined.has(name) && !external.some((prefix) => name.startsWith(prefix)))
      .map((name) => `${path}: ${name} is defined nowhere`);
    const widths = [...css.matchAll(/@media([^{]*)\{/g)].flatMap(([, query]) => [...query.matchAll(WIDTH)].map(([width]) => `${path}: ${width} outside a breakpoint`));
    return [...literals, ...widths, ...unknown];
  });
}

/** Every custom property `files` define that nothing in them reads, by `var()` or by name as a mixin's argument; `consumed` prefixes are those a third party reads. */
export function unused(files, { consumed = [] } = {}) {
  const texts = files.map(({ text }) => text.replace(COMMENT, '').replace(LINE_COMMENT, ''));
  const defined = new Set(texts.flatMap((text) => [...text.matchAll(DEFINITION)].map((match) => match[1] ?? match[2] ?? match[3])));
  const read = new Set(
    texts.flatMap((text) => [
      ...[...text.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name),
      ...[...text.matchAll(/@mixin\s+[\w-]+\s+([^;{]+)/g)].flatMap(([, args]) => args.match(/--[\w-]+/g) ?? []),
    ]),
  );
  return [...defined].filter((name) => !read.has(name) && !consumed.some((prefix) => name.startsWith(prefix))).sort();
}

/** The stylesheets, components and scripts under `dir`, for `audit()`; a path starting with one in `skip` is left out. */
export function sources(dir, { skip = [] } = {}) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .map((entry) => ({ entry, path: join(entry.parentPath, entry.name) }))
    .filter(({ entry, path }) => entry.isFile() && /\.(css|astro|vue|svelte|tsx?)$/.test(path) && !path.includes('node_modules') && !skip.some((prefix) => path.startsWith(prefix)))
    .map(({ path }) => ({ path, text: readFileSync(path, 'utf8') }));
}

/** Every token's value in one mode: Primer's roles, then the site's own declarations in `css` over them, `light-dark()` and `var()` resolved. */
export function palette(css, mode) {
  const declared = new Map([...Object.entries(primer).map(([role, values]) => [`--${role}`, values[mode]]), ...tokensIn(css)]);
  const valueOf = (value) => {
    const pair = value.match(/^light-dark\((.*)\)$/s)?.[1];
    if (pair) {
      const sides = splitTopLevel(pair);
      return valueOf(mode === 'light' ? sides[0] : sides[1]);
    }
    const name = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
    return name && declared.has(name) ? valueOf(declared.get(name)) : value;
  };
  return new Map([...declared].map(([name, value]) => [name, valueOf(value)]));
}

function splitTopLevel(list) {
  let depth = 0;
  for (let at = 0; at < list.length; at++) {
    if (list[at] === '(') depth++;
    else if (list[at] === ')') depth--;
    else if (list[at] === ',' && depth === 0) return [list.slice(0, at).trim(), list.slice(at + 1).trim()];
  }
  return [list, list];
}
