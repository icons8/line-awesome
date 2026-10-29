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
| `npm run build:font` | Rebuilds the font and CSS for icons added after 1.3.0 (`dist/line-awesome-additions/`) from `svg/` and `added-icons.json`. |
| `npm run build` | Rebuilds `lib/` from the font and `svg/`: TypeScript for the components, then the icon modules, `icons.json` and `metadata.json`. |
| `npm test` | Runs the Vitest suite and type-checks the published types. Needs a fresh `lib/`. |
| `npm run test:watch` | The same, rerunning on changes. |
| `npm run check-bundle -- examples/<name>` | Checks an example's build; see [examples/README.md](examples/README.md). |

## Layout

```
dist/      the 1.x font, CSS, SCSS and the Font Awesome shim (source, published as is),
           and line-awesome-additions/, the font and CSS of newer icons (built, committed)
svg/       one SVG file per icon (source)
src/       IconData, toSvgString and the Vue and React LaIcon
scripts/   build.mjs and the icon generator in generate/
lib/       build output, published, not committed
test/      Vitest suite and fixtures
examples/  one project per bundler recipe from the README
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
3. Run `npm run build:font` and commit `dist/line-awesome-additions/` with the svg. `npm run build && npm test` checks the rest.

A name already in the 1.3.0 CSS cannot be reused: the 1.3.0 files never change.

## What the tests guard

- **The font does not change.** `dist/` (except the SCSS) and `svg/` must stay byte-identical to line-awesome 1.3.0, because unversioned CDN URLs serve them to existing sites. The hashes are in `test/fixtures/legacy-1.3.0.sha256.json`. A deliberate change to the font updates that fixture in the same pull request, with the reason in its description. Icons from `added-icons.json` may add files there, never change existing ones.
- **The added font is fresh.** `dist/line-awesome-additions/` must equal a fresh `npm run build:font`.
- **Optimized icons look like the originals.** Every icon is rendered before and after svgo and compared pixel by pixel.
- **Names stay compatible.** `icons.json` covers every name of the Iconify `la` set.
- **The tarball ships what it should.** The contents of `npm pack`, every `exports` target and the size budget are checked.

## Pull requests

This repository is public: keep internal links, tokens and machine paths out of code, commits and descriptions. Describe what changed for users of the package; if the font or the published files change, say how you checked them.
