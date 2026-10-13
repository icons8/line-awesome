// The whole set, for contrast with one.js: what a bundle would weigh without tree-shaking.
import * as icons from 'line-awesome';
import { toSvgString } from 'line-awesome/core';

document.body.innerHTML = Object.values(icons)
  .map((icon) => toSvgString(icon))
  .join('');
