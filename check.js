import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { primer } from './primer.js';

const COMMENT = /\/\*[\s\S]*?\*\//g;
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/gi;
/** A token set in CSS or a `style` attribute (`--x: ...`), or from a script (`setProperty('--x', ...)`, `{ '--x': ... }`). */
const DEFINITION = /(--[\w-]+)\s*:|['"](--[\w-]+)['"]\s*[:,]/g;
const PACKAGED = ['primer.css', 'scale.css'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'));

/** A stylesheet's CSS, or a component's `<style>` blocks, comments stripped; a script has none, and only defines tokens. */
export function styleOf(path, text) {
  const css = path.endsWith('.css') ? text : [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(([, block]) => block).join('\n');
  return css.replace(COMMENT, '');
}

/** Every custom property a stylesheet declares, with its value. */
export function tokensIn(css) {
  return new Map([...css.replace(COMMENT, '').matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
}

/** What breaks the rules: a colour written anywhere but a custom property, a `var()` naming nothing anywhere in `files`. */
export function audit(files, { external = [] } = {}) {
  const styles = files.map(({ path, text }) => ({ path, css: styleOf(path, text) }));
  const defined = new Set([...files.map(({ text }) => text), ...PACKAGED].flatMap((text) => [...text.matchAll(DEFINITION)].map((match) => match[1] ?? match[2])));
  return styles.flatMap(({ path, css }) => {
    const outsideTokens = css.replace(/--[\w-]+\s*:[^;}]+/g, '');
    const literals = [...outsideTokens.matchAll(COLOUR)].map(([match]) => `${path}: ${match} outside a token`);
    const unknown = [...css.matchAll(/var\(\s*(--[\w-]+)/g)]
      .map(([, name]) => name)
      .filter((name) => !defined.has(name) && !external.some((prefix) => name.startsWith(prefix)))
      .map((name) => `${path}: ${name} is defined nowhere`);
    return [...literals, ...unknown];
  });
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
