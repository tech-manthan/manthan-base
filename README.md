# @manthan/base

The core of **Manthan UI**: one component library with **11 design languages**, for **every frontend stack**, built on **Tailwind CSS v4**.

```
manthan-icons ──► manthan-base ──► manthan-react
 (icon data)      (theme, recipes,  manthan-vue
                   behaviours)      manthan-svelte
                                    manthan-angular
                                    plain HTML / any stack (via @manthan/base/dom)
```

| Repo | Package | What it is |
| --- | --- | --- |
| [manthan-base](https://github.com/tech-manthan/manthan-base) | `@manthan/base` | Tailwind theme + tokens, 11 styles, class recipes, framework-agnostic logic and DOM controllers, showcase |
| [manthan-icons](https://github.com/tech-manthan/manthan-icons) | `@manthan/icons` | 126 icons as data / SVG / sprite |
| [manthan-react](https://github.com/tech-manthan/manthan-react) | `@manthan/react` | React 19 components |
| [manthan-vue](https://github.com/tech-manthan/manthan-vue) | `@manthan/vue` | Vue 3.5 components |
| [manthan-svelte](https://github.com/tech-manthan/manthan-svelte) | `@manthan/svelte` | Svelte 5 (runes) components |
| [manthan-angular](https://github.com/tech-manthan/manthan-angular) | `@manthan/angular` | Angular 22 standalone, signal-based components |

## Design languages

Switch with one attribute on `<html>` (or on **any element** to scope it; styles can be mixed on one page):

```html
<html data-mn-style="glass" data-mn-theme="dark">
```

| `data-mn-style` | Style | Inspired by |
| --- | --- | --- |
| `default` | Crisp & neutral | Radix Themes, shadcn/ui, Linear |
| `glass` | Glassmorphism | visionOS, Liquid Glass, Windows 11 Mica |
| `neu` | Neumorphism / Soft UI | neumorphism.io |
| `brutal` | Neo-brutalism | Gumroad, neobrutalism.dev |
| `material` | Material 3 | Google Material Design 3 |
| `fluent` | Fluent 2 | Microsoft Fluent 2 |
| `clay` | Claymorphism | Michał Malewicz |
| `retro` | 8-bit pixel | NES.css |
| `neon` | Cyberpunk / synthwave (always dark) | Cyberpunk 2077 UI, Tron |
| `minimal` | Swiss / monochrome | Vercel Geist |
| `skeuo` | Skeuomorphic gloss | Mac OS X Aqua, iOS 6 |

`data-mn-theme` = `light` · `dark` · `system`. Tokens are written with CSS `light-dark()`, so a theme is only a `color-scheme` and `system` needs no JavaScript.

Run `npm run dev` for the live showcase (every component, every style, theme and brand-hue switcher).

## Install (Tailwind v4)

```bash
npm i @manthan/base @manthan/icons tailwindcss
```

```css
/* app.css */
@import 'tailwindcss';
@import '@manthan/base/theme.css';
```

Framework users import their binding's theme instead (for example `@manthan/react/theme.css`). It includes this file and tells Tailwind to scan the components.

### Plain HTML / htmx / Rails / Django / Laravel / Web Components

Use the recipes to produce classes, and `@manthan/base/dom` to add behaviour to server-rendered markup:

```js
import { autoInit, mountToaster } from '@manthan/base/dom';
import { toast } from '@manthan/base';

autoInit(); // wires menus, popovers, tooltips, dialogs, tabs, sliders, comboboxes, command palettes,
            // calendars, date pickers, toggle groups and [data-mn-hotkey] shortcuts
mountToaster();
toast.success('Saved');
```

### Web Components: `<mn-*>` elements for every other stack

For htmx, Rails, Django, Laravel, Phoenix, Astro, WordPress, Solid, Qwik, Lit or a static page:

```html
<script type="module">import '@manthan/base/elements/define';</script>

<form method="post">
  <mn-field label="Email" error="Required">
    <mn-input name="email" type="email" start-icon="mail"></mn-input>
  </mn-field>
  <mn-combobox name="framework" placeholder="Search…">
    <optgroup label="Server"><option value="rails">Rails</option><option value="django">Django</option></optgroup>
  </mn-combobox>
  <mn-date-picker name="start"></mn-date-picker>
  <mn-switch name="newsletter">Newsletter</mn-switch>
  <mn-button type="submit">Save</mn-button>
</form>

<mn-button data-mn-open="confirm" tone="danger">Delete</mn-button>
<mn-dialog id="confirm" heading="Delete project?">
  <div slot="footer"><mn-button data-mn-close>Cancel</mn-button></div>
</mn-dialog>
```

Elements render into the light DOM (no shadow root), so the Tailwind theme and your own classes apply. Each one wraps a native control, so forms submit, autofill and validate as usual. Events: `mn-change`, `mn-select`, `mn-open-change`, `mn-selection-change`.

| Group | Elements |
| --- | --- |
| Basics | `mn-button`, `mn-icon`, `mn-badge`, `mn-kbd`, `mn-card`, `mn-alert`, `mn-avatar`, `mn-progress`, `mn-spinner`, `mn-skeleton` |
| Forms | `mn-field`, `mn-input`, `mn-textarea`, `mn-select`, `mn-checkbox`, `mn-switch`, `mn-slider`, `mn-combobox`, `mn-date-picker`, `mn-calendar`, `mn-file-upload` |
| Overlays | `mn-dialog`, `mn-popover`, `mn-menu` (+ `mn-menu-item`, `mn-menu-label`, `mn-menu-separator`), `mn-tooltip`, `mn-toaster`, `mn-command-dialog` |
| Data | `mn-tabs` (+ `mn-tab`, `mn-tab-panel`), `mn-data-table` (+ `mn-column`, inline JSON or `el.rows = [...]`), `mn-chart` (+ `mn-series`, inline JSON or `el.data = [...]`) |

`showcase/elements.html` is a complete page written only in HTML.

### Forms and file uploads

```ts
import { createForm, rules } from '@manthan/base';

const form = createForm({
  initialValues: { email: '', password: '', confirm: '' },
  rules: {
    email: [rules.required(), rules.email()],
    password: [rules.required(), rules.minLength(8)],
    confirm: rules.matches('password', 'Passwords do not match.'),
  },
  onSubmit: async (values) => save(values),
});
form.field('email'); // { value, error, invalid, onInput, onBlur }
```

Errors show after a field is left or the form is submitted, and visited fields then re-check as you type. Rules can be async. React (`useForm`), Vue (`useForm`), Svelte (`useForm`) and Angular (`injectForm`) wrap the same store. For plain HTML, `bindForm(formElement, { rules, onSubmit })` validates an existing `<form>` and shows errors in `<mn-field>`.

`validateFiles`, `formatBytes` and `createDropzone` (drag and drop, click, keyboard, paste) drive the `FileUpload` component and `<mn-file-upload>`. The chosen files post with the form.

### Charts

```ts
import { createChart } from '@manthan/base/dom';

createChart(el, {
  type: 'bar', // 'line' | 'area' | 'bar' | 'donut'
  data: rows,
  x: 'month',
  series: [{ key: 'free', label: 'Free' }, { key: 'pro', label: 'Pro' }],
  stacked: true,
  title: 'Sign-ups by plan',
});
```

```html
<mn-chart type="line" x="month" label="Revenue">
  <mn-series key="revenue" label="Revenue"></mn-series>
  <script type="application/json">[{ "month": "Jan", "revenue": 31000 }]</script>
</mn-chart>
```

Charts follow the active style:

- Series colours come from `--mn-chart-1` … `--mn-chart-8`, a fixed palette checked for colour-vision deficiency in both light and dark mode.
- Styles re-map line weight, bar radius, area opacity, gridlines and glow (`--mn-chart-*`). For example, neon glows, brutal draws hard offset shadows, and retro uses a pixel font.
- Colour follows the series, not its position. Hiding a series keeps every other colour, and a ninth series falls back to "Other" rather than repeating a colour.

Each chart includes:

- a crosshair tooltip on line and area charts, and a per-category tooltip on bars and donut slices
- arrow-key navigation with a live region that reads out values
- a legend that toggles series
- direct line labels, dropped when they would collide
- a screen-reader data table

`buildChartScene()` is the pure layout engine behind all of this, and runs on the server too. `stat()` styles stat tiles (label, value, delta coloured by whether the change is good, sparkline). Every framework package wraps the same controller as `Chart` and `Stat`.

## How it is built: the best of each library

| Idea | Borrowed from | Where |
| --- | --- | --- |
| 12-step colour scales (bg → border → solid → text) | Radix Colors | `styles/tokens.css` (generated in OKLCH) |
| `tone-*`: any element re-points the accent scale | Radix Themes `accentColor` | `tone-primary … tone-danger` utilities |
| Variant recipes with slots + compound variants | cva, tailwind-variants, Panda CSS | `src/core/recipe.ts` |
| Own-your-classes Tailwind styling | shadcn/ui | every recipe is plain Tailwind, overridable with `class` |
| One logic core, thin framework adapters | Zag.js / Ark UI | `src/core` (pure) + `src/dom` (controllers) |
| Lean on the platform: `<dialog>`, Popover API, `<details name>`, native inputs, `appearance: base-select` | Open UI, Pico CSS | focus traps, top layer, light-dismiss and form support for free |
| CSS-only enter/exit animations | `@starting-style` + `transition-behavior` | `floatingMotion`, dialog recipe |
| Toast store with `promise()`, pause-on-hover, stable snapshots | Sonner, react-hot-toast | `src/core/toast.ts` |
| Command palette + ranked fuzzy-ish filtering | cmdk, Raycast | `src/core/options.ts`, `src/dom/combobox.ts` |
| Headless table maths (sort / search / paginate / select) | TanStack Table | `src/core/table.ts` |
| Calendar on plain ISO dates + Intl | React Aria `@internationalized/date`, Ark DatePicker | `src/core/calendar.ts` |
| Roving focus, typeahead, WAI-ARIA keyboard maps | React Aria, Radix | `src/core/keyboard.ts` |
| Flip / shift positioning | Floating UI | `src/core/position.ts` |
| Design tokens as CSS variables mapped into the framework | Open Props, daisyUI, HeroUI | `@theme inline` in `styles/theme.css` |
| Tree-shakeable icon data rendered per framework | Lucide | `@manthan/icons` |

## Architecture

```
styles/
  theme.css        entry: @theme inline mapping, variants (dark:, glass:, brutal: …), tone-* utilities
  tokens.css       generated OKLCH scales + default semantic tokens (scripts/gen-tokens.mjs)
  base.css         scopes, color-scheme, overlay safety, scroll lock
  components.css   slider / select picker / accordion (vendor pseudo-elements)
  styles/*.css     one file per design language: token overrides + a few targeted rules
src/
  core/            recipe engine, theme helpers, keyboard, positioning, pagination, range, toast store
  recipes/         component recipes → Tailwind class strings (single source of truth)
  dom/             popover, menu, tooltip, dialog, tabs controllers, vanilla toaster, autoInit
showcase/          Vite demo of everything
```

### Semantic tokens a style can re-map

| Group | Tokens |
| --- | --- |
| Canvas & text | `--mn-bg` `--mn-fg` `--mn-fg-muted` `--mn-fg-subtle` |
| Surfaces | `--mn-surface(-2/-3)` `--mn-surface-border` `--mn-surface-shadow` `--mn-surface-blur` |
| Floating | `--mn-popover` `--mn-popover-border` `--mn-popover-shadow` `--mn-tooltip(-fg)` `--mn-overlay(-blur)` |
| Controls | `--mn-control` `--mn-control-border` `--mn-control-shadow` `--mn-inset-shadow` `--mn-track` `--mn-thumb(-shadow)` |
| Buttons | `--mn-btn-shadow(-hover/-active)` `--mn-press-x/y/scale` `--mn-btn-weight/transform/tracking` |
| Shape | `--mn-radius-control/surface/item/field/badge/check/thumb` `--mn-border-width` `--mn-edge` |
| Brand | `--mn-primary-h/c` `--mn-success-h/c` … `--mn-solid-l` `--mn-on-accent` |
| Type & motion | `--mn-font-sans/heading/control/mono` `--mn-heading-*` `--mn-duration` `--mn-ease` |

Re-brand the whole library with one line: `:root { --mn-primary-h: 160; }`.

Create your own style:

```css
[data-mn-style='ocean'] {
  --mn-primary-h: 220;
  --mn-radius-control: 1rem;
  --mn-surface-shadow: 0 10px 30px -10px oklch(0.4 0.1 220 / 0.4);
}
```

## Components

Button, ButtonGroup, Badge, Avatar(+Group), Card, Kbd, Separator, Heading, Text, Link, Table, Input(+Group), Textarea, Select, Field, Checkbox, Radio(+Group), Switch, Slider, Tabs, Accordion, Breadcrumb, Pagination, Alert, Progress, ProgressCircle, Spinner, Skeleton, Dialog / Drawer, Popover, Tooltip, Menu, Toast.

**Advanced:** Combobox (filtering, groups, `aria-activedescendant`), Command palette (`⌘K`), Calendar (WAI-ARIA date grid, locale-aware week start, min/max/disabled dates), Date picker, Toggle group (single / multiple, roving focus), DataTable (sort, multi-term search, row selection, pagination; headless helpers `getTableView`, `sortRows`, `searchRows`, `paginateRows`, `toggleAll`), Charts (line, area, bar, donut, sparkline) and Stat tiles. Dates are plain ISO strings (`YYYY-MM-DD`).

```ts
import { button, card } from '@manthan/base';

button({ variant: 'soft', tone: 'danger', size: 'sm' }); // → class string
const c = card({ size: 'lg' });
c.root(); c.title('extra-class');
```

Pass `configure({ merge: twMerge })` to resolve conflicts when you add classes to a recipe.

## Development

Clone the repos side by side (they link with `file:` during development):

```bash
./scripts/bootstrap.sh   # clones missing siblings, installs and builds icons → base → bindings
npm run dev              # showcase
npm test                 # vitest (core + DOM controllers)
npm run typecheck
```

## License

MIT
