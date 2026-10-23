# tokens

The design tokens every site of mine reads: uql-orm.dev, variability, rogerpadilla.com, cacaua and variabilidad.

- `primer.css`: GitHub Primer's colour roles, by Primer's own names (`--bgColor-default`, `--fgColor-muted`, `--borderColor-default`, ...), each a `light-dark()` pair. Generated from [`@primer/primitives`](https://github.com/primer/primitives) by `scripts/build.ts`, never edited by hand; [primer.style](https://primer.style/product/primitives/color) documents what each role is for. Beside them, the three hovers Primer leaves to a site, derived from the roles (`--bgColor-accent-emphasis-hover`, `--bgColor-accent-muted-hover`, `--fgColor-accent-hover`).
- `primer.js`: the same roles resolved, `primer['bgColor-default'].dark`, for what cannot read CSS: an email, a social card, a `theme-color` meta tag.
- `scale.css`: one motion scale (`--ease-*`, `--duration-*`, near zero under `prefers-reduced-motion`), one radius scale (`--radius-*`) and one spacing scale (`--space-*`).
- `contrast.js`: WCAG contrast between two colours, hex or a browser's computed value, for a site's own palette tests. The tests here hold Primer's text and labels to 4.5:1 with it.

## Use

```sh
bun add github:rogerpadilla/tokens#v1.2.0
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
