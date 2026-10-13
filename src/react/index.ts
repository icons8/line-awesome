import { createElement, type ReactElement, type SVGProps } from 'react';
import { svgAttrs, svgInner, type IconData } from '../core.js';

export type { IconData } from '../core.js';

export interface LaIconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'dangerouslySetInnerHTML'> {
  icon: IconData;
  /** Icon height; width follows the aspect ratio. Defaults to `1em`. */
  size?: number | string;
  /** Accessible name. Without it the icon is decorative and hidden from screen readers. */
  title?: string;
}

/**
 * Renders an icon as inline SVG: `<LaIcon icon={lasStar} />`.
 * Other props (`className`, `style`, handlers) are passed to `<svg>`.
 */
export function LaIcon({ icon, size, title, ...rest }: LaIconProps): ReactElement {
  return createElement('svg', {
    ...svgAttrs(icon, { size, title }),
    ...rest,
    dangerouslySetInnerHTML: { __html: svgInner(icon, title) },
  });
}

export default LaIcon;
