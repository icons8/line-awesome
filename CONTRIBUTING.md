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
| `npm run build` | Rebuilds `lib/` from the font and `svg/`: TypeScript for the components, then the icon modules, `icons.json` and `metadata.json`. |
| `npm test` | Runs the Vitest suite and type-checks the published types. Needs a fresh `lib/`. |
| `npm run test:watch` | The same, rerunning on changes. |
| `npm run check-bundle -- examples/<name>` | Checks an example's build; see [examples/README.md](examples/README.md). |

## Layout

```
dist/      the 1.x font, CSS, SCSS and the Font Awesome shim (source, published as is)
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

## What the tests guard

- **The font does not change.** `dist/` (except the SCSS) and `svg/` must stay byte-identical to line-awesome 1.3.0, because unversioned CDN URLs serve them to existing sites. The hashes are in `test/fixtures/legacy-1.3.0.sha256.json`. A deliberate change to the font updates that fixture in the same pull request, with the reason in its description.
- **Optimized icons look like the originals.** Every icon is rendered before and after svgo and compared pixel by pixel.
- **Names stay compatible.** `icons.json` covers every name of the Iconify `la` set.
- **The tarball ships what it should.** The contents of `npm pack`, every `exports` target and the size budget are checked.

## Pull requests

This repository is public: keep internal links, tokens and machine paths out of code, commits and descriptions. Describe what changed for users of the package; if the font or the published files change, say how you checked them.
