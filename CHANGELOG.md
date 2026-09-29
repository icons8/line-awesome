# Changelog

All notable changes to this project will be documented in this file.

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
- License: MIT, stated the same way in `LICENSE.md`, `package.json` and the README.

### Fixed

- SCSS: `math.div` instead of `/` division for Dart Sass, and the `la-1x` size class (previously unpublished 1.3.1).

### Unchanged

- CSS, fonts, the Font Awesome compatibility stylesheet and `svg/` are byte-identical to 1.3.0 and stay at the same paths.

## 1.3.0 - 2019-11-21

### Added

- SCSS library. See it as an experimental feature and feel free to report bugs and to suggest new features. 
- SVG files. Earlier they were reachable only from the [site](https://icons8.com/line-awesome/).
- NPM package is updated with scss and svgs as well.

### Fixed

- Github and site versions are now synchronized.
