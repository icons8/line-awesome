# Examples

One small project per bundler recipe in the [README](../README.md). CI builds each of them against the packed package and checks what ended up in the build.

| Example | Shows |
|---|---|
| [`nuxt`](nuxt) | `LaIcon` in SSR, `<i-la-…>` tags through the Nuxt modules, v1 CSS |
| [`vite-vue`](vite-vue) | `LaIcon`, `<i-la-…>` tags through the resolver, v1 SCSS through `pkg:line-awesome` |
| [`webpack-react`](webpack-react) | `LaIcon`, `~icons/line-awesome/…` components, v1 CSS |
| [`rollup-vanilla`](rollup-vanilla) | `toSvgString` with 1, 10 and all icons, `raw` SVG strings through unplugin-icons |

## Running one

The examples install the package from a tarball, the way users get it from npm. From the repository root:

```shell
npm ci
npm run build
npm pack
cd examples/vite-vue
npm ci
npm install --no-save ../../line-awesome-*.tgz
npm run build
cd ../..
npm run check-bundle -- examples/vite-vue
```

## What `check-bundle` checks

Each example has an `expected.json` that names build output files and what they must hold. The check recognizes icons by their path data, because minifiers drop names.

- **Exactly the imported icons.** An icon that was not imported, or a missing one, fails the check. This is the tree-shaking test.
- **The v1 styles.** The CSS must contain a font class and the font name, and the font files must be in the build.
- **Size.** `rollup-vanilla` has gzip budgets, and adding nine icons to one may cost at most 1.5 KB each.
