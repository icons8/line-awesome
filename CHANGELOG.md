# Changelog

All notable changes to this project will be documented in this file.

## 2.1.0

### Added

- Font Awesome 6 and 7 compatibility: `dist/font-awesome-6-7-line-awesome/css/all.min.css` replaces the Font Awesome stylesheet without changes to the markup. It knows the names of Font Awesome Free 6.7.2 and 7.3.1 and their old names, the `fa-solid`/`fa-regular`/`fa-brands` and `fas`/`far`/`fab` prefixes and the utility classes, and maps the Font Awesome 6/7 font families to the Line Awesome fonts. Icons are as wide as their glyph, as in Font Awesome 6; `:root { --fa-width: 1.25em; }` gives the fixed width of Font Awesome 7. It covers 76% of the free Font Awesome 6.7.2 icons and 72% of 7.3.1.
- Font Awesome 6/7 names that Line Awesome lacks as exports (`lasHouse` → `lasHome`), as aliases in `icons.json`, and under `fa` in `metadata.json`.

### Unchanged

- The 1.x CSS, fonts and the Font Awesome 5 shim are byte-identical to 1.3.0, at the same paths.

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
