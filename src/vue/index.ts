import { defineComponent, h, type PropType } from 'vue';
import { svgAttrs, svgInner, type IconData } from '../core.js';

export type { IconData } from '../core.js';

/**
 * Renders an icon as inline SVG: `<LaIcon :icon="lasStar" />`.
 * `class`, `style` and other attributes fall through to `<svg>`.
 */
export const LaIcon = defineComponent({
  name: 'LaIcon',
  props: {
    icon: { type: Object as PropType<IconData>, required: true },
    size: { type: [Number, String] as PropType<number | string>, default: undefined },
    title: { type: String, default: undefined },
  },
  setup(props) {
    return () =>
      h('svg', {
        ...svgAttrs(props.icon, { size: props.size, title: props.title }),
        innerHTML: svgInner(props.icon, props.title),
      });
  },
});

export default LaIcon;
