// SVG → IconData: svgo, currentColor for monochrome icons, body without the root <svg>.
import { optimize } from 'svgo';

const PAINTABLE = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'use']);
const BLACK = /^(#000|#000000|black|rgb\(0,\s*0,\s*0\))$/i;

// A monochrome icon takes the text color: a missing or black fill becomes currentColor.
// Any other color is an error: the icon is not actually monochrome.
function currentColorPlugin(errors) {
  return {
    name: 'currentColor',
    fn: () => ({
      element: {
        enter(node, parent) {
          for (const attr of ['fill', 'stroke']) {
            const value = node.attributes[attr];
            if (value === undefined || value === 'none' || value === 'currentColor') continue;
            if (BLACK.test(value)) node.attributes[attr] = 'currentColor';
            else errors.push(`${attr}="${value}" on <${node.name}>`);
          }
          if (node.attributes.style) errors.push(`style on <${node.name}>`);
          const inheritsFill = parent.type === 'element' && parent.name !== 'svg';
          if (PAINTABLE.has(node.name) && node.attributes.fill === undefined && !inheritsFill) {
            node.attributes.fill = 'currentColor';
          }
        },
      },
    }),
  };
}

function viewBoxOf(svg) {
  const match = /viewBox="([^"]+)"/.exec(svg);
  if (!match) throw new Error('missing viewBox');
  const [left, top, width, height] = match[1].trim().split(/[\s,]+/).map(Number);
  return { left, top, width, height };
}

export function toIconData(name, svg, { mono = true } = {}) {
  const errors = [];
  const { data } = optimize(svg, {
    multipass: true,
    floatPrecision: 4,
    plugins: [
      'preset-default',
      'removeDimensions',
      'removeXMLProcInst',
      ...(mono ? [currentColorPlugin(errors)] : [{ name: 'prefixIds', params: { prefix: name } }]),
    ],
  });
  if (errors.length) throw new Error(`${name}: not monochrome — ${errors.join(', ')}`);

  const { left, top, width, height } = viewBoxOf(svg);
  const root = /^<svg\b([^>]*)>([\s\S]*)<\/svg>$/.exec(data.trim());
  if (!root) throw new Error(`${name}: unexpected svgo output`);
  const rootAttrs = root[1].replace(/\s(xmlns(:\w+)?|viewBox|width|height)="[^"]*"/g, '').trim();
  const body = rootAttrs ? `<g ${rootAttrs}>${root[2]}</g>` : root[2];

  return {
    name,
    body,
    width,
    height,
    ...(left ? { left } : {}),
    ...(top ? { top } : {}),
    mono,
  };
}
