# tokens

The design tokens every site of mine reads: uql-orm.dev, variability, rogerpadilla.com, cacaua and variabilidad.

- `primer.css`: GitHub Primer's colour roles, by Primer's own names (`--bgColor-default`, `--fgColor-muted`, `--borderColor-default`, ...), each a `light-dark()` pair. Generated from [`@primer/primitives`](https://github.com/primer/primitives) by `scripts/build.ts`, never edited by hand; [primer.style](https://primer.style/product/primitives/color) documents what each role is for. Beside them, the hovers Primer leaves to a site, derived from the roles: a fill and a tint hover for each of accent, danger, success and attention (`--bgColor-danger-emphasis-hover`, `--bgColor-danger-muted-hover`, ...), and `--fgColor-accent-hover` for a link.
- `primer.js`: the same roles resolved, `primer['bgColor-default'].dark`, for what cannot read CSS: an email, a social card, a `theme-color` meta tag.
- `scale.css`: one motion scale (`--ease-*`, `--duration-*`, near zero under `prefers-reduced-motion`), one type ladder (`--text-*`), one radius scale (`--radius-*`) and one spacing scale (`--space-*`). `scale.js` gives scripts the durations in milliseconds (`duration.fast`), for a JS transition that takes a number.
- `contrast.js`: WCAG contrast between two colours, hex or a browser's computed value, for a site's own palette tests. The tests here hold Primer's text and labels to 4.5:1 with it.
- `check.js`: `audit(files)`, the rules below as one test a site runs over its stylesheets (`colourFiles` narrows where a colour may be written to the site's token files), `unused(files)`, every token defined that nothing reads, `sources(dir)` to read them, and `palette(css, mode)`, every token's value in one mode (Primer's, under the site's own), for its contrast tests.

## Use

```sh
bun add github:rogerpadilla/tokens#v1.8.0
```

```css
@import 'tokens/primer.css';
@import 'tokens/scale.css';
```

```ts
import { contrast } from 'tokens/contrast.js';
import { primer } from 'tokens/primer.js';
```

`light-dark()` picks its side from `color-scheme`, which this package leaves to the site: set `color-scheme: light dark` to follow the OS, or `light`/`dark` to pin one, from whatever attribute the site's theme toggle writes. A light-only site sets `color-scheme: light` and gets Primer's light values.

## Rules

- Read a role or a scale step; never write a colour, a duration, a radius or a spacing value in a component.
- A brand restates a role, by its name, in the site's token file. A colour no role stands for is a token of the site's own, named as Primer names one: what it belongs to, then the property, then the state (`--media-borderColor-hover`), or `--brand-<name>` for a brand colour several things read.
- What cannot read CSS (an email, a social card, a `theme-color` tag) reads `primer.js`.
- A site that restates roles tests them with `contrast()`: 4.5:1 for text, 3:1 for an icon or a field's edge.
- Each site runs `audit()` over its stylesheets, so a colour, a duration, a radius or a spacing written outside a token, or a `var()` naming nothing, fails a test rather than a review. Print is left alone (paper is not a theme), zero is no value, spacing allows a hairline nudge of up to 2px and an `em` that follows its own text, a value off the scale on purpose is declared as a site token, which also names why:

```ts
import { audit, palette, sources, unused } from 'tokens/check.js';
import { contrast } from 'tokens/contrast.js';

expect(audit(sources('src'), { external: ['--sl-'] })).toEqual([]);
expect(unused(sources('src'))).toEqual([]);
const light = palette(readFileSync('src/styles/tokens.css', 'utf8'), 'light');
expect(contrast(light.get('--fgColor-muted') ?? '', light.get('--bgColor-default') ?? '')).toBeGreaterThanOrEqual(4.5);
```

## Layout

GitHub's own surfaces, the same in both modes:

- the page is `bgColor-default`, and code is painted on it too, edged by its border;
- the header and sidebar are `bgColor-inset`, darker than the page in both modes;
- a card is `bgColor-default` with a `borderColor-default` border, a control `control-bgColor-rest`.

## A brand palette

A site with a brand of its own restates the roles it changes, by the same names, after the import, and inherits the rest (status colours, focus, overlays) from Primer:

```css
@import 'tokens/primer.css';

:root {
  --bgColor-default: #ffffff;
  --fgColor-accent: #5c2e1e;
}
```

A brand value must still clear WCAG AA against the surface it is read on; Primer's own pairs already do.

## Release

`bun run check` fails if a generated file is stale, then typechecks and runs the tests. A Primer upgrade is a bump of the pinned `@primer/primitives`, `bun run build`, and a new tag; the sites move by bumping the `#vX.Y.Z` they install.
