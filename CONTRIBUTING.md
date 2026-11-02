# Contributing

Bug reports and ideas go to [issues](https://github.com/icons8/line-awesome/issues). Code changes come as pull requests to `master`; CI runs on each one.

## Setup

Use the Node version from `.nvmrc` (24) and npm:

```shell
npm ci
npm run build
npm test
```

| Command | What it does |
|---|---|
| `npm run build:font` | Rebuilds `la-solid-900` and `la-brands-400` (`.ttf`, `.woff`, `.woff2`) and the generated block at the end of `line-awesome.css` and `line-awesome.min.css`, from `font-source/1.3.0`, `svg/` and `added-icons.json`. `--check` only compares. |
| `npm run build:all-icons` | Rewrites `examples/all-icons/index.html`, the page with every icon, from the CSS and the fonts. |
| `npm run build` | Rebuilds `lib/` from the font and `svg/`: TypeScript for the components, then the icon modules, `icons.json` and `metadata.json`. |
| `npm test` | Runs the Vitest suite and type-checks the published types. Needs a fresh `lib/`. |
| `npm run test:watch` | The same, rerunning on changes. |
| `npm run test:visual` | Renders `examples/all-icons` in a browser with the 1.3.0 fonts and with the built ones and compares the pixels. Needs `npx playwright install chromium`; `BROWSER=webkit` or `firefox` picks another engine. |
| `npm run check-bundle -- examples/<name>` | Checks an example's build; see [examples/README.md](examples/README.md). |

## Layout

```
dist/      the font, CSS, SCSS and the Font Awesome shims (published as is); the fonts and the
           CSS also hold the icons added after 1.3.0 (built by build:font, committed)
font-source/1.3.0/  the 1.3.0 TrueType fonts, the input of build:font (never edited)
svg/       one SVG file per icon (source)
src/       IconData, toSvgString and the Vue and React LaIcon
scripts/   build.mjs and the icon generator in generate/
lib/       build output, published, not committed
test/      Vitest suite and fixtures
test-visual/  the browser test behind npm run test:visual
examples/  one project per bundler recipe from the README, and all-icons, the page with every icon
```

## How the icon modules are built

`scripts/generate/` reads three things and writes `lib/`:

- **Names and codepoints** come from `dist/line-awesome/css/line-awesome.css`, including the Font Awesome 4 section.
- **Styles** come from the glyphs in `dist/line-awesome/fonts/la-*.svg`. File names in `svg/` do not say which style an icon has, the fonts do.
- **Artwork** comes from `svg/`. svgo optimizes it and paints monochrome icons with `currentColor`.

A regular icon drawn the same as its solid twin becomes a re-export of it, so both names share one module.

## Adding an icon

1. Draw it on the 32×32 grid in the Icons8 Windows 10 style: one monochrome `<path>` with fills, no strokes. Save it to `svg/` as `name-solid.svg` for a solid icon, `name.svg` for regular and brands.
2. Add it to `added-icons.json` with its style and codepoint: the Font Awesome codepoint if Font Awesome has the icon, otherwise the next free one from `e900`.
3. Run `npm run build:font` and `npm run build:all-icons`, and commit the changed `dist/line-awesome/` files and `examples/all-icons/index.html` with the svg. `npm run build && npm test && npm run test:visual` checks the rest.

The new glyph is appended to a copy of the 1.3.0 font in `font-source/1.3.0`, after the last glyph (`scripts/ttf-splice.mjs`), and its class to the end of the CSS. Never edit `font-source/` or the CSS above the generated block by hand. A name already in the 1.3.0 CSS cannot be reused. The `.eot` and `.svg` fonts are not rebuilt.

## What the tests guard

- **Old icons do not change.** `dist/` (except the SCSS and the Font Awesome 6/7 shim) and `svg/` must stay byte-identical to line-awesome 1.3.0, because unversioned CDN URLs serve them to existing sites. The hashes are in `test/fixtures/legacy-1.3.0.sha256.json`. A deliberate change updates that fixture in the same pull request, with the reason in its description. Two things are exempt from the byte check: the generated block at the end of the two CSS files, and the `.ttf`, `.woff` and `.woff2` of the three fonts, which hold the icons from `added-icons.json`.
- **Those fonts are the old ones plus the new glyphs.** `test/fonts.test.mjs` compares them with `font-source/1.3.0`: every old codepoint has the same glyph id, outline, advance and name; GSUB, `name` and the metrics are the same; the old `glyf` bytes are a prefix of the new table; WOFF and WOFF2 unpack to the same TrueType font. The fonts and the CSS block must equal a fresh `npm run build:font`.
- **The page with every icon renders the same.** `npm run test:visual` (CI job `visual`) compares screenshots of `examples/all-icons` with the 1.3.0 fonts and the built ones: old icons must match pixel for pixel, new ones must be drawn.
- **Optimized icons look like the originals.** Every icon is rendered before and after svgo and compared pixel by pixel.
- **Names stay compatible.** `icons.json` covers every name of the Iconify `la` set.
- **The tarball ships what it should.** The contents of `npm pack`, every `exports` target and the size budget are checked.

## Pull requests

This repository is public: keep internal links, tokens and machine paths out of code, commits and descriptions. Describe what changed for users of the package; if the font or the published files change, say how you checked them.
