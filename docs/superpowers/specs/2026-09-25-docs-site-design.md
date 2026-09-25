# Manthan Docs Site — Design Spec

## Goal

A public-facing reference site — one page per component — showing what it looks like live, its props (per framework), and how to use it in each of React, Vue, Svelte and Angular. Audience: developers evaluating or integrating the `@manthan` packages once published (roadmap item 2). This spec covers the **pipeline and shell**, proven against a **pilot set of 5 components**; backfilling the remaining ~30 components is a separate, later plan that reuses this pipeline mechanically.

## Non-goals (v1)

- Full DOM-attribute enumeration for props that extend native elements (`ComponentProps<'button'>` etc.) — list only Manthan-specific props, plus a generic note that native attributes are also accepted.
- Live in-page mounting of all four framework runtimes in one bundle (rejected in favor of iframe isolation — see rationale below).
- Search, versioning, i18n, or a CMS.
- Automated visual regression testing of demo pages (roadmap item 10 covers this separately, across all 11 styles).
- Deploying each framework's demo app to its own hosted subdomain — v1 copies each framework's static demo build into `manthan-docs`' own output and serves it same-origin.

## Repo & directory structure

New 7th repo, `manthan-docs`, built with **Astro**:

```
manthan-docs/
  astro.config.mjs
  package.json
  src/
    content/
      components/          # one .mdx per component: prose only
        button.mdx
        input.mdx
        dialog.mdx
        data-table.mdx
        chart.mdx
    data/
      component-registry.ts  # maps slug -> per-framework {file, propsType}
      props/                 # generated JSON, one file per component, gitignored
    layouts/
      ComponentPage.astro
    pages/
      index.astro
      components/
        index.astro          # category-grouped listing
        [slug].astro          # renders layout: demo iframe + tabs + props tables
    lib/
      demo-urls.ts            # resolves each framework's iframe src per environment
  scripts/
    extract-props/
      index.ts                # orchestrator CLI
      react.ts
      vue.ts
      svelte.ts
      angular.ts
      types.ts                # PropDoc, ComponentPropsDoc shared types
  public/
    demos/                    # populated at build time by copying each framework's demo build
      react/
      vue/
      svelte/
      angular/
  .github/workflows/ci.yml
```

## Data model

```ts
// scripts/extract-props/types.ts
export interface PropDoc {
  name: string;
  type: string;           // rendered TS type as source text, e.g. "'sm' | 'md' | 'lg'"
  required: boolean;
  default?: string;       // from a destructuring default or an @default JSDoc tag
  description?: string;   // JSDoc comment text, stripped of tags
}

export interface ComponentPropsDoc {
  slug: string;
  react?: PropDoc[];
  vue?: PropDoc[];
  svelte?: PropDoc[];
  angular?: PropDoc[];
  note?: string;          // e.g. "Also accepts standard <button> attributes."
}
```

```ts
// src/data/component-registry.ts
export interface ComponentSource {
  react?: { file: string; propsType: string };    // named interface, e.g. "ButtonProps"
  vue?: { file: string; propsType?: string };      // omit when defineProps<{...}> is inline
  svelte?: { file: string; propsType: string };    // named interface, e.g. "Props"
  angular?: { file: string; className: string };   // class with input()/@Input() members
}

export const componentRegistry: Record<string, ComponentSource> = {
  button: {
    react: { file: '../manthan-react/src/components/button.tsx', propsType: 'ButtonProps' },
    vue: { file: '../manthan-vue/src/components/Button.vue' },
    svelte: { file: '../manthan-svelte/src/lib/components/Button.svelte', propsType: 'Props' },
    angular: { file: '../manthan-angular/projects/manthan/src/lib/button.ts', className: 'MnButton' },
  },
  // ...one entry per pilot component; the backfill plan adds the rest
};
```

(Paths and shapes above were verified against the real `Button` sources on 2026-09-25 — Vue's `Button.vue` uses an inline `defineProps<{...}>()` object type, not a named interface; Angular classes are named `Mn<Component>`, not `Manthan<Component>`.)

React and Angular group several components per category file (e.g. `InputProps`/`DialogProps` live in React's `form.tsx`/`overlay.tsx`, not standalone `input.tsx`/`dialog.tsx`; Angular mirrors this with `form.ts`/`overlay.ts`). Vue and Svelte use one file per component instead. This is fine for the adapters — they locate a type/class by name within whatever file the registry points at — but it means several registry entries legitimately point `file` at the same shared path for React/Angular while pointing at distinct files for Vue/Svelte. The exact `propsType`/`className` value for each of the pilot's Input, Dialog, DataTable and Chart entries (across all four frameworks) gets pinned with a fresh read of the real source at the start of that component's implementation task, not hand-verified here.

File paths are relative to `manthan-docs/`, assuming the standard sibling-repo layout from `scripts/bootstrap.sh`. The registry is hand-maintained — inferring it automatically isn't worth it for ~35 components, and a missing/wrong entry fails the extractor loudly rather than silently.

## Props extraction pipeline

Two cross-cutting rules apply to every adapter, verified against the real pilot components on 2026-09-25:

- **`Omit<X, 'k1' | 'k2'>` wrapping**: appears constantly (React's `Omit<ComponentProps<'button'>, 'color'>`, Svelte's `Omit<HTMLInputAttributes, 'size'>`, Svelte's `Omit<ChartControllerOptions<T>, 'hidden'>`). Before applying the resolve-if-internal/note-if-external rule below, unwrap `Omit<X, K>` to `X`, and drop any of `X`'s resolved members whose name is in `K`.
- **Two-way-bindable props**: Vue's `defineModel<T>(name?, { default? })` (name defaults to `'modelValue'`), Svelte's `let { x = $bindable(default) }`, and Angular's `readonly x = model<T>(default)` / `model.required<T>()` all mark a prop as bindable. Each adapter records these as ordinary `PropDoc` entries (name, type, default) with `description` prefixed `"Two-way bindable. "` if no JSDoc is present — React has no equivalent (controlled via explicit `value`/`onChange` props already visible as ordinary members).

One `ts-morph`-based adapter per framework, each producing `PropDoc[]`, orchestrated by `scripts/extract-props/index.ts`:

- **React** (`react.ts`): load the file through a `ts-morph` `Project` configured with `tsConfigFilePath` pointing at the framework repo's real `tsconfig.json` (so normal module resolution, including the `file:../manthan-base`/`file:../manthan-icons` links, works), find the named `interface`, walk its members. For a member that's a plain property signature, record name/type/optional/JSDoc. For an `extends` clause, try to resolve the referenced type's declaration via the project's language service:
  - If it resolves to a declaration inside `@manthan/*` (e.g. `Dialog`'s `ChartProps` → `ChartControllerOptions` in `manthan-base/src/dom/chart.ts`), walk *that* interface's members too and merge them in — these are real Manthan-authored props, not noise.
  - If it resolves to a declaration outside `@manthan/*` (React's `ComponentProps<'button'>`, DOM lib types, etc.) or doesn't resolve at all, don't walk it — set `note` on the `ComponentPropsDoc` to `"Also accepts standard <TAG> attributes."` instead (tag name pulled from the generic argument as source text).
  The same resolve-if-internal/note-if-external rule applies to Svelte below.
- **Vue** (`vue.ts`): read the `.vue` file, extract the `<script setup lang="ts">` block via `@vue/compiler-sfc`'s `parse()`, load it into the same kind of `tsConfigFilePath`-backed `ts-morph` project (as an in-memory override of that block's content), and find the sole `defineProps<...>()` call. Its type argument is either a `TypeLiteral` (inline object type, e.g. Button's real shape — walk its members directly) or a `TypeReference` to a named interface (declared in the same block, or resolved across `@manthan/*` the same way as React) — same resolve-if-internal/note-if-external rule for any further `extends`. `propsType` in the registry is only needed to disambiguate the rare case where more than one type is in scope.
- **Svelte** (`svelte.ts`): read the `.svelte` file, extract the `<script lang="ts">` block by regex (Svelte 5 SFCs put the whole script as one block, no nested-block ambiguity), find the named `interface Props` (or whatever `propsType` names), and reuse React's interface-walking logic, including the resolve-if-internal/note-if-external rule for things like `HTMLButtonAttributes` from `svelte/elements` (external → note) vs. any `@manthan/*` type (internal → resolve).
- **Angular** (`angular.ts`): load the file directly with `ts-morph` (plain `.ts`, no extraction needed), find the class named `className`, walk its property declarations. The primary pattern in this codebase is signal-based: `readonly x = input<T>()` (optional, type from the call's explicit generic), `readonly x = input(default, { transform? })` (optional, type inferred from the default value's literal type), and `readonly x = input.required<T>()` (required, type from the generic). Also support the legacy decorator form, `@Input() x: T`, for any component that still uses it. JSDoc immediately above the property is captured the same way as the other adapters.

Each adapter is a pure function `(file: string, typeNameOrClassName?: string) => PropDoc[]` — independently unit-testable against fixture source strings (Section: Testing).

The orchestrator (`index.ts`):
1. Imports `componentRegistry`.
2. For each slug, for each framework key present, calls the matching adapter, catching and re-throwing with the slug/framework in the error message.
3. Writes `src/data/props/<slug>.json` as the `ComponentPropsDoc` shape.
4. Exits non-zero on any failure — a missing or unparseable prop source fails the whole build, never silently emits an empty table.

Run via `npm run extract-props` (a `tsx scripts/extract-props/index.ts` script), invoked as a build step before `astro build`.

## Demo apps (live rendering)

Each framework gets a small, isolated demo runner, separate from its existing kitchen-sink `playground` app:

- **React** (`manthan-react/demos/`): new Vite app, sibling to `playground/`. `demos/main.tsx` reads `new URLSearchParams(location.search).get('c')`, looks up a `Record<string, () => ReactElement>` registry (`demos/registry.tsx`, one entry per pilot component — e.g. `button: () => <Button>Click me</Button>`), and renders the match into `#root`; an unknown/missing `c` renders a "demo not found" message rather than crashing. Dev server pinned to port **5180** (`vite.config.ts` → `server: { port: 5180 }`) so it can run alongside the other three simultaneously.
- **Vue** (`manthan-vue/demos/`): same pattern, `demos/main.ts` + `demos/registry.ts` mapping slug → a small wrapper SFC or `h()` call, port **5181**.
- **Svelte** (`manthan-svelte/demos/`): same pattern, `demos/main.ts` + `demos/registry.ts`, port **5182**.
- **Angular** (`manthan-angular/projects/playground/`): rather than a new Angular project (heavier — new `angular.json` target, own `ng-packagr`/build config), add a `/demo` route to the *existing* `playground` app: a `DemoComponent` that reads `c` from `ActivatedRoute.snapshot.queryParamMap`, looks up a `Record<string, Type<unknown>>` registry, and renders the matching component via `NgComponentOutlet`. Playground's default serve port, **4200**, already works for this since it's an additional route, not a new app.

The demo registry file in each framework **is** the source shown in that framework's code tab (Section: Content authoring) — single source of truth, no copy-paste drift possible.

## Astro site

- `pages/components/[slug].astro`: reads `content/components/<slug>.mdx` (prose) and `data/props/<slug>.json` (generated), renders:
  - The MDX prose (title, description, usage notes).
  - Four tabs (React/Vue/Svelte/Angular), each an `<iframe>` whose `src` comes from `lib/demo-urls.ts` (below) plus `?c=<slug>`.
  - Below each iframe, that framework's code, read from its demo registry file at build time (Node `fs.readFileSync`) and rendered via Astro's built-in `<Code>` component (Shiki-backed) — no separate syntax highlighter dependency needed.
  - A props table per framework from the generated JSON; frameworks absent from the registry entry (rare, if a component doesn't apply to one framework) simply don't render that tab.
- `pages/components/index.astro`: lists all entries in `content/components/`, grouped by a `category` frontmatter field (free-form string, assigned per-component when its MDX is written — no fixed taxonomy baked into this spec).
- `lib/demo-urls.ts`:
  ```ts
  const isDev = import.meta.env.DEV;
  export function demoUrl(framework: 'react' | 'vue' | 'svelte' | 'angular', slug: string): string {
    if (isDev) {
      const port = { react: 5180, vue: 5181, svelte: 5182, angular: 4200 }[framework];
      return `http://localhost:${port}/${framework === 'angular' ? 'demo' : ''}?c=${slug}`;
    }
    return `/demos/${framework}/index.html?c=${slug}`;
  }
  ```

## Build order & production embedding

1. Build `manthan-icons`, then `manthan-base` (same order as the CI pipeline already in place).
2. Build all four demo apps in parallel: `manthan-react/demos`, `manthan-vue/demos`, `manthan-svelte/demos` (`vite build`), and `manthan-angular/projects/playground` (`ng build playground` — already includes the new `/demo` route).
3. Copy each demo build's output into `manthan-docs/public/demos/<framework>/`.
4. Run `npm run extract-props` in `manthan-docs`.
5. `astro build`.

Same-origin serving in production means no cross-origin iframe/`X-Frame-Options` concerns, and one deploy target (`manthan-docs`) instead of five.

## CI

`manthan-docs/.github/workflows/ci.yml` extends the sibling-checkout pattern from the six existing repos: checkout all six repos at `main`, build in the order above, run the extractor, `astro build`. A build-time check (part of `extract-props`'s orchestrator, or a small separate script run right after it) verifies every `content/components/*.mdx` slug has a matching `component-registry` entry and vice versa — catches an added MDX page with no data, or a registry entry with no page, before it ships.

## Testing

- **Extractor adapters**: real unit tests per adapter (`react.test.ts` etc.) against small fixture source strings written in-line in the test file (not read from the real repos) — e.g. assert that an interface with an optional prop, a required prop, and a JSDoc'd prop produces the expected `PropDoc[]`. This is the pipeline's actual correctness surface and gets full TDD treatment in the implementation plan.
- **Registry/content consistency check**: a script test (or the CI step itself) asserting the slug sets match, as above.
- **Deferred to a later plan**: Playwright smoke pass loading each pilot page and asserting all four iframes load without console errors. Valuable but not required to prove the pipeline architecture; added once more components exist and the pattern is stable.

## Pilot scope for the implementation plan

Five components, chosen for variety across the extraction and rendering pipeline:

| Component | Why it's in the pilot |
|---|---|
| Button | Simplest case — presentational, few props, exercises the "extends native element" note path. |
| Input | Form component — exercises `v-model`/two-way-binding-style prop differences across frameworks. |
| Dialog | Overlay/behavioral — exercises the native `<dialog>`-based DOM controller and open/close state. |
| DataTable | Complex, multi-prop, likely the largest generated props table. |
| Chart | Non-standard rendering (canvas/SVG geometry via `buildChartScene`), CSS-variable-driven colors — stresses whether the demo-iframe approach handles non-trivial visual output cleanly. |

Once this plan lands and all five pages work end-to-end in all four frameworks, a second, more mechanical plan backfills the remaining ~30 components by repeating the now-proven pattern (registry entry + MDX + demo registry entry × 4 frameworks per component) — a good fit for parallel or subagent-driven execution since each component is an independent repetition.

## Open risks

- **Angular's `/demo` route inside `playground`** shares one Angular app/bundle with the existing kitchen-sink demo; if `playground`'s existing content ever breaks the build, the docs demo route breaks too. Acceptable for v1 given Angular's heavier per-project setup cost; revisit if it becomes a real maintenance burden.
- **`@vue/compiler-sfc` block extraction** and **Svelte script-block regex extraction** are both string/AST boundary points that could mis-parse an unusual SFC (e.g. multiple `<script>` blocks). The pilot's Input and Button components should surface this early since they're straightforward SFCs; DataTable and Chart will stress it further.
- **Same repo, no lockfile-shared workspace**: `manthan-docs` checks out five other repos in CI exactly like the framework repos already do for `manthan-icons`/`manthan-base` — same pattern, no new risk, just more checkout steps.
