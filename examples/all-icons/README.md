# All icons

`index.html` shows every icon of the Line Awesome fonts on one page: the class name under each icon, in four groups: solid (`las`), regular (`lar`) and brands (`lab`), by the font that has the icon, and "Legacy names" (`la`): Font Awesome 4 names such as `address-card-o`, which the stylesheet declares only as `.la.la-name`, so they work with the plain `la` class and not with `las`, `lar` or `lab`. Classes with no glyph in any font (`font-awesome-logo-full`) are not shown. Icons added after 1.3.0 have a yellow background. A box at the top filters by name.

The page loads `../../dist/line-awesome/css/line-awesome.css` and nothing else.

## Open it

It is a static page: open `examples/all-icons/index.html` from a clone of the repository, in a browser, no server needed. It does not work from the npm package, which has no `examples/`.

## Update it

```shell
npm run build:font        # only if svg/ or added-icons.json changed
npm run build:all-icons   # rewrites index.html
```

`scripts/build-all-icons-page.mjs` reads every `.la-name:before` rule of the CSS and puts the class into each group whose font has its codepoint. Do not edit `index.html` by hand: `npm test` fails if it differs from a fresh build.

## Visual test

`npm run test:visual` opens this page twice in Playwright, once with the 1.3.0 fonts from `font-source/1.3.0` and once with the fonts in `dist/`, takes screenshots of the whole page and compares them pixel by pixel (pixelmatch).

- **Old icons must be identical**, with zero differing pixels per icon. The threshold is 0 on purpose: the new fonts keep the outlines of the old glyphs byte for byte and the same browser draws them, so any difference means a changed glyph. Measured: 0 differing pixels for all 1,809 old icons in Chromium, WebKit and Firefox, so there is no anti-aliasing noise to tolerate.
- **Every cell is drawn.** In the new render each icon must have a computed `::before` content other than `none` and `normal`, a width of its own, and pixels that differ from its background. A class used with the wrong prefix has no content and fails here.
- **New icons must be drawn.** The old render has nothing in their place; the new one must differ from it by at least 100 pixels in the icon box (at 32 px the 11 icons measure 151 to 336 in Chromium). An empty cell or a font that did not load fails.
- Both renders must have loaded all three font faces, so two renders of a fallback font cannot pass for equal.

Setup: `npx playwright install chromium`. `BROWSER=webkit npm run test:visual` or `BROWSER=firefox …` runs the same test in another engine (`npx playwright install webkit firefox`). Firefox counts more differing pixels for the new icons (354 to 524); the old ones are identical there too. On failure the screenshots and the diff are in `test-visual/output/`.
