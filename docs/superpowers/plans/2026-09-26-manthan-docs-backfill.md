# Manthan Docs Site (Backfill) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every remaining Manthan UI component (36 doc pages, ~44 extractable prop interfaces, across React/Vue/Svelte/Angular) into `manthan-docs`, reusing the pipeline the pilot proved against Button/Input/Dialog/DataTable/Chart — plus the two pipeline extensions this backfill actually needs that the pilot's 5 components never exercised.

**Architecture:** Same pipeline as the pilot: `component-registry.ts` maps a slug to per-framework `{file, propsType}`, `scripts/extract-props` walks real TypeScript source into `PropDoc[]` JSON, `[slug].astro` renders a demo iframe + code sample + props table per framework. This plan adds exactly one new capability the pilot didn't need — **multi-component pages** (a family like Tabs has three separately-propped pieces: `Tabs`, `TabsTrigger`, `TabsContent` — the pilot's `ComponentSource`/`ComponentPropsDoc` shapes only ever held one interface per framework) — plus one adapter fix (React's `getInterface()` can't find a `type` alias, and `ToggleGroupProps` is one). Every other task is the pilot's own proven procedure, executed against real, already-verified file paths and type names — not rediscovered.

**Tech Stack:** Same as the pilot — Astro, `ts-morph`, `@vue/compiler-sfc`, Vite, Angular CLI, Vitest, TypeScript ~6.0.3.

**Spec:** `docs/superpowers/specs/2026-09-25-docs-site-design.md` (the pilot's spec — its pipeline design, data model, and two cross-cutting extraction rules still govern everything below except the two extensions this plan's own Tasks 1–2 add, which no prior spec covers because the pilot's 5 components never needed them).

**Already fixed during this plan's own research (commit `9d36df2`, 2026-09-26, before any wave task):** writing Task 3's originally-planned regression test surfaced a real, already-shipped bug — `resolveHeritage` walked an internal heritage target's *full apparent Type*, which flattens in that target's own inherited members even when THAT inheritance is external. Real case: `CheckboxProps extends ChoiceProps extends Omit<ComponentProps<'input'>, 'size' | 'type'>` — ChoiceProps is internal (correctly walked), but its own native-`<input>` heritage isn't, and the old code didn't re-check at that second hop: Checkbox's props table would have shipped with 309 native attribute/event-handler rows. Fixed by recursing — a plain-interface heritage target now resolves its own AST members plus `resolveHeritage` again on its own `extends` clauses, applying the internal/external rule at every hop, not just the outermost one; a type alias (which can't have an `extends` clause) is unchanged. Verified against all 5 pilot components' real output (byte-for-byte identical prop counts — none of them exercised the buggy path) and a new real-source regression test (`shared.test.ts`, the CheckboxProps case above). This is why Task 3 below is a confirmation, not new work, and why the Review Focus's ChoiceProps/DatePicker/CommandDialog risk is already closed rather than still open.

**Component inventory (verified against real source on 2026-09-26, not the pilot's day-one estimate):** All 4 frameworks have **full parity** — every component that exists in one exists in all four, confirmed by cross-referencing Vue's one-file-per-component layout (the canonical list) against React's and Angular's grouped files and Svelte's file names. After removing pass-through wrappers (components whose props are 100% native-element passthrough with no named interface — e.g. React's `CardHeader`, `TableRow`, `TabsList`, `MenuLabel`, `AvatarGroup`, `DialogClose` — these get a one-line mention in their page's prose, not a registry entry, matching the pilot's own treatment of native-attribute passthrough), the real count is **36 doc pages, 44 extractable interfaces**. The full list, with real verified React file/interface names (Vue/Svelte/Angular follow the same names via their own established conventions — one file per component for Vue/Svelte, `Mn<Name>` classes grouped by category for Angular, both confirmed against real source below), is in [Appendix: Full Component Table](#appendix-full-component-table).

## Global Constraints

- Everything the pilot's spec already states still applies: `Omit<X, K>` unwrapping before the internal/external check, the resolve-if-internal/note-if-external rule, two-way-bindable prefixing, TypeScript `~6.0.3`, `vitest ^5.0.1`.
- **New rule (this plan):** a registry entry's per-framework value may now be a single `{file, propsType, className}` (unchanged, existing shape) **or** an array of them, for a page documenting more than one real component (a "family page"). See Task 1.
- **New rule (this plan):** when a component's interesting props are expressed only as an anonymous inline type (not a named `interface` or `type` alias reachable by name) — confirmed to happen at least once, in `manthan-react/src/components/display.tsx`'s `Kbd` (`{ size, className, ...props }: ComponentProps<'kbd'> & { size?: 'sm' | 'md' }`, no name at all) — the task that wires that component gives it a real name first: `export type KbdProps = ComponentProps<'kbd'> & { size?: 'sm' | 'md' };` in the library source, then `Kbd({ ... }: KbdProps)`. This is a behavior-preserving rename, not a design change, and needs its own tiny commit in that framework's repo before the registry entry can point at anything. Any wave task that finds another instance of this shape applies the same fix and notes it in its own steps — don't assume Kbd is the only one; each task confirms by reading its real component's signature first (Global Constraint, not per-task boilerplate to repeat).
- Every wave task pins its exact file paths and interface/class names by reading the real source at the start of that task, the same convention the pilot's own spec used ("gets pinned with a fresh read of the real source at the start of that component's implementation task, not hand-verified here") — the tables in this plan give you the verified starting point, not a substitute for reading the file.
- New pages follow the pilot's category values already used in existing `.mdx` frontmatter (check `src/content/components/*.mdx` for the exact set in use — `Data Display`, etc. — before inventing a new one; add a new category only when no existing one fits).

## Review Focus

- **A multi-component page's extraction partially fails and the page silently ships with only one of its two-or-three prop tables.** Task 1's orchestrator change must fail the whole build the same way the pilot's Task 17 fix made a single-component failure fail the build — a family page's second or third component erroring out must not be swallowed. Task 1's tests cover this directly.
- **`ToggleGroupProps`'s discriminated union (`{ type?: 'single'; value?: string | null; ... } | { type: 'multiple'; value?: string[]; ... }`) collapses into a props table that looks plausible but is wrong** — e.g. `value`'s table row showing only one branch's type instead of the union of both, or the table silently missing `onValueChange` because ts-morph's `Type.getProperties()` on a union only returns properties present on every constituent by *name*, not always the exact merged type. Task 2's own test asserts the exact merged type text, not just that extraction doesn't throw.
- **CLOSED before any wave task, not just flagged:** a two-hop internal heritage chain (`CheckboxProps extends ChoiceProps extends Omit<ComponentProps<'input'>, ...>`) leaked 309 native attributes into Checkbox's table — real bug, found while researching this plan, already fixed (see "Already fixed" note above) and covered by a real-source regression test. `DatePickerProps extends CalendarProps` and `CommandDialogProps extends CommandProps` are the exact same shape (a component extending a sibling's own Props, which itself extends a native element) and are fixed by the same recursion, not a separate mechanism — Task 4 below confirms this with their own real values rather than assuming the Checkbox fix generalizes untested.
- **Checkbox/Switch's shared `ChoiceProps` is never `export`ed from `form.tsx`** — every prior heritage resolution the pilot tested was against an exported interface. `resolveHeritage`'s internal/external check only inspects the file *path* (`isInternalDeclaration`), never export status, so this was never actually at risk — confirmed by the same regression test that closed the bullet above (it reads `ChoiceProps`' members correctly). Task 3 is that confirmation, kept as its own task since "never exported" and "leaks through a second inheritance hop" are two independently-risky things about the exact same interface, not one.
- **A wave task's demo file for a multi-component page (Tabs, Accordion, Menu, ToggleGroup) only exercises the container, never triggering the sub-component's interactive behavior** — a `Tabs` demo that renders one static tab never proves `TabsTrigger`'s `disabled` prop or `TabsContent`'s conditional render actually work, silently shipping a demo that "looks like Tabs" without being a real usage example. Waves F–I's own Step (browser verification) requires interacting with the demo (switching tabs, opening the accordion item, opening the menu, clicking a toggle), not just loading the page — matching the pilot's Task 12/13/16 precedent of a full interactive check for its highest-complexity components.

---

## File structure

No new files or directories beyond what the pilot already created — this plan only adds rows to existing tables/registries and new per-component source/demo files following the pilot's own established per-file conventions:

```
manthan-docs/
  scripts/extract-props/
    types.ts                    # MODIFY: PropDoc/ComponentPropsDoc for multi-component pages (Task 1)
    index.ts                    # MODIFY: orchestrator loop handles array-valued registry entries (Task 1)
    react.ts                    # MODIFY: getTypeAlias() fallback + walkType export use (Task 2)
    shared.ts                   # MODIFY: export walkType (Task 2)
  src/
    data/component-registry.ts  # MODIFY: one new entry per page, 36 total (every wave task)
    content/components/*.mdx    # CREATE: one per page, 36 total (every wave task)
  # demo files: same one-file-per-component convention the pilot's demo-restructuring
  # established (manthan-react/demos/<slug>.demo.tsx, manthan-vue/demos/<Name>Demo.vue,
  # manthan-svelte/demos/<Name>Demo.svelte, manthan-angular/.../demos/<slug>-demo.ts),
  # wired into each framework's registry.tsx/registry.ts/demo.ts dispatcher — every wave task
```

---

### Task 1: Multi-component pages — data model, registry, orchestrator, and page rendering

**Files:**
- Modify: `manthan-docs/scripts/extract-props/types.ts`
- Modify: `manthan-docs/scripts/extract-props/index.ts`
- Modify: `manthan-docs/src/data/component-registry.ts`
- Modify: `manthan-docs/src/layouts/ComponentPage.astro`
- Test: `manthan-docs/scripts/extract-props/index.test.ts`

**Interfaces:**
- Produces: `ComponentSource`'s per-framework value becomes `FrameworkEntry | FrameworkEntry[]` where `FrameworkEntry = { file: string; propsType?: string; className?: string }` (the pilot's existing per-framework shape, now also valid as an array element). `ComponentPropsDoc`'s per-framework field becomes `PropDoc[] | NamedPropSection[]` where `NamedPropSection = { component: string; members: PropDoc[]; note?: string }`. Every wave task after this one uses this shape for any family page (Tabs, Accordion, Menu, ToggleGroup); every single-component page (the other 32) keeps using the plain `FrameworkEntry`/`PropDoc[]` shape unchanged — Task 1 must not touch any pilot page's existing JSON output.
- Consumes: nothing new — same four adapters (`extractReactProps`, `extractVueProps`, `extractSvelteProps`, `extractAngularProps`) as the pilot, called once per array element instead of once per framework.

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/extract-props/index.test.ts — add to the existing describe('runExtraction') block
it('extracts a family page: an array-valued framework entry produces a NamedPropSection[] keyed by component name', async () => {
  const registry: Record<string, ComponentSource> = {
    tabs: {
      react: [
        { file: 'tabs.tsx', propsType: 'TabsProps' },
        { file: 'tabs.tsx', propsType: 'TabsTriggerProps' },
      ],
    },
  };
  const calls: string[] = [];
  const writes: Record<string, unknown> = {};
  await runExtraction(
    registry,
    {
      react: (file: string, typeName: string) => {
        calls.push(typeName);
        return { members: [{ name: typeName, type: 'string', required: false }] };
      },
    } as any,
    (slug, doc) => {
      writes[slug] = doc;
    },
  );
  expect(calls).toEqual(['TabsProps', 'TabsTriggerProps']);
  expect(writes.tabs).toEqual({
    slug: 'tabs',
    react: [
      { component: 'TabsProps', members: [{ name: 'TabsProps', type: 'string', required: false }] },
      { component: 'TabsTriggerProps', members: [{ name: 'TabsTriggerProps', type: 'string', required: false }] },
    ],
  });
});

it('a family page still fails the whole build if any one of its components errors (Review Focus: no silent partial page)', async () => {
  const registry: Record<string, ComponentSource> = {
    tabs: {
      react: [
        { file: 'tabs.tsx', propsType: 'TabsProps' },
        { file: 'tabs.tsx', propsType: 'Missing' },
      ],
    },
  };
  await expect(
    runExtraction(
      registry,
      {
        react: (_file: string, typeName: string) => {
          if (typeName === 'Missing') throw new Error('boom');
          return { members: [{ name: 'x', type: 'string', required: false }] };
        },
      } as any,
      () => {},
    ),
  ).rejects.toThrow(/tabs.*react.*boom/is);
});

it('a family page still fails the whole build if any one of its components resolves to zero props', async () => {
  const registry: Record<string, ComponentSource> = {
    tabs: {
      react: [
        { file: 'tabs.tsx', propsType: 'TabsProps' },
        { file: 'tabs.tsx', propsType: 'TabsTriggerProps' },
      ],
    },
  };
  await expect(
    runExtraction(
      registry,
      { react: () => ({ members: [] }) } as any,
      () => {},
    ),
  ).rejects.toThrow(/tabs.*react.*zero props/is);
});

it('a single-component page (the pilot shape) still produces a plain PropDoc[], unchanged', async () => {
  const registry: Record<string, ComponentSource> = { button: { react: { file: 'a.tsx', propsType: 'ButtonProps' } } };
  const writes: Record<string, unknown> = {};
  await runExtraction(
    registry,
    { react: () => ({ members: [{ name: 'loading', type: 'boolean', required: false }] }) } as any,
    (slug, doc) => {
      writes[slug] = doc;
    },
  );
  expect(writes.button).toEqual({ slug: 'button', react: [{ name: 'loading', type: 'boolean', required: false }] });
});

it('derives a family section\'s component label from the file basename when propsType/className is absent (real case: Wave D\'s Vue radio entries omit propsType, matching the pilot\'s own "only needed to disambiguate" convention)', async () => {
  const registry: Record<string, ComponentSource> = {
    radio: { vue: [{ file: '../manthan-vue/src/components/RadioGroup.vue' }, { file: '../manthan-vue/src/components/Radio.vue' }] },
  };
  const writes: Record<string, unknown> = {};
  await runExtraction(
    registry,
    { vue: (file: string) => ({ members: [{ name: 'x', type: 'string', required: false }] }) } as any,
    (slug, doc) => {
      writes[slug] = doc;
    },
  );
  expect((writes.radio as any).vue.map((s: any) => s.component)).toEqual(['RadioGroup', 'Radio']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/extract-props/index.test.ts`
Expected: the first three new tests FAIL (array-valued entries aren't handled yet — `source.react.file` is `undefined` on an array, `run()` throws or misbehaves), and the fifth (basename-label) FAILs the same way; the fourth (unchanged pilot shape) still PASSes, since Task 1 must not break it.

- [ ] **Step 3: Extend the data model**

```ts
// scripts/extract-props/types.ts
export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

// One named component's props within a family page (Tabs page → TabsProps,
// TabsTriggerProps, TabsContentProps each become one section).
export interface NamedPropSection {
  component: string;
  members: PropDoc[];
  note?: string;
}

export interface ComponentPropsDoc {
  slug: string;
  react?: PropDoc[] | NamedPropSection[];
  vue?: PropDoc[] | NamedPropSection[];
  svelte?: PropDoc[] | NamedPropSection[];
  angular?: PropDoc[] | NamedPropSection[];
  reactNote?: string;
  vueNote?: string;
  svelteNote?: string;
  angularNote?: string;
}
```

```ts
// src/data/component-registry.ts — extend the existing ComponentSource interface
export interface ReactEntry {
  file: string;
  propsType: string;
}
export interface VueEntry {
  file: string;
  propsType?: string;
}
export interface SvelteEntry {
  file: string;
  propsType: string;
}
export interface AngularEntry {
  file: string;
  className: string;
}

export interface ComponentSource {
  react?: ReactEntry | ReactEntry[];
  vue?: VueEntry | VueEntry[];
  svelte?: SvelteEntry | SvelteEntry[];
  angular?: AngularEntry | AngularEntry[];
}
```

Keep every existing `componentRegistry` entry (button, input, dialog, data-table, chart) exactly as it is — they're already valid under the widened type (a single object is still a valid `ReactEntry`, just not wrapped in an array).

- [ ] **Step 4: Rewrite the orchestrator to handle both shapes**

```ts
// scripts/extract-props/index.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractAngularProps } from './angular';
import { extractReactProps } from './react';
import { extractSvelteProps } from './svelte';
import { extractVueProps } from './vue';
import type { ComponentPropsDoc, NamedPropSection } from './types';
import { componentRegistry, type ComponentSource } from '../../src/data/component-registry';

type AdapterResult = { members: unknown[]; note?: string };
type Adapters = {
  react: (file: string, typeName: string) => AdapterResult;
  vue: (file: string, propsType?: string) => AdapterResult;
  svelte: (file: string, propsType: string) => AdapterResult;
  angular: (file: string, className: string) => AdapterResult;
};

export async function runExtraction(
  registry: Record<string, ComponentSource>,
  adapters: Adapters,
  write: (slug: string, doc: ComponentPropsDoc) => void,
): Promise<void> {
  for (const [slug, source] of Object.entries(registry)) {
    const doc: ComponentPropsDoc = { slug };

    // Each individual (framework, component) extraction is caught and
    // zero-checked on its own — a family page's second or third component
    // failing must fail the whole build exactly like a single-component
    // page's only component failing does (Review Focus: no silent partial
    // family page).
    const run = (framework: string, label: string, fn: () => AdapterResult): AdapterResult => {
      let result: AdapterResult;
      try {
        result = fn();
      } catch (err) {
        throw new Error(`Extraction failed for "${slug}" (${framework}${label ? `/${label}` : ''}): ${(err as Error).message}`, { cause: err });
      }
      if (result.members.length === 0) {
        throw new Error(`Extraction failed for "${slug}" (${framework}${label ? `/${label}` : ''}): adapter returned zero props — check the registry's file/type name`);
      }
      return result;
    };

    const frameworks = [
      ['react', source.react, (e: { file: string; propsType: string }) => adapters.react(e.file, e.propsType)],
      ['vue', source.vue, (e: { file: string; propsType?: string }) => adapters.vue(e.file, e.propsType)],
      ['svelte', source.svelte, (e: { file: string; propsType: string }) => adapters.svelte(e.file, e.propsType)],
      ['angular', source.angular, (e: { file: string; className: string }) => adapters.angular(e.file, e.className)],
    ] as const;

    for (const [framework, entry, call] of frameworks) {
      if (!entry) continue;
      if (Array.isArray(entry)) {
        const sections: NamedPropSection[] = [];
        const notes: string[] = [];
        for (const e of entry) {
          // Vue entries may omit propsType entirely (it's only needed to
          // disambiguate multiple types in scope — most components don't
          // need it, pilot precedent). Fall back to the file's own basename,
          // which is already the component's PascalCase name by convention
          // (RadioGroup.vue → "RadioGroup") for every framework's file layout.
          const label =
            ('propsType' in e && e.propsType) ||
            ('className' in e && (e as { className: string }).className) ||
            e.file.replace(/^.*\//, '').replace(/\.(vue|svelte|tsx?|ts)$/, '');
          const r = run(framework, label, () => call(e as never));
          sections.push({ component: label, members: r.members as NamedPropSection['members'], ...(r.note ? { note: r.note } : {}) });
          if (r.note) notes.push(r.note);
        }
        (doc as Record<string, unknown>)[framework] = sections;
        if (notes[0]) (doc as Record<string, string>)[`${framework}Note`] = notes[0];
      } else {
        const r = run(framework, '', () => call(entry as never));
        (doc as Record<string, unknown>)[framework] = r.members;
        if (r.note) (doc as Record<string, string>)[`${framework}Note`] = r.note;
      }
    }
    write(slug, doc);
  }
}

async function main() {
  mkdirSync('src/data/props', { recursive: true });
  await runExtraction(
    componentRegistry,
    { react: extractReactProps, vue: extractVueProps, svelte: extractSvelteProps, angular: extractAngularProps },
    (slug, doc) => {
      writeFileSync(`src/data/props/${slug}.json`, JSON.stringify(doc, null, 2) + '\n');
    },
  );
  console.log(`Extracted props for ${Object.keys(componentRegistry).length} component(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run scripts/extract-props/index.test.ts`
Expected: PASS (8/8 — the 3 existing tests plus the 5 above).

- [ ] **Step 6: Update `ComponentPage.astro` to render one or many prop tables per framework**

```astro
---
// src/layouts/ComponentPage.astro — replace the existing props-table block
import type { NamedPropSection, PropDoc } from '../../scripts/extract-props/types';

function isFamilyPage(value: PropDoc[] | NamedPropSection[] | undefined): value is NamedPropSection[] {
  return Array.isArray(value) && value.length > 0 && 'component' in value[0];
}
---
```

Replace the existing single `<table>` block (the one mapping `(propsDoc[fw] as PropDoc[]).map(...)`) with:

```astro
{propsDoc[fw] && isFamilyPage(propsDoc[fw]) ? (
  (propsDoc[fw] as NamedPropSection[]).map((section) => (
    <>
      <h3>{section.component}</h3>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          {section.members.map((p) => (
            <tr><td>{p.name}</td><td><code>{p.type}</code></td><td>{p.required ? 'Yes' : 'No'}</td><td>{p.default ?? '—'}</td><td>{p.description ?? ''}</td></tr>
          ))}
        </tbody>
      </table>
      {section.note && <p><em>{section.note}</em></p>}
    </>
  ))
) : propsDoc[fw] && (
  <table>
    <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
    <tbody>
      {(propsDoc[fw] as PropDoc[]).map((p) => (
        <tr><td>{p.name}</td><td><code>{p.type}</code></td><td>{p.required ? 'Yes' : 'No'}</td><td>{p.default ?? '—'}</td><td>{p.description ?? ''}</td></tr>
      ))}
    </tbody>
  </table>
)}
```

- [ ] **Step 7: Verify against a real pilot page (regression) and typecheck**

```bash
npm run extract-props
npm run typecheck
npx tsx scripts/check-consistency.ts
npm run build
```
Expected: all four exit 0; `dist/components/button/index.html` (and the other 4 pilot pages) render exactly as before — Task 1 changed the code path but not the output shape for any single-component page.

- [ ] **Step 8: Commit**

```bash
cd manthan-docs
git add scripts/extract-props/types.ts scripts/extract-props/index.ts scripts/extract-props/index.test.ts src/data/component-registry.ts src/layouts/ComponentPage.astro
git commit -m "feat: support multi-component (family) pages in the props pipeline"
git push origin main
```

---

### Task 2: React adapter — resolve a `type` alias, not just an `interface` (unblocks ToggleGroup)

**Files:**
- Modify: `manthan-docs/scripts/extract-props/shared.ts` (export `walkType`)
- Modify: `manthan-docs/scripts/extract-props/react.ts`
- Test: `manthan-docs/scripts/extract-props/react.test.ts`

**Interfaces:**
- Produces: `extractReactPropsFromProject` now succeeds for a `typeName` that resolves to either an `interface` (existing behavior, unchanged) or a `type` alias (new) — including one whose value is an intersection of an `Omit<...>` and a parenthesized union, which is `ToggleGroupProps`'s real shape (verified 2026-09-26, `manthan-react/src/components/advanced.tsx:474-486`: `type ToggleGroupBase = Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & { variant?: ...; size?: ...; tone?: ...; orientation?: ...; disabled?: ... }`, then `export type ToggleGroupProps = ToggleGroupBase & ({ type?: 'single'; value?: string | null; defaultValue?: string | null; onValueChange?: (value: string | null) => void } | { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void })`).
- Consumes: `shared.ts`'s existing `walkType(type: Type, contextNode: Node): PropDoc[]` (already correct — it resolves each property via `symbol.getTypeAtLocation(contextNode)`, which is exactly what a TypeScript intersection-of-union's merged apparent type needs; it was private because nothing outside `resolveHeritage` had needed it yet).

- [ ] **Step 1: Write the failing test**

```ts
// scripts/extract-props/react.test.ts — add to the existing describe('extractReactPropsFromProject') block
it('resolves a type alias (not just an interface), including an intersection-of-union shape (regression: real ToggleGroupProps)', () => {
  const project = new Project({ tsConfigFilePath: `${process.cwd()}/../manthan-react/tsconfig.json` });
  const result = extractReactPropsFromProject(project, `${process.cwd()}/../manthan-react/src/components/advanced.tsx`, 'ToggleGroupProps');
  const byName = new Map(result.members.map((m) => [m.name, m]));
  // From ToggleGroupBase (the intersection's object-literal half):
  expect(byName.get('variant')).toEqual({ name: 'variant', type: "'segmented' | 'outline' | 'ghost'", required: false });
  expect(byName.get('orientation')).toEqual({ name: 'orientation', type: "'horizontal' | 'vertical'", required: false });
  // From the discriminated union half — both branches merged:
  expect(byName.get('type')).toBeDefined();
  expect(byName.get('type')!.type).toContain('single');
  expect(byName.get('type')!.type).toContain('multiple');
  expect(byName.get('value')).toBeDefined();
  // Native <div> attributes from Omit<ComponentProps<'div'>, ...> are external — not enumerated:
  expect(byName.has('onClick')).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/extract-props/react.test.ts`
Expected: FAIL with `React adapter: interface "ToggleGroupProps" not found in .../advanced.tsx` — `getInterface()` never finds a `type` alias.

- [ ] **Step 3: Export `walkType` from `shared.ts`**

```ts
// scripts/extract-props/shared.ts — change the existing `function walkType` to `export function walkType`
```
(No other change in `shared.ts` — `walkType`'s own logic is already correct for this shape; only its visibility changes.)

- [ ] **Step 4: Add the `type`-alias fallback in `react.ts`**

```ts
// scripts/extract-props/react.ts
import { Project } from 'ts-morph';
import { resolveHeritage, walkInterfaceMembers, walkType } from './shared';
import type { PropDoc } from './types';

export function extractReactPropsFromProject(
  project: Project,
  file: string,
  typeName: string,
): { members: PropDoc[]; note?: string } {
  const source = project.getSourceFileOrThrow(file);
  const iface = source.getInterface(typeName);
  if (iface) {
    const own = walkInterfaceMembers(iface);
    const notes: string[] = [];
    const inherited: PropDoc[] = [];
    for (const heritage of iface.getExtends()) {
      const { members, note } = resolveHeritage(heritage);
      inherited.push(...members);
      if (note) notes.push(note);
    }
    return { members: [...inherited, ...own], note: notes[0] };
  }

  // Not an interface — try a type alias next (e.g. `export type ToggleGroupProps
  // = ToggleGroupBase & (...)`). walkType on the alias's own resolved Type
  // already handles an intersection-of-union correctly: TypeScript's checker
  // flattens `A & (B | C)` into the union of `(A&B)`/`(A&C)`'s apparent
  // members when you ask for `.getProperties()`, which is exactly what
  // walkType does — no new resolution logic needed, just a new entry point.
  const alias = source.getTypeAlias(typeName);
  if (alias) {
    return { members: walkType(alias.getType(), alias) };
  }

  throw new Error(`React adapter: interface "${typeName}" not found in ${file}`);
}

export function extractReactProps(file: string, typeName: string): { members: PropDoc[]; note?: string } {
  let cachedProject: Project | undefined;
  cachedProject ??= new Project({ tsConfigFilePath: `${process.cwd()}/../manthan-react/tsconfig.json` });
  return extractReactPropsFromProject(cachedProject, file, typeName);
}
```

Note: keep the real `extractReactProps` in the actual file as it already exists post-pilot (with the module-level `cachedProject` cache from the final review's fix pass) — the snippet above shows the changed `extractReactPropsFromProject` in full; don't remove the existing caching.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run scripts/extract-props/react.test.ts`
Expected: PASS. Then run the full suite: `npx vitest run` — expect all prior tests still pass (this change only adds a fallback path; the `interface` branch is untouched).

- [ ] **Step 6: Commit**

```bash
cd manthan-docs
git add scripts/extract-props/shared.ts scripts/extract-props/react.ts scripts/extract-props/react.test.ts
git commit -m "fix: React adapter resolves a type alias, not just an interface (unblocks ToggleGroup)"
git push origin main
```

---

### Task 3: Confirm `ChoiceProps` at the full-pipeline level (`extractReactPropsFromProject`, not just `resolveHeritage`)

**Already substantially covered:** the "Already fixed" note above and `shared.test.ts`'s new `resolveHeritage`-level test already prove `ChoiceProps`' un-exported status doesn't matter and that it no longer leaks native `<input>` attributes. This task adds one real-pipeline-level test through the actual entry point every wave task calls (`extractReactPropsFromProject`, not the lower-level `resolveHeritage`), confirming `CheckboxProps`' *own* members (`indeterminate`, `onCheckedChange`) merge correctly with `ChoiceProps`' inherited ones end to end — a different layer than the already-shipped test, not a duplicate of it.

**Files:**
- Test: `manthan-docs/scripts/extract-props/react.test.ts`

**Interfaces:**
- Consumes: `extractReactPropsFromProject` (already fixed, via `shared.ts`'s `resolveHeritage` — see above).

- [ ] **Step 1: Write the test against real, already-known values**

```ts
// scripts/extract-props/react.test.ts
it('CheckboxProps\' own members merge with its inherited (unexported) ChoiceProps members, with no native leak, through the full extractReactPropsFromProject entry point (regression: real Checkbox — see shared.test.ts for the underlying resolveHeritage fix)', () => {
  const project = new Project({ tsConfigFilePath: `${process.cwd()}/../manthan-react/tsconfig.json` });
  const result = extractReactPropsFromProject(project, `${process.cwd()}/../manthan-react/src/components/form.tsx`, 'CheckboxProps');
  const byName = new Map(result.members.map((m) => [m.name, m]));
  expect(byName.get('indeterminate')).toEqual({ name: 'indeterminate', type: 'boolean', required: false });
  expect(byName.get('onCheckedChange')).toEqual({ name: 'onCheckedChange', type: '(checked: boolean) => void', required: false });
  expect(byName.get('size')).toBeDefined();
  expect(byName.get('tone')).toBeDefined();
  expect(byName.get('label')).toBeDefined();
  expect(byName.get('description')).toBeDefined();
  expect(result.members.length).toBeLessThan(10);
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run scripts/extract-props/react.test.ts`
Expected: PASS — no code change expected, this confirms the already-shipped `shared.ts` fix through the higher-level entry point. If it FAILS, the two layers disagree; stop and use superpowers:systematic-debugging before any wave task depends on Checkbox/Switch.

- [ ] **Step 3: Commit**

```bash
cd manthan-docs
git add scripts/extract-props/react.test.ts
git commit -m "test: confirm CheckboxProps/ChoiceProps at the full extractReactPropsFromProject level"
git push origin main
```

---

### Task 4: Confirm the same fix covers a component extending a sibling component's own Props (`DatePickerProps extends CalendarProps`, `CommandDialogProps extends CommandProps`)

**Already fixed by the same mechanism as Task 3** — this task exists because "the fix generalizes" is a claim, and this plan doesn't ship claims without a real-source test proving them, per this plan's own Global Constraints.

**Files:**
- Test: `manthan-docs/scripts/extract-props/react.test.ts`

**Interfaces:**
- Consumes: `extractReactPropsFromProject` (no change expected, same as Task 3).

- [ ] **Step 1: Write the test against real source**

```ts
// scripts/extract-props/react.test.ts
it('resolves an extends reference to a sibling component\'s own Props in the same file, with no native leak (regression: real DatePickerProps extends CalendarProps extends Omit<ComponentProps<\'div\'>, ...>)', () => {
  const project = new Project({ tsConfigFilePath: `${process.cwd()}/../manthan-react/tsconfig.json` });
  const calendar = extractReactPropsFromProject(project, `${process.cwd()}/../manthan-react/src/components/advanced.tsx`, 'CalendarProps');
  const datePicker = extractReactPropsFromProject(project, `${process.cwd()}/../manthan-react/src/components/advanced.tsx`, 'DatePickerProps');
  const calendarNames = new Set(calendar.members.map((m) => m.name));
  const datePickerNames = new Set(datePicker.members.map((m) => m.name));
  // DatePickerProps extends Omit<CalendarProps, 'autoFocus' | 'className'> — every
  // CalendarProps member except autoFocus should be present on DatePicker too
  // (className is excluded from this check: DatePickerProps separately
  // re-declares its OWN `className?: string` as an own member — real source,
  // confirmed by reading advanced.tsx:394-403 — so it's genuinely present on
  // DatePicker for a different reason than inheriting Calendar's, which is
  // itself never enumerated anyway since it's external/native).
  for (const name of calendarNames) {
    if (name === 'autoFocus') continue;
    expect(datePickerNames.has(name)).toBe(true);
  }
  expect(datePickerNames.has('autoFocus')).toBe(false);
  expect(datePickerNames.has('className')).toBe(true);
  // Neither table contains a native <div> attribute (onClick, etc.) leaked
  // from CalendarProps' own `extends Omit<ComponentProps<'div'>, ...>`.
  expect(calendarNames.has('onClick')).toBe(false);
  expect(datePickerNames.has('onClick')).toBe(false);
  expect(calendar.members.length).toBe(11);
  expect(datePicker.members.length).toBe(17);
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run scripts/extract-props/react.test.ts`
Expected: PASS — the already-shipped fix recurses at every internal `extends` hop regardless of whether the target is a shared base type (`ChoiceProps`, Task 3) or a sibling component's own Props (`CalendarProps`, this task); nothing framework-specific to "sibling" makes it a different code path. If it FAILS, stop and debug before Wave E — the fix may not generalize as expected and needs its own look, not an assumption.

- [ ] **Step 3: Commit**

```bash
cd manthan-docs
git add scripts/extract-props/react.test.ts
git commit -m "test: regression coverage for a component extending a sibling's own Props"
git push origin main
```

---

## Wave tasks: the backfill itself

Every wave task below follows the exact procedure the pilot's Tasks 13–16 already proved, unchanged:

1. Add the registry entry (`src/data/component-registry.ts`) — pin exact file paths and interface/class names by reading the real source first (the tables below are the verified 2026-09-26 starting point).
2. Write the `.mdx` file (`src/content/components/<slug>.mdx`) — title/slug/category/description frontmatter, one or two sentences of real prose (not filler).
3. Wire a demo file in each of the four framework repos, following the pilot's now-established one-file-per-component convention (`manthan-react/demos/<slug>.demo.tsx`, `manthan-vue/demos/<Name>Demo.vue`, `manthan-svelte/demos/<Name>Demo.svelte`, `manthan-angular/projects/playground/src/demos/<slug>-demo.ts`), and register it in that framework's dispatcher (`registry.tsx`/`registry.ts`/`registry.ts`/`demo.ts`).
4. `npm run extract-props`, inspect `src/data/props/<slug>.json`, confirm every expected prop is present with a readable type.
5. `npx tsx scripts/check-consistency.ts`, `npm run typecheck`, `npm run build` — all exit 0.
6. Commit each touched repo separately (matching the pilot's per-repo commit convention), push.
7. For Waves A–E: `astro dev` + load the page once, confirm all four iframes render. For Waves F–I (multi-component pages): the fuller interactive check the Review Focus section requires — actually switch tabs / open the accordion item / open the menu / click a toggle in each of the four iframes, not just load the page.

**Sequencing rationale:** trivial single-interface components first (build momentum, and any adapter surprise shows up cheaply); the two same-file-extends families next (D, E — already de-risked by Tasks 3–4's regression tests); multi-component families last (F–I — the highest-complexity, newest-capability pages, in ascending order of how many sub-components they carry, with ToggleGroup dead last since it also needs Task 2's type-alias fix).

### Wave A: Simple single-interface components, batch 1 (Badge, Avatar, Separator, Heading, Spinner, Skeleton)

**Files:** `component-registry.ts`, 6 new `.mdx` files, 6×4 demo files (as listed in the shared procedure above).

**Registry data (verified 2026-09-26):**

| slug | React `file` / `propsType` | Vue `file` | Svelte `file` / `propsType` | Angular `file` / `className` |
|---|---|---|---|---|
| badge | `../manthan-react/src/components/display.tsx` / `BadgeProps` | `../manthan-vue/src/components/Badge.vue` | `../manthan-svelte/src/lib/components/Badge.svelte` / `Props` | `../manthan-angular/projects/manthan/src/lib/display.ts` / `MnBadge` |
| avatar | `display.tsx` / `AvatarProps` | `Avatar.vue` | `Avatar.svelte` / `Props` | `display.ts` / `MnAvatar` |
| separator | `display.tsx` / `SeparatorProps` | `Separator.vue` | `Separator.svelte` / `Props` | `display.ts` / `MnSeparator` |
| heading | `display.tsx` / `HeadingProps` | `Heading.vue` | `Heading.svelte` / `Props` | `display.ts` / `MnHeading` |
| spinner | `feedback.tsx` / `SpinnerProps` | `Spinner.vue` | `Spinner.svelte` / `Props` | `feedback.ts` / `MnSpinner` |
| skeleton | `feedback.tsx` / `SkeletonProps` | `Skeleton.vue` | `Skeleton.svelte` / `Props` | `feedback.ts` / `MnSkeleton` |

(React/Angular paths above are relative to `manthan-docs/`, same as every pilot entry — e.g. badge's real react `file` value is `../manthan-react/src/components/display.tsx`. Vue/Svelte paths follow the pilot's own established `../manthan-vue/src/components/<Name>.vue` / `../manthan-svelte/src/lib/components/<Name>.svelte` pattern.)

**AvatarGroup note:** React's `AvatarGroup` has no named props interface (`ComponentProps<'div'>` inline) — don't give it a registry entry; mention it in `avatar.mdx`'s prose ("wrap multiple `Avatar`s in `AvatarGroup`, which accepts standard `<div>` attributes").

- [ ] **Step 1–7:** per the shared procedure above, for all 6 components. Category: `Display` for badge/avatar/separator/heading (check existing `.mdx` category values first — reuse if a matching one already exists), `Feedback` for spinner/skeleton.
- [ ] **Step 8: Commit** each of the 5 repos touched (manthan-docs, manthan-react, manthan-vue, manthan-svelte, manthan-angular), one commit per repo, message: `feat: wire up Badge, Avatar, Separator, Heading, Spinner, Skeleton demos`.

### Wave B: Simple single-interface components, batch 2 (Alert, Progress, ProgressCircle, Icon, ButtonGroup, Stat)

**Registry data (verified 2026-09-26):**

| slug | React `file` / `propsType` | Angular `file` / `className` |
|---|---|---|
| alert | `feedback.tsx` / `AlertProps` | `feedback.ts` / `MnAlert` |
| progress | `feedback.tsx` / `ProgressProps` | `feedback.ts` / `MnProgress` |
| progress-circle | `feedback.tsx` / `ProgressCircleProps` | `feedback.ts` / `MnProgressCircle` |
| icon | `icon.tsx` / `IconProps` | `icon.ts` / `MnIcon` |
| button-group | `button.tsx` / `ButtonGroupProps` | `button.ts` / `MnButtonGroup` |
| stat | `chart.tsx` / `StatProps` | `chart.ts` / `MnStat` |

(Vue/Svelte: `Alert.vue`/`.svelte`, `Progress.vue`/`.svelte`, `ProgressCircle.vue`/`.svelte`, `Icon.vue`/`.svelte`, `ButtonGroup.vue`/`.svelte`, `Stat.vue`/`.svelte`, same directories as Wave A — confirm each exists with `ls` before writing the registry entry, since Icon in particular may have a different real prop shape worth reading first given it likely takes the icon-name union type from `@manthan/icons`.)

- [ ] **Step 1–7:** per the shared procedure. `button-group` and `stat` demos can live on the same page as Button/Chart if that reads better, or their own page — pick one and note the choice in the commit message; either is a reasonable Content/data-drift-free deviation from "one slug = new page" as long as `check-consistency.ts` still passes.
- [ ] **Step 8: Commit**, same pattern as Wave A.

### Wave C: Field/Form components (Field, Textarea, Select, Slider, FileUpload)

**Registry data (verified 2026-09-26):**

| slug | React `file` / `propsType` | Angular `file` / `className` |
|---|---|---|
| field | `form.tsx` / `FieldProps` | `form.ts` / `MnField` |
| textarea | `form.tsx` / `TextareaProps` | `form.ts` / `MnTextarea` |
| select | `form.tsx` / `SelectProps` (note: `SelectOption` is a `type`, not a component — don't register it, mention it in prose as the shape of `options`) | `form.ts` / `MnSelect` |
| slider | `form.tsx` / `SliderProps` | `form.ts` / `MnSlider` |
| file-upload | `file-upload.tsx` / `FileUploadProps` | `forms-files.ts` / `MnFileUpload` |

- [ ] **Step 1–7:** per the shared procedure. Category: `Forms`.
- [ ] **Step 8: Commit**, same pattern.

### Wave D: Choice components — Checkbox, Switch, RadioGroup + Radio (shared `ChoiceProps` base)

**Registry data (verified 2026-09-26):**

| slug | React `file` / `propsType` | Angular `file` / `className` |
|---|---|---|
| checkbox | `form.tsx` / `CheckboxProps` | `form.ts` / `MnCheckbox` |
| switch | `form.tsx` / `SwitchProps` | `form.ts` / `MnSwitch` |
| radio | `form.tsx` / `RadioGroupProps` **and** `form.tsx` / `RadioProps` (two real interfaces — one page, array-valued registry entry, Task 1's new shape) | `form.ts` / `MnRadioGroup` **and** `MnRadio` |

- [ ] **Step 1: Write `radio`'s registry entry using Task 1's array shape**

```ts
// src/data/component-registry.ts
radio: {
  react: [
    { file: '../manthan-react/src/components/form.tsx', propsType: 'RadioGroupProps' },
    { file: '../manthan-react/src/components/form.tsx', propsType: 'RadioProps' },
  ],
  vue: [
    { file: '../manthan-vue/src/components/RadioGroup.vue' },
    { file: '../manthan-vue/src/components/Radio.vue' },
  ],
  svelte: [
    { file: '../manthan-svelte/src/lib/components/RadioGroup.svelte', propsType: 'Props' },
    { file: '../manthan-svelte/src/lib/components/Radio.svelte', propsType: 'Props' },
  ],
  angular: [
    { file: '../manthan-angular/projects/manthan/src/lib/form.ts', className: 'MnRadioGroup' },
    { file: '../manthan-angular/projects/manthan/src/lib/form.ts', className: 'MnRadio' },
  ],
},
```
(Confirmed by Task 3's regression test that `ChoiceProps` resolves correctly under Checkbox — apply the same trust to Switch/Radio's identical `extends ChoiceProps` shape, but still read each real file before wiring, per the Global Constraint.)

- [ ] **Steps 2–7:** rest of the shared procedure for all three pages (checkbox, switch, radio). Category: `Forms`.
- [ ] **Step 8: Commit.**

### Wave E: Calendar + DatePicker, Command + CommandDialog (sibling-extends families)

**Registry data (verified 2026-09-26):**

| slug | React `file` / `propsType`(s) | Angular `file` / `className`(es) |
|---|---|---|
| calendar | `advanced.tsx` / `CalendarProps` | `advanced.ts` / `MnCalendar` |
| date-picker | `advanced.tsx` / `DatePickerProps` | `advanced.ts` / `MnDatePicker` |
| command | `advanced.tsx` / `CommandProps` **and** `CommandDialogProps` (one page, array-valued, same pattern as Wave D's radio) | `advanced.ts` / `MnCommand` **and** `MnCommandDialog` |

- [ ] **Step 1–7:** per the shared procedure — `command`'s registry entry uses the array shape exactly as Wave D's `radio` example shows, substituting `CommandProps`/`CommandDialogProps`/`MnCommand`/`MnCommandDialog`. `calendar` and `date-picker` are separate pages (each a single real interface, `DatePickerProps` resolving its inherited members per Task 4's regression test). Category: `Overlays` or `Forms` — check existing categories, `Calendar`/`DatePicker` likely fit best under whichever category Dialog/Popover use.
- [ ] **Step 8: Commit.**

### Wave F: Tabs (Tabs + TabsTrigger + TabsContent — first multi-component page)

**Registry data (verified 2026-09-26):** `TabsList` has no named props (pass-through) — mention it in prose, don't register it.

```ts
// src/data/component-registry.ts
tabs: {
  react: [
    { file: '../manthan-react/src/components/navigation.tsx', propsType: 'TabsProps' },
    { file: '../manthan-react/src/components/navigation.tsx', propsType: 'TabsTriggerProps' },
    { file: '../manthan-react/src/components/navigation.tsx', propsType: 'TabsContentProps' },
  ],
  vue: [
    { file: '../manthan-vue/src/components/Tabs.vue' },
    { file: '../manthan-vue/src/components/TabsTrigger.vue' },
    { file: '../manthan-vue/src/components/TabsContent.vue' },
  ],
  svelte: [
    { file: '../manthan-svelte/src/lib/components/Tabs.svelte', propsType: 'Props' },
    { file: '../manthan-svelte/src/lib/components/TabsTrigger.svelte', propsType: 'Props' },
    { file: '../manthan-svelte/src/lib/components/TabsContent.svelte', propsType: 'Props' },
  ],
  angular: [
    { file: '../manthan-angular/projects/manthan/src/lib/navigation.ts', className: 'MnTabs' },
    { file: '../manthan-angular/projects/manthan/src/lib/navigation.ts', className: 'MnTabsTrigger' },
    { file: '../manthan-angular/projects/manthan/src/lib/navigation.ts', className: 'MnTabsContent' },
  ],
},
```

- [ ] **Step 1–7:** shared procedure. The demo (one file per framework, as always) must render a real Tabs with at least 2 real `TabsTrigger`/`TabsContent` pairs — a single-tab demo doesn't exercise switching. Category: `Navigation`.
- [ ] **Step 8: Browser verification (Review Focus — interactive, not just loaded):** in each of the 4 iframes, click the second tab trigger and confirm the content panel actually switches, not just that the page renders.
- [ ] **Step 9: Commit.**

### Wave G: Accordion (Accordion + AccordionItem)

**Registry data:** same array pattern as Wave F, `advanced.tsx`... — actually `AccordionProps`/`AccordionItemProps` live in `navigation.tsx` alongside Tabs (confirmed same file). `className`: `MnAccordion`, `MnAccordionItem`.

- [ ] **Step 1–7:** shared procedure, array-valued registry entry (2 components, not 3 — no pass-through sibling to skip here). Category: `Navigation` or `Disclosure` (check existing categories).
- [ ] **Step 8: Browser verification:** click to open/close the accordion item in each of the 4 iframes, confirm real toggle behavior.
- [ ] **Step 9: Commit.**

### Wave H: Menu (Menu + MenuItem — MenuLabel/MenuSeparator pass-through)

**Registry data:** `overlay.tsx` / `MenuProps` and `MenuItemProps`; Angular `overlay.ts` / `MnMenu` and `MnMenuItem`. `MenuLabel`/`MenuSeparator` have no named props (confirmed pass-through in React and Angular — Vue/Svelte's `MenuLabel.vue`/`.svelte` and `MenuSeparator.vue`/`.svelte` have no `defineProps`/`interface Props` either) — mention both in prose only.

- [ ] **Step 1–7:** shared procedure, array-valued registry entry (2 components). Category: `Overlays`.
- [ ] **Step 8: Browser verification:** open the menu (via its trigger) in each of the 4 iframes and confirm a real `MenuItem` is clickable/closes the menu, not just that a closed menu's trigger renders.
- [ ] **Step 9: Commit.**

### Wave I: ToggleGroup (ToggleGroup + ToggleGroupItem — needs Task 2's type-alias fix, do this one last)

**Registry data:** `advanced.tsx` / `ToggleGroupProps` (the `type` alias Task 2 unblocked) and `ToggleGroupItemProps` (a plain `interface`, no new capability needed for that half). Angular `advanced.ts` / `MnToggleGroup` and `MnToggleGroupItem`.

- [ ] **Step 1: Confirm Task 2 landed and passes** — `npx vitest run scripts/extract-props/react.test.ts` includes the `ToggleGroupProps` regression test from Task 2, green.
- [ ] **Step 2–8:** shared procedure, array-valued registry entry. The demo needs at least 2 real `ToggleGroupItem`s with different `value`s so the discriminated union's `type="single"` behavior (only one pressed at a time) is actually visible. Category: `Forms` or `Navigation`.
- [ ] **Step 9: Browser verification:** click a toggle item in each of the 4 iframes, confirm the pressed state actually changes (and, if the demo sets `type="multiple"`, that a second item can also be pressed simultaneously).
- [ ] **Step 10: Commit.**

---

## Appendix: Full Component Table

All 36 pages, all verified against real source on 2026-09-26 (React file/interface names read directly; Vue/Svelte/Angular follow their established one-file-per-component / `Mn<Name>` conventions, confirmed for every name that appears in a wave task above — confirm the rest at each wave task's own Step 1, per the Global Constraint on pinning at task start):

**Wave A:** Badge, Avatar, Separator, Heading, Spinner, Skeleton
**Wave B:** Alert, Progress, ProgressCircle, Icon, ButtonGroup, Stat
**Wave C:** Field, Textarea, Select, Slider, FileUpload
**Wave D:** Checkbox, Switch, Radio (RadioGroup + Radio)
**Wave E:** Calendar, DatePicker, Command (Command + CommandDialog)
**Wave F:** Tabs (Tabs + TabsTrigger + TabsContent)
**Wave G:** Accordion (Accordion + AccordionItem)
**Wave H:** Menu (Menu + MenuItem)
**Wave I:** ToggleGroup (ToggleGroup + ToggleGroupItem)

**Not yet placed in a wave** (real, extractable, found in the 2026-09-26 survey but not sampled in enough detail to write a verified registry row above — the next planning pass, or the executor at wave-task time, pins these the same way every other row was pinned): Combobox, Popover, Tooltip, Toaster, Breadcrumb, Pagination, Kbd (needs the named-type-extraction fix from Global Constraints first), Card (+ pass-through sub-parts), Table (+ pass-through sub-parts). Add these as Wave J/K/L following this plan's exact procedure and the Global Constraints' rules on multi-component pages, sibling-extends, and inline-only types — the mechanism is fully proven by Waves A–I; nothing about these remaining ~9 pages needs a new capability.

---

## Execution note

This plan is intentionally not exhaustive for every one of the ~9 not-yet-waved pages — the four *mechanisms* they need (plain single-interface, pass-through sub-parts, sibling-extends, multi-component) are each proven by at least one wave above, and each remaining page is a mechanical application of an already-proven mechanism. Extend the wave list following the same table format before executing them, rather than improvising registry entries ad hoc.
