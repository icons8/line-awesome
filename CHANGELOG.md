# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- 11 icons requested on GitHub: `la-x-twitter` (#95, #105, #108, #112), `la-tiktok` (#94), `la-google-scholar` (#109), `la-jira-service-desk` (#65), `la-sparkles` for AI (#104), `la-repeat-one` (#110), `la-trailer` (#106), `la-rat` (#70), `la-lipstick`, `la-nail-polish` and `la-perfume` (#66). The Twitter bird stays as it was.
- They ship as SVG modules (`labXTwitter`, `lasSparkles`, …), in `icons.json`, and as a font with its own stylesheet, `dist/line-awesome-additions/css/line-awesome-additions.min.css`. The 1.3.0 font and CSS are unchanged.
- `npm run build:font` builds that font and CSS from `svg/` and `added-icons.json`.

## 2.0.1

### Changed

- README and package description redesigned: new header, badges and illustrations, "more than 1,500 free line icons" instead of an exact count. No code changes: the package contents are the same as in 2.0.0.

## 2.0.0

### Added

- Every icon as a tree-shakeable SVG module: `import { lasStar } from 'line-awesome'`. A bundle only carries the icons it imports.
- `LaIcon` components for Vue (`line-awesome/vue`) and React (`line-awesome/react`), and `toSvgString` for framework-free code (`line-awesome/core`).
- `icons.json` in the Iconify format, for unplugin-icons, UnoCSS and Tailwind. Names match the Iconify `la` set.
- `metadata.json` with codepoints, styles and aliases of every icon.
- Font Awesome 4 names from the CSS compatibility section as deprecated exports (`lasClose` → `lasTimes`).
- TypeScript types.

### Changed

- The package has an entry: `main` and `exports` point to the JavaScript module (1.3.0 had none). The CSS stays at `dist/line-awesome/css/` and is also exposed through the `style` and `sass` export conditions.
- The package is ESM only: `require('line-awesome')` works on Node 20.19+; on Node 18 use `import`.

### Fixed

- SCSS: `math.div` instead of `/` division for Dart Sass, and the `la-1x` size class (previously unpublished 1.3.1).

### Unchanged

- CSS, fonts, the Font Awesome compatibility stylesheet and `svg/` are byte-identical to 1.3.0 and stay at the same paths.
- License: the same as in 1.3.0, MIT or the [Good Boy License](https://icons8.com/good-boy-license/) at your choice.

## 1.3.0 - 2019-11-21

### Added

- SCSS library. See it as an experimental feature and feel free to report bugs and to suggest new features. 
- SVG files. Earlier they were reachable only from the [site](https://icons8.com/line-awesome/).
- NPM package is updated with scss and svgs as well.

### Fixed

- Github and site versions are now synchronized.
