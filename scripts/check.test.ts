import { describe, expect, it } from 'bun:test';

import { audit, palette, sources, styleOf, tokensIn } from '../check.js';

describe('audit', () => {
  it('allows a colour only where a token is declared', () => {
    const text = ':root { --brand: #5c2e1e; --scrim: rgba(0, 0, 0, 0.5); }\n.a { color: var(--brand); }';
    expect(audit([{ path: 'a.css', text }])).toEqual([]);
  });

  it('reports a colour written in a property, and a var() naming nothing', () => {
    const text = '.a { color: #fff; background: var(--nowhere); }';
    expect(audit([{ path: 'a.css', text }])).toEqual(['a.css: #fff outside a token', 'a.css: --nowhere is defined nowhere']);
  });

  it("counts the package's own tokens and a framework's prefixes as defined", () => {
    const text = '.a { color: var(--fgColor-muted); margin: var(--space-md); padding: var(--sl-nav-pad-x); }';
    expect(audit([{ path: 'a.css', text }], { external: ['--sl-'] })).toEqual([]);
  });

  it('reads tokens across files, as a site declares them in one and reads them in another', () => {
    expect(audit([{ path: 'tokens.css', text: ':root { --wa: #128c4a; }' }, { path: 'b.css', text: '.b { color: var(--wa); }' }])).toEqual([]);
  });
});

describe('audit, on a token a script or the markup sets', () => {
  it('counts a style attribute, setProperty and an object key as a definition', () => {
    const files = [
      { path: 'A.astro', text: '<div style="--lines: 3"></div><style>.a { height: calc(var(--lines) * var(--row)); color: var(--tint); }</style>' },
      { path: 'a.ts', text: "el.style.setProperty('--row', '1rem'); const vars = { '--tint': '#fff' };" },
    ];
    expect(audit(files)).toEqual([]);
  });
});

describe('styleOf', () => {
  it("reads only a component's <style>, and drops comments", () => {
    const text = '---\nconst color = "#fff";\n---\n<meta content="#000"><style>\n/* #abc */ .a { color: red; }\n</style>';
    expect(styleOf('A.astro', text).trim()).toBe('.a { color: red; }');
  });
});

describe('tokensIn', () => {
  it('maps each declared token to its value', () => {
    expect(tokensIn(':root { --a: #fff; --b: var(--a) }')).toEqual(new Map([['--a', '#fff'], ['--b', 'var(--a)']]));
  });
});

describe('palette', () => {
  const css = ':root { --bgColor-default: light-dark(#eeeeee, #121316); --brand: #5c2e1e; --edge: var(--fgColor-muted); --ring: var(--brand); }';

  it("is Primer's roles in one mode, with the site's own declarations over them", () => {
    const light = palette(css, 'light');
    expect(light.get('--bgColor-default')).toBe('#eeeeee');
    expect(light.get('--fgColor-default')).toBe('#1f2328');
    expect(light.get('--brand')).toBe('#5c2e1e');
    expect(palette(css, 'dark').get('--bgColor-default')).toBe('#121316');
  });

  it('follows a var() to the value it names, in the package or the site', () => {
    expect(palette(css, 'light').get('--edge')).toBe('#59636e');
    expect(palette(css, 'dark').get('--edge')).toBe('#9198a1');
    expect(palette(css, 'light').get('--ring')).toBe('#5c2e1e');
  });
});

describe('sources', () => {
  it('reads the stylesheets, components and scripts under a directory, past what it skips', () => {
    const paths = sources('scripts', { skip: ['scripts/build'] }).map(({ path }) => path);
    expect(paths).toContain('scripts/check.test.ts');
    expect(paths.some((path) => path.startsWith('scripts/build'))).toBe(false);
  });
});
