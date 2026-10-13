// Type-checks the published entry points exactly as a consumer imports them.
import { expectTypeOf, test } from 'vitest';
import { lasStar, larStar, labGithub, larStarO, type IconData } from 'line-awesome';
import lasHeart from 'line-awesome/icons/las-heart';
import { toSvgString, svgAttrs } from 'line-awesome/core';
import { LaIcon as ReactIcon, type LaIconProps } from 'line-awesome/react';
import { LaIcon as VueIcon } from 'line-awesome/vue';
import { h } from 'vue';

test('icons are readonly IconData', () => {
  expectTypeOf(lasStar).toEqualTypeOf<IconData>();
  expectTypeOf(larStar).toEqualTypeOf<IconData>();
  expectTypeOf(labGithub).toEqualTypeOf<IconData>();
  expectTypeOf(larStarO).toEqualTypeOf<IconData>();
  expectTypeOf(lasHeart).toEqualTypeOf<IconData>();
  // @ts-expect-error icon data is readonly
  lasStar.body = '';
});

test('core helpers', () => {
  expectTypeOf(toSvgString).parameter(1).toEqualTypeOf<{ size?: number | string; title?: string } | undefined>();
  expectTypeOf(toSvgString(lasStar)).toBeString();
  expectTypeOf(svgAttrs(lasStar)).toEqualTypeOf<Record<string, string>>();
});

test('React props: icon is required, svg props pass through', () => {
  expectTypeOf<LaIconProps>().toHaveProperty('icon').toEqualTypeOf<IconData>();
  expectTypeOf<{ icon: IconData; className: string; onClick: () => void }>().toExtend<LaIconProps>();
  expectTypeOf<{ size: number }>().not.toExtend<LaIconProps>();
  expectTypeOf(ReactIcon).parameter(0).toEqualTypeOf<LaIconProps>();
});

test('Vue component accepts its props', () => {
  h(VueIcon, { icon: lasStar, size: 16, title: 'Star' });
  // @ts-expect-error size must be a number or string
  h(VueIcon, { icon: lasStar, size: true });
});
