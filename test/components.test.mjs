import { describe, expect, test } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { lasStar } from '../lib/index.js';
import { toSvgString } from '../lib/core.js';
import { LaIcon as VueIcon } from '../lib/vue/index.js';
import { LaIcon as ReactIcon } from '../lib/react/index.js';

// A future icons8.com icon: its own grid and colors that must not be repainted.
const multicolor = {
  name: 'icons8-flag',
  body: '<path fill="#f44336" d="M0 0h48v12H0z"/><path fill="#2196f3" d="M0 12h48v12H0z"/>',
  width: 48,
  height: 24,
  mono: false,
};

const renderers = {
  vue: (props) => renderToString(createSSRApp({ render: () => h(VueIcon, props) })),
  react: async ({ class: className, ...props }) => renderToStaticMarkup(createElement(ReactIcon, { ...props, className })),
};

describe.each(Object.entries(renderers))('%s LaIcon', (framework, render) => {
  test('decorative icon is hidden from screen readers', async () => {
    const html = await render({ icon: lasStar });
    expect(html).toMatch(/^<svg [^>]*aria-hidden="true"/);
    expect(html).not.toMatch(/role=/);
    expect(html).toMatchSnapshot();
  });

  test('title gives an accessible name and is escaped', async () => {
    const html = await render({ icon: lasStar, title: 'Rate <b>"5"</b>' });
    expect(html).toMatch(/role="img"/);
    expect(html).not.toMatch(/aria-hidden|<b>/);
    expect(html).toMatchSnapshot();
  });

  test('size scales width by the viewBox ratio', async () => {
    expect(await render({ icon: lasStar, size: 24 })).toMatch(/width="24" height="24"/);
    expect(await render({ icon: multicolor, size: '2rem' })).toMatch(/width="4rem" height="2rem"/);
  });

  test('multicolor icon keeps its colors', async () => {
    const html = await render({ icon: multicolor });
    expect(html).not.toMatch(/currentColor/);
    expect(html).toMatchSnapshot();
  });

  test('class passes through to <svg>', async () => {
    expect(await render({ icon: lasStar, class: 'icon-lg' })).toMatch(/^<svg [^>]*class="icon-lg"/);
  });
});

test('toSvgString renders a standalone svg', () => {
  expect(toSvgString(lasStar, { size: 16 })).toMatchSnapshot();
});
