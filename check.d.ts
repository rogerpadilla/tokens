export interface Source {
  readonly path: string;
  readonly text: string;
}
/** A stylesheet's CSS, or a component's `<style>` blocks, comments stripped; a script has none, and only defines tokens. */
export declare function styleOf(path: string, text: string): string;
/** Every custom property a stylesheet declares, with its value. */
export declare function tokensIn(css: string): Map<string, string>;
/** What breaks the rules: a colour, a duration, a radius or a spacing written anywhere but a custom property, a width a media query writes rather than naming a breakpoint, a `var()` naming nothing (the package's own tokens count; `external` prefixes are a framework's). With `colourFiles`, a colour is allowed only in those files. */
export declare function audit(files: readonly Source[], options?: { readonly external?: readonly string[]; readonly colourFiles?: readonly string[] }): string[];
/** Every custom property `files` define that nothing in them reads; `consumed` prefixes (a whole name is one) are those a third party reads. */
export declare function unused(files: readonly Source[], options?: { readonly consumed?: readonly string[] }): string[];
/** The stylesheets, components and scripts under `dir`, for `audit()`; a path starting with one in `skip` is left out. */
export declare function sources(dir: string, options?: { readonly skip?: readonly string[] }): Source[];
/** Every token's value in one mode: Primer's roles, then the site's own declarations in `css` over them, `light-dark()` and `var()` resolved. */
export declare function palette(css: string, mode: 'light' | 'dark'): Map<string, string>;
