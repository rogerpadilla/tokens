import { readFileSync } from 'node:fs';

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/gi;
/** A token set in CSS or a `style` attribute (`--x: ...`), or from a script (`setProperty('--x', ...)`, `{ '--x': ... }`). */
const DEFINITION = /(--[\w-]+)\s*:|['"](--[\w-]+)['"]\s*[:,]/g;
const PACKAGED = ['primer.css', 'scale.css'].map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'));

/** A stylesheet's CSS, or a component's `<style>` blocks, comments stripped; a script has none, and only defines tokens. */
export function styleOf(path, text) {
  const css = path.endsWith('.css') ? text : [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(([, block]) => block).join('\n');
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Every custom property a stylesheet declares, with its value. */
export function tokensIn(css) {
  return new Map([...css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
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
