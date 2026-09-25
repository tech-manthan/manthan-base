# Manthan UI: notes for Claude Code

Manthan UI is a Tailwind v4 component library. It ships 11 design styles and light/dark/system themes, and has bindings for React, Vue, Svelte, Angular, Web Components and plain DOM.

## Workspace layout

Clone all six repos side by side (`scripts/bootstrap.sh` clones, installs and builds them in order):

```
manthan/
  manthan-icons    134 SVG icons → ESM, sprite and JSON (scripts/build.mjs)
  manthan-base     tokens, styles, recipes, core, DOM controllers, <mn-*> elements
  manthan-react    React 19 (tsup, 'use client' banner, treeshake: false)
  manthan-vue      Vue 3.5 SFCs (vite lib build + vue-tsc)
  manthan-svelte   Svelte 5 runes and snippets (svelte-package)
  manthan-angular  Angular 22 signals, standalone components, CVA (ng-packagr; tests on Vitest)
```

- Dependencies flow icons → base → the framework packages.
- During development the packages link to each other with `file:../manthan-*` devDependencies. The published packages declare version ranges as peerDependencies.
- The active branch is `claude/great-turing-ihfjsd`. There is no `main` branch yet.
- TypeScript is pinned to ~6.0.3 everywhere. The tsup DTS build needs `"ignoreDeprecations": "6.0"`.
- The Angular CLI needs Node ≥ 22.22.3 or ≥ 24.15.

## manthan-base architecture

- `styles/theme.css` is the entry point. It defines the `@custom-variant`s (`dark` plus one per style), maps the `--mn-*` tokens to Tailwind in `@theme inline`, and declares the `tone-*` and `border-mn` utilities.
- `styles/tokens.css` is generated. Edit `scripts/gen-tokens.mjs` instead; it writes 12-step OKLCH scales using `light-dark()`.
- `styles/styles/*.css` has one file per style. Each is a token map plus a few rules on hook classes (for example `.mn-btn-solid`) in `@layer utilities`.
- Themes and styles are set through scope attributes:
  - `data-mn-theme` sets `color-scheme`.
  - `data-mn-style` is one of `default glass neu brutal material fluent clay retro neon minimal skeuo`, and can be scoped per element.
- `base.css` forces closed overlays (dialog, popover, menu, tooltip, listbox) to `display:none !important`. Without that, `flex` and `grid` utilities make them visible.
- `src/recipes`: zero-dependency `recipe()` and `slotRecipe()` (in the style of cva/tailwind-variants), plus `cx`, `cn` and `configure({ merge })`.
- `src/core`: framework-agnostic logic. Keyboard, position, pagination, toast store (`ToastStore`), calendar, options, hotkey, table, validation (`rules`, `runRules`), form store (`createForm`) and files.
- `src/dom`: `createX` controllers built on the native `<dialog>`, the Popover API and `@starting-style`, plus `autoInit`.
- `src/elements`: light-DOM custom elements `<mn-*>`, exported as `@manthan/base/elements` and `/elements/define`. Two rules:
  - Use `setClass` so the author's classes are preserved.
  - Avoid field names that clash with `HTMLElement` properties.
- `showcase/` (vite, multi-page): `index.html` renders every component and has the style, theme and hue switcher. `elements.html` is a plain-HTML page.

## Commands (in each repo)

`npm run build`, `npm test`, `npm run typecheck` (or `check` in Svelte), and `npm run dev` for the showcase or playground.

Test counts at hand-off:

| Repo | Tests |
|---|---|
| icons | 5 |
| base | 56 |
| react | 18 |
| vue | 16 |
| svelte | 4 |
| angular | 4 |

## Conventions and gotchas

- Always write `aria-invalid` as `"true"` or `"false"`. An empty value doesn't match Tailwind's `aria-invalid:` variant.
- In the Vue Checkbox and Switch, `inheritAttrs: false` forwards attributes to the native input.
- Svelte: put `aria-selected` on the grid cell and give the button `data-selected`.
- `cellAlign` uses `!` so that header alignment wins over `text-start`.
- A new component needs:
  1. a recipe in base
  2. a core or DOM controller if it has behaviour
  3. an element
  4. a wrapper in each of the four framework packages
  5. tests
  6. a showcase entry

## Roadmap / open decisions

- Open PRs, or make `main` the default branch.
- Charts that follow the active style.
- A docs site.
- An accessibility and bundle-size audit.
