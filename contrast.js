/** WCAG 2 contrast (https://www.w3.org/TR/WCAG21/#contrast-minimum), from hex or a browser's computed colour. */
export function contrast(one, other) {
  const [a, b] = [luminance(one), luminance(other)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function luminance(colour) {
  const [r, g, b] = channels(colour).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** sRGB channels 0-1. A colour resolved through `color-mix()` or `light-dark()` computes to `color(srgb r g b)`. */
function channels(colour) {
  const hex = colour.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    const full = hex.length < 6 ? [...hex.slice(0, 3)].map((digit) => digit + digit).join('') : hex.slice(0, 6);
    return [0, 2, 4].map((at) => Number.parseInt(full.slice(at, at + 2), 16) / 255);
  }
  const rgb = colour.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) {
    return rgb.slice(1, 4).map((value) => Number(value) / 255);
  }
  const srgb = colour.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgb) {
    return srgb.slice(1, 4).map(Number);
  }
  throw new Error(`Cannot read the colour ${colour}`);
}
