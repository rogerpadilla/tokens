import { describe, expect, it } from 'bun:test';

import { contrast } from '../contrast.js';
import { primer } from '../primer.js';

describe('contrast', () => {
  it('spans 1 to 21, in either order', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('reads every form a browser or a stylesheet writes, alpha ignored', () => {
    const white = 21;
    expect(contrast('#fff', '#000')).toBeCloseTo(white);
    expect(contrast('#ffffffcc', '#000')).toBeCloseTo(white);
    expect(contrast('rgb(255, 255, 255)', 'rgba(0, 0, 0, 0.5)')).toBeCloseTo(white);
    expect(contrast('rgb(255 255 255)', '#000')).toBeCloseTo(white);
    expect(contrast('color(srgb 1 1 1)', '#000')).toBeCloseTo(white);
  });

  it('fails on a colour it cannot read, rather than guessing', () => {
    expect(() => contrast('oklch(0.5 0.1 200)', '#000')).toThrow('oklch');
  });
});

const TEXT = ['fgColor-default', 'fgColor-muted'] as const;
const SURFACES = ['bgColor-default', 'bgColor-muted', 'bgColor-inset'] as const;
const ON_FILL = ['bgColor-accent-emphasis', 'bgColor-success-emphasis', 'bgColor-danger-emphasis', 'bgColor-done-emphasis'] as const;
const TONES = ['fgColor-accent', 'fgColor-success', 'fgColor-danger', 'fgColor-done'] as const;

describe.each(['light', 'dark'] as const)('Primer %s', (mode) => {
  it.each(TEXT.flatMap((text) => SURFACES.map((surface) => [text, surface])))('writes %s on %s at 4.5:1', (text, surface) => {
    expect(contrast(primer[text][mode], primer[surface][mode])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(ON_FILL)('labels %s at 4.5:1', (fill) => {
    expect(contrast(primer['fgColor-onEmphasis'][mode], primer[fill][mode])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)('writes %s on the page at 4.5:1', (tone) => {
    expect(contrast(primer[tone][mode], primer['bgColor-default'][mode])).toBeGreaterThanOrEqual(4.5);
  });
});
