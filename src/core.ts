/**
 * A single icon. Fields match IconifyIcon: the SVG body without the root `<svg>`
 * plus its own viewBox, so the format also fits multicolor icons drawn on other grids.
 */
export interface IconData {
  /** Identifier, e.g. `las-star`. */
  readonly name: string;
  /** Contents of `<svg>`, without the element itself. */
  readonly body: string;
  readonly width: number;
  readonly height: number;
  readonly left?: number;
  readonly top?: number;
  /** Monochrome icons are painted with `currentColor`; multicolor icons keep their own colors. */
  readonly mono: boolean;
}

export interface SvgOptions {
  /** Icon height; width follows the viewBox aspect ratio. Defaults to `1em`. */
  size?: number | string;
  /** Accessible name. Without it the icon is decorative and hidden from screen readers. */
  title?: string;
}

function scale(size: number | string, ratio: number): string {
  if (typeof size === 'number') return String(Math.round(size * ratio * 1000) / 1000);
  const match = /^(\d*\.?\d+)([a-z%]*)$/i.exec(size.trim());
  if (!match) return size;
  return `${Math.round(Number(match[1]) * ratio * 1000) / 1000}${match[2]}`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Attributes of the root `<svg>`. */
export function svgAttrs(icon: IconData, { size = '1em', title }: SvgOptions = {}): Record<string, string> {
  const { width, height, left = 0, top = 0 } = icon;
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `${left} ${top} ${width} ${height}`,
    width: scale(size, width / height),
    height: scale(size, 1),
    ...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true' }),
  };
}

/** Contents of `<svg>`: a `<title>` tooltip when given, then the icon body. */
export function svgInner(icon: IconData, title?: string): string {
  return title ? `<title>${escapeHtml(title)}</title>${icon.body}` : icon.body;
}

/** A ready `<svg>…</svg>` string, for framework-free code. */
export function toSvgString(icon: IconData, options: SvgOptions = {}): string {
  const attrs = Object.entries(svgAttrs(icon, options))
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(' ');
  return `<svg ${attrs}>${svgInner(icon, options.title)}</svg>`;
}
