# Manthan Docs Site (Pilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `manthan-docs` site's full pipeline — props extraction, per-framework live demos, Astro shell — proven end-to-end against 5 pilot components (Button, Input, Dialog, DataTable, Chart) across React, Vue, Svelte and Angular.

**Architecture:** A new `manthan-docs` repo (Astro) renders one page per component from a hand-authored MDX file plus a generated props-JSON file. Each framework repo gets a small query-param-driven demo runner (`?c=<slug>`) that the docs site embeds as an iframe — the demo's own source file is read at build time and shown as that framework's code sample, so there's no copy-paste drift. A `ts-morph`-based extractor (in `manthan-docs`) parses each framework's real prop declarations into a common JSON shape.

**Tech Stack:** Astro (site shell), `ts-morph` + `@vue/compiler-sfc` (prop extraction), Vite (React/Vue/Svelte demo runners), Angular CLI (existing `playground` app, extended), Vitest (extractor tests), TypeScript ~6.0.3.

**Spec:** `docs/superpowers/specs/2026-09-25-docs-site-design.md` — read both; this plan pins exact file paths, type names and code the spec left as examples, verified against real source on 2026-09-25.

## Global Constraints

- TypeScript `~6.0.3` everywhere (matches every other Manthan repo).
- `vitest ^5.0.1` for all new tests (matches every other Manthan repo).
- `manthan-docs` is a new public GitHub repo under `tech-manthan`, default branch `main`, following the same conventions as the other six repos (see `manthan-base/CLAUDE.md`).
- Every new demo app/route is **query-param-driven** (`?c=<slug>`), not path-routed — this is deliberate: it keeps React/Vue/Svelte demo runners to one Vite entry each (no per-component HTML files) and lets Angular reuse its existing `playground` app without adding a router dependency it doesn't otherwise have.
- The extractor's two cross-cutting rules (from the spec, re-stated here because every adapter task depends on them): (1) `Omit<X, 'k'>` unwraps to `X` before the internal/external check, with `k` excluded from the result; (2) a heritage/extends reference resolves and merges in the referenced interface's members only when that interface is declared inside `manthan-base` — otherwise it becomes a `note`, not enumerated members.
- Two-way-bindable props (Vue `defineModel`, Svelte `$bindable`, Angular `model()`/`model.required()`) are recorded as ordinary `PropDoc` entries; React has no equivalent.
- File paths and type/class names below were verified by reading the real source on 2026-09-25 (not guessed): `ButtonProps`/`InputProps`/`DialogProps`/`DataTableProps`/`ChartProps` in React; `Button.vue`/`Input.vue`/`Dialog.vue`/`DataTable.vue`/`Chart.vue` in Vue; `Button.svelte`/`Input.svelte`/`Dialog.svelte`/`DataTable.svelte`/`Chart.svelte` with a `Props` interface in Svelte; `MnButton`/`MnInput`/`MnDialog`/`MnDataTable`/`MnChart` in Angular's `button.ts`/`form.ts`/`overlay.ts`/`data-table.ts`/`chart.ts`.

## Review Focus

- **The extractor silently produces an empty props table** instead of failing the build when a registry entry's file/type name is wrong — every adapter task's tests include a "not found" case asserting a thrown error, and the orchestrator task tests that a bad registry entry fails the whole run.
- **`ChartProps` (React) and Svelte's `Chart.svelte` both `extends`/`Omit<>` a real `manthan-base` type (`ChartControllerOptions`)** — if the internal/external resolution is wrong, Chart's props table silently loses most of its real API surface while looking superficially fine (a few props, no error). The React and Svelte adapter tasks each include a fixture exercising exactly this case.
- **A demo iframe pointing at the wrong dev port or an unbuilt production path** renders blank with no visible error — the Astro task's manual verification step explicitly loads each pilot page in a browser and confirms all four iframes show content, not just that the build succeeded.
- **Vue/Svelte generic components (`DataTable`, `Chart`) use an unbound type parameter (`T`)** in their prop declarations — the extractor must print type text as-is without attempting to resolve `T`, or it will throw on components that work fine at runtime. The Vue and Svelte adapter tasks each include a fixture with a generic prop type.
- **Content/data drift**: an MDX page added without a matching registry entry (or vice versa) silently 404s or silently omits a props table. Task 7's consistency check, wired into CI in Task 17, catches this on every push.

---

## File structure

```
manthan-docs/                          (new repo)
  package.json
  astro.config.mjs
  tsconfig.json
  scripts/extract-props/
    types.ts
    shared.ts
    react.ts
    vue.ts
    svelte.ts
    angular.ts
    index.ts
    *.test.ts
  src/
    data/
      component-registry.ts
      props/                            (generated, gitignored)
    layouts/ComponentPage.astro
    lib/demo-urls.ts
    pages/
      index.astro
      components/index.astro
      components/[slug].astro
    content/components/{button,input,dialog,data-table,chart}.mdx
  public/demos/                         (generated, gitignored)
  .github/workflows/ci.yml

manthan-react/demos/        (new)       index.html, main.tsx, registry.tsx, vite.config.ts, style.css
manthan-vue/demos/          (new)       index.html, main.ts, registry.ts, vite.config.ts, style.css
manthan-svelte/demos/       (new)       index.html, main.ts, registry.ts, vite.config.ts, style.css
manthan-angular/projects/playground/src/demo.ts   (new)  — bootstrapped by main.ts when ?c= is present
```

---

### Task 1: Scaffold the `manthan-docs` repo

**Files:**
- Create (new repo `manthan-docs`): `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/pages/index.astro`, `.github/workflows/ci.yml` (placeholder, replaced in Task 17)

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable, empty Astro site at `main`, ready for later tasks to add to.

- [ ] **Step 1: Create the GitHub repo**

```bash
gh repo create tech-manthan/manthan-docs --public --description "Manthan UI component reference" --clone
cd ../manthan-docs
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "manthan-docs",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "extract-props": "tsx scripts/extract-props/index.ts"
  },
  "devDependencies": {
    "astro": "^5.0.0",
    "ts-morph": "^24.0.0",
    "@vue/compiler-sfc": "^3.5.0",
    "tsx": "^4.19.0",
    "typescript": "~6.0.3",
    "vitest": "^5.0.1"
  }
}
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  outDir: './dist',
});
```

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "ignoreDeprecations": "6.0",
    "noEmit": true
  },
  "include": ["scripts", "src"]
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
.astro
src/data/props
public/demos
*.log
.DS_Store
```

- [ ] **Step 6: Write a minimal `src/pages/index.astro`**

```astro
---
---
<html lang="en">
  <head><title>Manthan Docs</title></head>
  <body><h1>Manthan Docs</h1><p>Component reference — under construction.</p></body>
</html>
```

- [ ] **Step 7: Install and verify the build**

```bash
npm install --no-audit --no-fund
npm run build
```

Expected: `dist/index.html` produced, exit 0.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "chore: scaffold manthan-docs (Astro)"
git branch -M main
git push -u origin main
```

---

### Task 2: Shared extractor types and resolution logic

**Files:**
- Create: `scripts/extract-props/types.ts`
- Create: `scripts/extract-props/shared.ts`
- Test: `scripts/extract-props/shared.test.ts`

**Interfaces:**
- Consumes: `ts-morph` (`Project`, `InterfaceDeclaration`, `Node`, `ExpressionWithTypeArguments`).
- Produces (consumed by Tasks 3–6): `PropDoc`, `ComponentPropsDoc` types; `walkInterfaceMembers(iface: InterfaceDeclaration): PropDoc[]`; `resolveHeritage(heritage: ExpressionWithTypeArguments): { members: PropDoc[]; note?: string }`; `isInternalDeclaration(filePath: string): boolean`.

- [ ] **Step 1: Write `types.ts`**

```ts
export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

export interface ComponentPropsDoc {
  slug: string;
  react?: PropDoc[];
  vue?: PropDoc[];
  svelte?: PropDoc[];
  angular?: PropDoc[];
  note?: string;
}
```

- [ ] **Step 2: Write the failing test for `walkInterfaceMembers` and `resolveHeritage`**

```ts
// scripts/extract-props/shared.test.ts
import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { isInternalDeclaration, resolveHeritage, walkInterfaceMembers } from './shared';

function project() {
  return new Project({ useInMemoryFileSystem: true, compilerOptions: { strict: true } });
}

describe('walkInterfaceMembers', () => {
  it('extracts a required prop, an optional prop, and a JSDoc description', () => {
    const p = project();
    const file = p.createSourceFile(
      'a.ts',
      `interface Props {
        /** Shows a spinner. */
        loading?: boolean;
        label: string;
      }`,
    );
    const props = walkInterfaceMembers(file.getInterfaceOrThrow('Props'));
    expect(props).toEqual([
      { name: 'loading', type: 'boolean', required: false, description: 'Shows a spinner.' },
      { name: 'label', type: 'string', required: true },
    ]);
  });
});

describe('isInternalDeclaration', () => {
  it('treats manthan-base paths as internal and everything else as external', () => {
    expect(isInternalDeclaration('/repo/manthan-base/src/dom/chart.ts')).toBe(true);
    expect(isInternalDeclaration('/repo/node_modules/react/index.d.ts')).toBe(false);
  });
});

describe('resolveHeritage', () => {
  it('resolves an extends reference to an internal manthan-base interface', () => {
    const p = project();
    p.createSourceFile(
      '/repo/manthan-base/src/dom/chart.ts',
      `export interface ChartControllerOptions { type: string; height?: number; }`,
    );
    const file = p.createSourceFile(
      '/repo/manthan-react/src/components/chart.tsx',
      `import type { ChartControllerOptions } from '../../../manthan-base/src/dom/chart';
       interface ChartProps extends ChartControllerOptions { className?: string; }`,
    );
    const [heritage] = file.getInterfaceOrThrow('ChartProps').getExtends();
    const { members, note } = resolveHeritage(heritage);
    expect(note).toBeUndefined();
    expect(members).toEqual([
      { name: 'type', type: 'string', required: true },
      { name: 'height', type: 'number', required: false },
    ]);
  });

  it('notes an extends reference to an external type instead of enumerating it', () => {
    const p = project();
    const file = p.createSourceFile(
      '/repo/manthan-react/src/components/button.tsx',
      `interface Native { onClick?: () => void; }
       interface ButtonProps extends Native { loading?: boolean; }`,
    );
    // "Native" here stands in for a type from outside manthan-base (e.g. React's ComponentProps);
    // resolveHeritage only special-cases the *path*, so any non-manthan-base path proves the branch.
    const [heritage] = file.getInterfaceOrThrow('ButtonProps').getExtends();
    const { members, note } = resolveHeritage(heritage);
    expect(members).toEqual([]);
    expect(note).toContain('Native');
  });

  it('unwraps Omit<Internal, "k"> and drops the omitted key', () => {
    const p = project();
    p.createSourceFile(
      '/repo/manthan-base/src/dom/chart.ts',
      `export interface ChartControllerOptions { type: string; hidden?: string[]; }`,
    );
    const file = p.createSourceFile(
      '/repo/manthan-svelte/src/lib/components/Chart.svelte.ts',
      `import type { ChartControllerOptions } from '../../../../manthan-base/src/dom/chart';
       interface Props extends Omit<ChartControllerOptions, 'hidden'> { class?: string; }`,
    );
    const [heritage] = file.getInterfaceOrThrow('Props').getExtends();
    const { members } = resolveHeritage(heritage);
    expect(members).toEqual([{ name: 'type', type: 'string', required: true }]);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

```bash
npx vitest run scripts/extract-props/shared.test.ts
```
Expected: FAIL — `./shared` has no exported members yet.

- [ ] **Step 4: Write `shared.ts`**

```ts
import { InterfaceDeclaration, Node, PropertySignature, ExpressionWithTypeArguments } from 'ts-morph';
import type { PropDoc } from './types';

export function isInternalDeclaration(filePath: string): boolean {
  return filePath.includes('manthan-base');
}

function jsDocOf(node: PropertySignature): { description?: string; default?: string } {
  const doc = node.getJsDocs()[0];
  if (!doc) return {};
  const description = doc.getDescription().trim() || undefined;
  const defaultTag = doc.getTags().find((t) => t.getTagName() === 'default');
  return { description, default: defaultTag?.getCommentText()?.trim() };
}

export function walkInterfaceMembers(iface: InterfaceDeclaration): PropDoc[] {
  return iface.getProperties().map((prop) => {
    const { description, default: def } = jsDocOf(prop);
    return {
      name: prop.getName(),
      type: (prop.getTypeNode() ?? prop.getType()).getText(),
      required: !prop.hasQuestionToken(),
      ...(def ? { default: def } : {}),
      ...(description ? { description } : {}),
    };
  });
}

function unwrapOmit(node: Node): { target: Node; omitted: string[] } {
  if (!Node.isExpressionWithTypeArguments(node) && !Node.isTypeReferenceNode(node)) {
    return { target: node, omitted: [] };
  }
  const name = Node.isExpressionWithTypeArguments(node) ? node.getExpression().getText() : node.getTypeName().getText();
  if (name !== 'Omit') return { target: node, omitted: [] };
  const [innerType, keysType] = node.getTypeArguments();
  const omitted = keysType
    .getText()
    .split('|')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
  return { target: innerType, omitted };
}

export function resolveHeritage(heritage: ExpressionWithTypeArguments): { members: PropDoc[]; note?: string } {
  const { target, omitted } = unwrapOmit(heritage);
  const typeText = target.getText();
  const decl = target.getType().getSymbol()?.getDeclarations()?.[0];
  if (decl && Node.isInterfaceDeclaration(decl) && isInternalDeclaration(decl.getSourceFile().getFilePath())) {
    return { members: walkInterfaceMembers(decl).filter((p) => !omitted.includes(p.name)) };
  }
  return { members: [], note: `Also accepts standard ${typeText} attributes.` };
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

```bash
npx vitest run scripts/extract-props/shared.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/extract-props/types.ts scripts/extract-props/shared.ts scripts/extract-props/shared.test.ts
git commit -m "feat: shared prop-extraction resolution logic"
```

---

### Task 3: React adapter

**Files:**
- Create: `scripts/extract-props/react.ts`
- Test: `scripts/extract-props/react.test.ts`

**Interfaces:**
- Consumes: `walkInterfaceMembers`, `resolveHeritage` from Task 2's `shared.ts`.
- Produces (consumed by Task 7's orchestrator): `extractReactProps(file: string, typeName: string): { members: PropDoc[]; note?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/extract-props/react.test.ts
import { describe, expect, it } from 'vitest';
import { Project } from 'ts-morph';
import { extractReactPropsFromProject } from './react';

describe('extractReactPropsFromProject', () => {
  it('extracts own members and notes a foreign extends', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile(
      '/repo/manthan-react/src/components/button.tsx',
      `interface Foreign { onClick?: () => void; }
       export interface ButtonProps extends Foreign {
         /** Shows a spinner. */
         loading?: boolean;
       }`,
    );
    const result = extractReactPropsFromProject(project, '/repo/manthan-react/src/components/button.tsx', 'ButtonProps');
    expect(result.members).toEqual([{ name: 'loading', type: 'boolean', required: false, description: 'Shows a spinner.' }]);
    expect(result.note).toContain('Foreign');
  });

  it('throws when the named interface is missing', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('/repo/a.tsx', `export interface Other {}`);
    expect(() => extractReactPropsFromProject(project, '/repo/a.tsx', 'ButtonProps')).toThrow(/ButtonProps/);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run scripts/extract-props/react.test.ts
```
Expected: FAIL — `./react` has no exports yet.

- [ ] **Step 3: Write `react.ts`**

```ts
import { Project } from 'ts-morph';
import { resolveHeritage, walkInterfaceMembers } from './shared';
import type { PropDoc } from './types';

export function extractReactPropsFromProject(
  project: Project,
  file: string,
  typeName: string,
): { members: PropDoc[]; note?: string } {
  const source = project.getSourceFileOrThrow(file);
  const iface = source.getInterface(typeName);
  if (!iface) throw new Error(`React adapter: interface "${typeName}" not found in ${file}`);
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

export function extractReactProps(file: string, typeName: string): { members: PropDoc[]; note?: string } {
  const project = new Project({ tsConfigFilePath: `${process.cwd()}/../manthan-react/tsconfig.json` });
  return extractReactPropsFromProject(project, file, typeName);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npx vitest run scripts/extract-props/react.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-props/react.ts scripts/extract-props/react.test.ts
git commit -m "feat: React prop extraction adapter"
```

---

### Task 4: Vue adapter

**Files:**
- Create: `scripts/extract-props/vue.ts`
- Test: `scripts/extract-props/vue.test.ts`

**Interfaces:**
- Consumes: `walkInterfaceMembers`, `resolveHeritage` from Task 2; `parse` from `@vue/compiler-sfc`.
- Produces (consumed by Task 7): `extractVueProps(file: string, propsType?: string): { members: PropDoc[]; note?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/extract-props/vue.test.ts
import { describe, expect, it } from 'vitest';
import { extractScriptSetup, propsFromScript } from './vue';

describe('extractScriptSetup', () => {
  it('pulls the <script setup lang="ts"> block out of an SFC', () => {
    const sfc = `<script setup lang="ts">\nconst x = 1;\n</script>\n<template><div /></template>`;
    expect(extractScriptSetup(sfc)).toContain('const x = 1;');
  });
});

describe('propsFromScript', () => {
  it('reads an inline defineProps<{...}> object type, including a withDefaults default', () => {
    const script = `
      withDefaults(defineProps<{ variant?: 'solid' | 'soft'; type?: 'button' | 'submit' }>(), { type: 'button' });
    `;
    const { members } = propsFromScript(script);
    expect(members).toEqual([
      { name: 'variant', type: "'solid' | 'soft'", required: false },
      { name: 'type', type: "'button' | 'submit'", required: false, default: "'button'" },
    ]);
  });

  it('reads defineModel<T>() as modelValue and a named defineModel as its given name', () => {
    const script = `
      const model = defineModel<string>();
      const open = defineModel<boolean>('open', { default: false });
    `;
    const { members } = propsFromScript(script);
    expect(members).toContainEqual({ name: 'modelValue', type: 'string', required: false, description: 'Two-way bindable.' });
    expect(members).toContainEqual({
      name: 'open',
      type: 'boolean',
      required: false,
      default: 'false',
      description: 'Two-way bindable.',
    });
  });

  it('prints an unbound generic prop type as plain text instead of erroring (DataTable/Chart use <T>)', () => {
    const script = `defineProps<{ columns: ColumnDef<T>[]; rows: T[] }>();`;
    const { members } = propsFromScript(script);
    expect(members).toEqual([
      { name: 'columns', type: 'ColumnDef<T>[]', required: true },
      { name: 'rows', type: 'T[]', required: true },
    ]);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run scripts/extract-props/vue.test.ts
```
Expected: FAIL — `./vue` has no exports yet.

- [ ] **Step 3: Write `vue.ts`**

```ts
import { Project, Node, SyntaxKind } from 'ts-morph';
import { resolveHeritage, walkInterfaceMembers } from './shared';
import type { PropDoc } from './types';

export function extractScriptSetup(sfc: string): string {
  const match = sfc.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Vue adapter: no <script setup> block found');
  return match[1];
}

function findDefinePropsCall(script: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('inline.ts', script);
  const call = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((c) => c.getExpression().getText() === 'defineProps');
  if (!call) throw new Error('Vue adapter: no defineProps<...>() call found');
  return { file, call };
}

function definePropsMembers(file: ReturnType<Project['createSourceFile']>, call: ReturnType<ReturnType<Project['createSourceFile']>['getDescendantsOfKind']>[number]) {
  const [typeArg] = call.getTypeArguments();
  if (Node.isTypeLiteral(typeArg)) {
    return typeArg.getMembers().map((m) => {
      if (!Node.isPropertySignature(m)) throw new Error('Vue adapter: unsupported defineProps member shape');
      return {
        name: m.getName(),
        type: (m.getTypeNode() ?? m.getType()).getText(),
        required: !m.hasQuestionToken(),
      };
    });
  }
  if (Node.isTypeReferenceNode(typeArg)) {
    const iface = file.getInterfaceOrThrow(typeArg.getTypeName().getText());
    const own = walkInterfaceMembers(iface);
    const inherited = iface.getExtends().flatMap((h) => resolveHeritage(h).members);
    return [...inherited, ...own];
  }
  throw new Error('Vue adapter: defineProps<...> argument must be an object type or a named interface');
}

function applyWithDefaults(script: string, members: PropDoc[]): PropDoc[] {
  const match = script.match(/withDefaults\(\s*defineProps<[\s\S]*?>\(\)\s*,\s*(\{[\s\S]*?\})\s*\)/);
  if (!match) return members;
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('defaults.ts', `const d = ${match[1]};`);
  const obj = file.getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const defaults = new Map(
    obj.getProperties().map((p) => {
      if (!Node.isPropertyAssignment(p)) throw new Error('Vue adapter: unsupported withDefaults shape');
      return [p.getName(), p.getInitializer()!.getText()];
    }),
  );
  return members.map((m) => (defaults.has(m.name) ? { ...m, default: defaults.get(m.name) } : m));
}

function defineModelMembers(script: string): PropDoc[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('models.ts', script);
  return file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((c) => c.getExpression().getText() === 'defineModel')
    .map((c) => {
      const [typeArg] = c.getTypeArguments();
      const args = c.getArguments();
      const nameArg = args.find((a) => Node.isStringLiteral(a));
      const optionsArg = args.find((a) => Node.isObjectLiteralExpression(a));
      const name = nameArg && Node.isStringLiteral(nameArg) ? nameArg.getLiteralText() : 'modelValue';
      const defaultProp = optionsArg && Node.isObjectLiteralExpression(optionsArg)
        ? optionsArg.getProperties().find((p) => Node.isPropertyAssignment(p) && p.getName() === 'default')
        : undefined;
      return {
        name,
        type: typeArg?.getText() ?? 'unknown',
        required: false,
        description: 'Two-way bindable.',
        ...(defaultProp && Node.isPropertyAssignment(defaultProp) ? { default: defaultProp.getInitializer()!.getText() } : {}),
      };
    });
}

export function propsFromScript(script: string): { members: PropDoc[]; note?: string } {
  let members: PropDoc[] = [];
  let note: string | undefined;
  if (script.includes('defineProps')) {
    const { file, call } = findDefinePropsCall(script);
    members = applyWithDefaults(script, definePropsMembers(file, call));
  }
  members = [...members, ...defineModelMembers(script)];
  return { members, note };
}

export function extractVueProps(file: string): { members: PropDoc[]; note?: string } {
  const fs: typeof import('node:fs') = require('node:fs');
  const sfc = fs.readFileSync(file, 'utf-8');
  return propsFromScript(extractScriptSetup(sfc));
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npx vitest run scripts/extract-props/vue.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-props/vue.ts scripts/extract-props/vue.test.ts
git commit -m "feat: Vue prop extraction adapter"
```

---

### Task 5: Svelte adapter

**Files:**
- Create: `scripts/extract-props/svelte.ts`
- Test: `scripts/extract-props/svelte.test.ts`

**Interfaces:**
- Consumes: `walkInterfaceMembers`, `resolveHeritage` from Task 2.
- Produces (consumed by Task 7): `extractSvelteProps(file: string, propsType: string): { members: PropDoc[]; note?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/extract-props/svelte.test.ts
import { describe, expect, it } from 'vitest';
import { extractScriptBlock, propsFromSvelteScript } from './svelte';

describe('extractScriptBlock', () => {
  it('pulls the <script lang="ts" ...> block regardless of extra attributes', () => {
    const sfc = `<script lang="ts" generics="T">\nlet x = 1;\n</script>`;
    expect(extractScriptBlock(sfc)).toContain('let x = 1;');
  });
});

describe('propsFromSvelteScript', () => {
  it('extracts a named Props interface, noting a foreign extends and picking up $bindable defaults', () => {
    const script = `
      interface Foreign { onClick?: () => void; }
      interface Props extends Foreign {
        /** Shows a spinner. */
        loading?: boolean;
      }
      let { loading, value = $bindable('') }: Props = $props();
    `;
    const { members, note } = propsFromSvelteScript(script, 'Props');
    expect(members).toContainEqual({ name: 'loading', type: 'boolean', required: false, description: 'Shows a spinner.' });
    expect(members).toContainEqual({ name: 'value', type: 'string', required: false, default: "''", description: 'Two-way bindable.' });
    expect(note).toContain('Foreign');
  });

  it('prints an unbound generic prop type as plain text instead of erroring (DataTable/Chart use <T>)', () => {
    const script = `
      interface Props { columns: ColumnDef<T>[]; rows: T[]; }
      let { columns, rows }: Props = $props();
    `;
    const { members } = propsFromSvelteScript(script, 'Props');
    expect(members).toEqual([
      { name: 'columns', type: 'ColumnDef<T>[]', required: true },
      { name: 'rows', type: 'T[]', required: true },
    ]);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run scripts/extract-props/svelte.test.ts
```
Expected: FAIL — `./svelte` has no exports yet.

- [ ] **Step 3: Write `svelte.ts`**

```ts
import { Project, Node, SyntaxKind } from 'ts-morph';
import { resolveHeritage, walkInterfaceMembers } from './shared';
import type { PropDoc } from './types';

export function extractScriptBlock(sfc: string): string {
  const match = sfc.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Svelte adapter: no <script> block found');
  return match[1];
}

function bindableMembers(script: string): PropDoc[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('bindable.ts', script);
  const props: PropDoc[] = [];
  for (const decl of file.getVariableDeclarations()) {
    const initializer = decl.getInitializer();
    if (!initializer || !Node.isCallExpression(initializer) || initializer.getExpression().getText() !== '$bindable') continue;
    const bindingName = decl.getNameNode();
    if (!Node.isIdentifier(bindingName)) continue;
    const [defaultArg] = initializer.getArguments();
    props.push({
      name: bindingName.getText(),
      type: 'unknown',
      required: false,
      description: 'Two-way bindable.',
      ...(defaultArg ? { default: defaultArg.getText() } : {}),
    });
  }
  return props;
}

export function propsFromSvelteScript(script: string, propsType: string): { members: PropDoc[]; note?: string } {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile('inline.ts', script);
  const iface = file.getInterface(propsType);
  if (!iface) throw new Error(`Svelte adapter: interface "${propsType}" not found`);
  const own = walkInterfaceMembers(iface);
  const notes: string[] = [];
  const inherited: PropDoc[] = [];
  for (const heritage of iface.getExtends()) {
    const { members, note } = resolveHeritage(heritage);
    inherited.push(...members);
    if (note) notes.push(note);
  }
  const bindable = bindableMembers(script);
  const declaredTypes = new Map(own.map((p) => [p.name, p.type]));
  const merged = bindable.map((b) => (declaredTypes.has(b.name) ? { ...b, type: declaredTypes.get(b.name)! } : b));
  const bindableNames = new Set(bindable.map((b) => b.name));
  return { members: [...inherited, ...own.filter((p) => !bindableNames.has(p.name)), ...merged], note: notes[0] };
}

export function extractSvelteProps(file: string, propsType: string): { members: PropDoc[]; note?: string } {
  const fs: typeof import('node:fs') = require('node:fs');
  const sfc = fs.readFileSync(file, 'utf-8');
  return propsFromSvelteScript(extractScriptBlock(sfc), propsType);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npx vitest run scripts/extract-props/svelte.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-props/svelte.ts scripts/extract-props/svelte.test.ts
git commit -m "feat: Svelte prop extraction adapter"
```

---

### Task 6: Angular adapter

**Files:**
- Create: `scripts/extract-props/angular.ts`
- Test: `scripts/extract-props/angular.test.ts`

**Interfaces:**
- Consumes: `ts-morph` directly (no interface-walking needed — Angular's props are class properties, not an interface).
- Produces (consumed by Task 7): `extractAngularProps(file: string, className: string): { members: PropDoc[]; note?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/extract-props/angular.test.ts
import { describe, expect, it } from 'vitest';
import { Project } from 'ts-morph';
import { propsFromClass } from './angular';

describe('propsFromClass', () => {
  it('reads input(), input.required(), input(default, {transform}) and model()', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile(
      'button.ts',
      `class MnButton {
        readonly variant = input<'solid' | 'soft'>();
        readonly columns = input.required<string[]>();
        readonly loading = input(false, { transform: booleanAttribute });
        readonly open = model(false);
        /** Shows a spinner. */
        readonly disabled = input(false);
      }`,
    );
    const members = propsFromClass(file.getClassOrThrow('MnButton'));
    expect(members).toEqual([
      { name: 'variant', type: "'solid' | 'soft'", required: false },
      { name: 'columns', type: 'string[]', required: true },
      { name: 'loading', type: 'boolean', required: false, default: 'false' },
      { name: 'open', type: 'boolean', required: false, default: 'false', description: 'Two-way bindable.' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Shows a spinner.' },
    ]);
  });

  it('throws when the named class is missing', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('a.ts', `class Other {}`);
    expect(() => propsFromClass(project.getSourceFileOrThrow('a.ts').getClass('MnButton'))).toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx vitest run scripts/extract-props/angular.test.ts
```
Expected: FAIL — `./angular` has no exports yet.

- [ ] **Step 3: Write `angular.ts`**

```ts
import { ClassDeclaration, Node, PropertyDeclaration, SyntaxKind } from 'ts-morph';
import type { PropDoc } from './types';

function literalTypeOf(node: Node): string {
  if (Node.isFalseLiteral(node) || Node.isTrueLiteral(node)) return 'boolean';
  if (Node.isNumericLiteral(node)) return 'number';
  if (Node.isStringLiteral(node)) return 'string';
  return node.getType().getText();
}

function propFromInputCall(prop: PropertyDeclaration): PropDoc | undefined {
  const init = prop.getInitializer();
  if (!init || !Node.isCallExpression(init)) return undefined;
  const callee = init.getExpression().getText();
  if (callee !== 'input' && callee !== 'input.required' && callee !== 'model' && callee !== 'model.required') return undefined;

  const required = callee === 'input.required' || callee === 'model.required';
  const bindable = callee === 'model' || callee === 'model.required';
  const [typeArg] = init.getTypeArguments();
  const [defaultArg] = init.getArguments().filter((a) => !Node.isObjectLiteralExpression(a));
  const type = typeArg ? typeArg.getText() : defaultArg ? literalTypeOf(defaultArg) : 'unknown';
  const doc = prop.getJsDocs()[0]?.getDescription().trim();

  return {
    name: prop.getName(),
    type,
    required,
    ...(defaultArg ? { default: defaultArg.getText() } : {}),
    ...(bindable ? { description: 'Two-way bindable.' } : doc ? { description: doc } : {}),
  };
}

function propFromInputDecorator(prop: PropertyDeclaration): PropDoc | undefined {
  const decorator = prop.getDecorator('Input');
  if (!decorator) return undefined;
  const doc = prop.getJsDocs()[0]?.getDescription().trim();
  return {
    name: prop.getName(),
    type: (prop.getTypeNode() ?? prop.getType()).getText(),
    required: !prop.hasQuestionToken() && !prop.getInitializer(),
    ...(doc ? { description: doc } : {}),
  };
}

export function propsFromClass(cls: ClassDeclaration | undefined): PropDoc[] {
  if (!cls) throw new Error('Angular adapter: class not found');
  const props: PropDoc[] = [];
  for (const prop of cls.getProperties()) {
    const found = propFromInputCall(prop) ?? propFromInputDecorator(prop);
    if (found) props.push(found);
  }
  return props;
}

export function extractAngularProps(file: string, className: string): { members: PropDoc[]; note?: string } {
  const { Project }: typeof import('ts-morph') = require('ts-morph');
  const project = new Project({ tsConfigFilePath: `${process.cwd()}/../manthan-angular/projects/manthan/tsconfig.lib.json` });
  const source = project.getSourceFileOrThrow(file);
  return { members: propsFromClass(source.getClass(className)) };
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
npx vitest run scripts/extract-props/angular.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-props/angular.ts scripts/extract-props/angular.test.ts
git commit -m "feat: Angular prop extraction adapter"
```

---

### Task 7: Orchestrator, component registry (Button), and consistency check

**Files:**
- Create: `src/data/component-registry.ts`
- Create: `scripts/extract-props/index.ts`
- Create: `scripts/check-consistency.ts`
- Test: `scripts/extract-props/index.test.ts`

**Interfaces:**
- Consumes: `extractReactProps`/`extractVueProps`/`extractSvelteProps`/`extractAngularProps` (Tasks 3–6).
- Produces: `src/data/props/<slug>.json` files on disk; a non-zero exit on any failure; `checkConsistency(): string[]` (list of mismatches, empty when clean), consumed by Task 17's CI.

- [ ] **Step 1: Write `component-registry.ts` with the Button entry**

```ts
export interface ComponentSource {
  react?: { file: string; propsType: string };
  vue?: { file: string; propsType?: string };
  svelte?: { file: string; propsType: string };
  angular?: { file: string; className: string };
}

export const componentRegistry: Record<string, ComponentSource> = {
  button: {
    react: { file: '../manthan-react/src/components/button.tsx', propsType: 'ButtonProps' },
    vue: { file: '../manthan-vue/src/components/Button.vue' },
    svelte: { file: '../manthan-svelte/src/lib/components/Button.svelte', propsType: 'Props' },
    angular: { file: '../manthan-angular/projects/manthan/src/lib/button.ts', className: 'MnButton' },
  },
};
```

- [ ] **Step 2: Write the failing test**

```ts
// scripts/extract-props/index.test.ts
import { describe, expect, it, vi } from 'vitest';
import { runExtraction } from './index';

describe('runExtraction', () => {
  it('throws with the slug and framework named when an adapter throws', async () => {
    const registry = { button: { react: { file: 'missing.tsx', propsType: 'ButtonProps' } } };
    await expect(runExtraction(registry, { react: () => { throw new Error('boom'); } } as any, () => {})).rejects.toThrow(
      /button.*react.*boom/s,
    );
  });

  it('writes one JSON file per slug via the provided writer', async () => {
    const registry = { button: { react: { file: 'a.tsx', propsType: 'ButtonProps' } } };
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
});
```

- [ ] **Step 3: Run to confirm it fails**

```bash
npx vitest run scripts/extract-props/index.test.ts
```
Expected: FAIL — `runExtraction` not exported yet.

- [ ] **Step 4: Write `index.ts`**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { extractAngularProps } from './angular';
import { extractReactProps } from './react';
import { extractSvelteProps } from './svelte';
import { extractVueProps } from './vue';
import type { ComponentPropsDoc } from './types';
import { componentRegistry, type ComponentSource } from '../../src/data/component-registry';

type Adapters = {
  react: (file: string, typeName: string) => { members: unknown[]; note?: string };
  vue: (file: string, propsType?: string) => { members: unknown[]; note?: string };
  svelte: (file: string, propsType: string) => { members: unknown[]; note?: string };
  angular: (file: string, className: string) => { members: unknown[]; note?: string };
};

export async function runExtraction(
  registry: Record<string, ComponentSource>,
  adapters: Adapters,
  write: (slug: string, doc: ComponentPropsDoc) => void,
): Promise<void> {
  for (const [slug, source] of Object.entries(registry)) {
    const doc: ComponentPropsDoc = { slug };
    const notes: string[] = [];
    try {
      if (source.react) {
        const r = adapters.react(source.react.file, source.react.propsType);
        doc.react = r.members as ComponentPropsDoc['react'];
        if (r.note) notes.push(r.note);
      }
      if (source.vue) {
        const r = adapters.vue(source.vue.file, source.vue.propsType);
        doc.vue = r.members as ComponentPropsDoc['vue'];
        if (r.note) notes.push(r.note);
      }
      if (source.svelte) {
        const r = adapters.svelte(source.svelte.file, source.svelte.propsType);
        doc.svelte = r.members as ComponentPropsDoc['svelte'];
        if (r.note) notes.push(r.note);
      }
      if (source.angular) {
        const r = adapters.angular(source.angular.file, source.angular.className);
        doc.angular = r.members as ComponentPropsDoc['angular'];
        if (r.note) notes.push(r.note);
      }
    } catch (err) {
      throw new Error(`Extraction failed for "${slug}": ${(err as Error).message}`, { cause: err });
    }
    if (notes[0]) doc.note = notes[0];
    write(slug, doc);
  }
}

async function main() {
  mkdirSync('src/data/props', { recursive: true });
  await runExtraction(componentRegistry, { react: extractReactProps, vue: extractVueProps, svelte: extractSvelteProps, angular: extractAngularProps }, (slug, doc) => {
    writeFileSync(`src/data/props/${slug}.json`, JSON.stringify(doc, null, 2) + '\n');
  });
  console.log(`Extracted props for ${Object.keys(componentRegistry).length} component(s).`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run to confirm it passes**

```bash
npx vitest run scripts/extract-props/index.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 6: Write `scripts/check-consistency.ts`**

```ts
import { readdirSync } from 'node:fs';
import { componentRegistry } from '../src/data/component-registry';

export function checkConsistency(contentDir: string, readdir: (dir: string) => string[] = readdirSync): string[] {
  const mdxSlugs = new Set(readdir(contentDir).map((f) => f.replace(/\.mdx$/, '')));
  const registrySlugs = new Set(Object.keys(componentRegistry));
  const problems: string[] = [];
  for (const slug of mdxSlugs) if (!registrySlugs.has(slug)) problems.push(`${slug}.mdx has no component-registry entry`);
  for (const slug of registrySlugs) if (!mdxSlugs.has(slug)) problems.push(`component-registry has "${slug}" but no ${slug}.mdx`);
  return problems;
}

if (require.main === module) {
  const problems = checkConsistency('src/content/components');
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('Content and registry are consistent.');
}
```

- [ ] **Step 7: Run the real extraction against Button and confirm it produces output**

```bash
npx tsx scripts/extract-props/index.ts
cat src/data/props/button.json
```
Expected: a JSON file with `react`, `vue`, `svelte`, `angular` arrays populated with Button's real props (verify `loading`, `variant`, `size`, `tone` appear; React/Svelte's `note` mentions the native button attributes, since Button's own extends are external in both).

- [ ] **Step 8: Commit**

```bash
git add src/data/component-registry.ts scripts/extract-props/index.ts scripts/extract-props/index.test.ts scripts/check-consistency.ts
git commit -m "feat: extraction orchestrator, Button registry entry, consistency check"
```

---

### Task 8: React demo app

**Files:**
- Create: `manthan-react/demos/index.html`, `manthan-react/demos/main.tsx`, `manthan-react/demos/registry.tsx`, `manthan-react/demos/vite.config.ts`, `manthan-react/demos/style.css`

**Interfaces:**
- Consumes: `@manthan/react` (`Button`), `@manthan/base/theme.css`.
- Produces: a dev server on port 5180 and a `vite build` output, both serving `?c=button` → a rendered Button.

- [ ] **Step 1: Write `vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({ base: './', plugins: [react(), tailwindcss()], server: { port: 5180 } });
```

- [ ] **Step 2: Write `style.css`**

```css
@import 'tailwindcss';
@import '../theme.css';
@source '../src';
@source './';
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en" data-mn-style="default" data-mn-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manthan React Demos</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `registry.tsx` with the Button demo**

```tsx
import type { ReactElement } from 'react';
import { Button } from '../src/components/button';

export const demos: Record<string, () => ReactElement> = {
  button: () => (
    <Button variant="soft" tone="primary">
      Click me
    </Button>
  ),
};
```

- [ ] **Step 5: Write `main.tsx`**

```tsx
import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { demos } from './registry';

const slug = new URLSearchParams(location.search).get('c');
const Demo = slug ? demos[slug] : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>{Demo ? <Demo /> : <p>Demo not found for &quot;{slug}&quot;.</p>}</StrictMode>,
);
```

- [ ] **Step 6: Verify it builds and serves the Button demo**

```bash
cd manthan-react
npm run build -- --config demos/vite.config.ts --outDir demos/dist
npx vite demos --port 5180 &
sleep 2
curl -s "http://localhost:5180/?c=button" | grep -q "root" && echo "index served"
kill %1
```
Expected: `index served` printed (confirms the dev server responds; full render verification happens visually in Task 12).

- [ ] **Step 7: Commit**

```bash
git add demos/
git commit -m "feat: add query-param demo runner with Button"
git push origin main
```

---

### Task 9: Vue demo app

**Files:**
- Create: `manthan-vue/demos/index.html`, `manthan-vue/demos/main.ts`, `manthan-vue/demos/registry.ts`, `manthan-vue/demos/vite.config.ts`, `manthan-vue/demos/style.css`

**Interfaces:**
- Consumes: `@manthan/vue` (`Button`), `@manthan/base/theme.css`.
- Produces: a dev server on port 5181 serving `?c=button` → a rendered Button.

- [ ] **Step 1: Write `vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({ base: './', plugins: [vue(), tailwindcss()], server: { port: 5181 } });
```

- [ ] **Step 2: Write `style.css`**

```css
@import 'tailwindcss';
@import '../theme.css';
@source '../src';
@source './';
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en" data-mn-style="default" data-mn-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manthan Vue Demos</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `registry.ts` with the Button demo**

```ts
import { h } from 'vue';
import Button from '../src/components/Button.vue';

export const demos: Record<string, () => ReturnType<typeof h>> = {
  button: () => h(Button, { variant: 'soft', tone: 'primary' }, () => 'Click me'),
};
```

- [ ] **Step 5: Write `main.ts`**

```ts
import './style.css';
import { createApp, h } from 'vue';
import { demos } from './registry';

const slug = new URLSearchParams(location.search).get('c');
const Demo = slug ? demos[slug] : undefined;

createApp({
  render: () => (Demo ? Demo() : h('p', `Demo not found for "${slug}".`)),
}).mount('#app');
```

- [ ] **Step 6: Verify it builds**

```bash
cd manthan-vue
npx vite build demos --outDir demos/dist
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add demos/
git commit -m "feat: add query-param demo runner with Button"
git push origin main
```

---

### Task 10: Svelte demo app

**Files:**
- Create: `manthan-svelte/demos/index.html`, `manthan-svelte/demos/main.ts`, `manthan-svelte/demos/registry.ts`, `manthan-svelte/demos/App.svelte`, `manthan-svelte/demos/vite.config.ts`, `manthan-svelte/demos/style.css`

**Interfaces:**
- Consumes: `@manthan/svelte` (`Button`), `@manthan/base/theme.css`.
- Produces: a dev server on port 5182 serving `?c=button` → a rendered Button.

- [ ] **Step 1: Write `vite.config.ts`**

```ts
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ base: './', plugins: [svelte(), tailwindcss()], server: { port: 5182 } });
```

- [ ] **Step 2: Write `style.css`** (identical pattern to Tasks 8–9)

```css
@import 'tailwindcss';
@import '../theme.css';
@source '../src';
@source './';
```

- [ ] **Step 3: Write `index.html`**

```html
<!doctype html>
<html lang="en" data-mn-style="default" data-mn-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manthan Svelte Demos</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `registry.ts`** — a lookup from slug to which snippet-rendering component to mount; each entry is a `Snippet`-producing wrapper written directly in `App.svelte` (Svelte doesn't have an inline `h()`-equivalent, so the registry maps to component references, not JSX-like calls)

```ts
import Button from '../src/lib/components/Button.svelte';

export const demos = { button: Button } as const;
export const demoProps: Record<keyof typeof demos, Record<string, unknown>> = {
  button: { variant: 'soft', tone: 'primary' },
};
```

- [ ] **Step 5: Write `App.svelte`**

```svelte
<script lang="ts">
  import { demoProps, demos } from './registry';

  const slug = new URLSearchParams(location.search).get('c') as keyof typeof demos | null;
  const Demo = slug ? demos[slug] : undefined;
</script>

{#if Demo}
  <Demo {...demoProps[slug!]}>Click me</Demo>
{:else}
  <p>Demo not found for "{slug}".</p>
{/if}
```

- [ ] **Step 6: Write `main.ts`**

```ts
import './style.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
```

- [ ] **Step 7: Verify it builds**

```bash
cd manthan-svelte
npx vite build demos --outDir demos/dist
```
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add demos/
git commit -m "feat: add query-param demo runner with Button"
git push origin main
```

---

### Task 11: Angular demo route

**Files:**
- Create: `manthan-angular/projects/playground/src/demo.ts`
- Modify: `manthan-angular/projects/playground/src/main.ts`

**Interfaces:**
- Consumes: `@manthan/angular` (`MN_COMPONENTS`, which includes `MnButton`'s `[mnButton]` directive).
- Produces: `npm run dev` (playground, port 4200) serving `?c=button` → a rendered Button, without adding Angular Router.

- [ ] **Step 1: Write `demo.ts`**

```ts
import { Component, Type } from '@angular/core';
import { MN_COMPONENTS } from '@manthan/angular';

const slug = new URLSearchParams(location.search).get('c');

@Component({
  selector: 'app-demo-button',
  imports: [MN_COMPONENTS],
  template: `<button mnButton variant="soft" tone="primary">Click me</button>`,
})
class ButtonDemo {}

const demos: Record<string, Type<unknown>> = { button: ButtonDemo };

@Component({
  selector: 'app-demo-root',
  imports: [MN_COMPONENTS],
  template: `
    @if (demo) {
      <ng-container *ngComponentOutlet="demo" />
    } @else {
      <p>Demo not found for "{{ slug }}".</p>
    }
  `,
})
export class DemoRoot {
  protected readonly slug = slug;
  protected readonly demo = slug ? demos[slug] : undefined;
}
```

- [ ] **Step 2: Modify `main.ts` to branch on the query param**

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { DemoRoot } from './demo';

const isDemo = new URLSearchParams(location.search).has('c');
bootstrapApplication(isDemo ? DemoRoot : App).catch((err) => console.error(err));
```

- [ ] **Step 3: Verify it builds and typechecks**

```bash
cd manthan-angular
npm run build:playground
npx tsc -p projects/playground/tsconfig.app.json --noEmit
```
Expected: exit 0 on both.

- [ ] **Step 4: Commit**

```bash
git add projects/playground/src/demo.ts projects/playground/src/main.ts
git commit -m "feat: add query-param demo route with Button"
git push origin main
```

---

### Task 12: Astro shell wired end-to-end to Button

**Files:**
- Create: `src/content/config.ts`, `src/layouts/ComponentPage.astro`, `src/lib/demo-urls.ts`, `src/pages/components/[slug].astro`, `src/pages/components/index.astro`, `src/content/components/button.mdx`
- Modify: `astro.config.mjs` (add `astro:content` collection config if needed), `package.json` (add `@astrojs/mdx`)

**Interfaces:**
- Consumes: `src/data/props/button.json` (Task 7), `demoUrl()` for each framework's demo (Tasks 8–11).
- Produces: `/components/button` renders live and manually-verified in a browser.

- [ ] **Step 1: Add MDX support**

```bash
npx astro add mdx --yes
```

- [ ] **Step 2: Write `src/content/config.ts`**, defining the `components` collection so `getCollection('components')` (used in Steps 6–7) returns typed entries with a stable `.slug` derived from each MDX file's name:

```ts
import { defineCollection, z } from 'astro:content';

const components = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    category: z.string(),
    description: z.string(),
  }),
});

export const collections = { components };
```

- [ ] **Step 3: Write `src/lib/demo-urls.ts`**

```ts
export type Framework = 'react' | 'vue' | 'svelte' | 'angular';

const devPorts: Record<Framework, number> = { react: 5180, vue: 5181, svelte: 5182, angular: 4200 };

export function demoUrl(framework: Framework, slug: string): string {
  if (import.meta.env.DEV) {
    return `http://localhost:${devPorts[framework]}/?c=${slug}`;
  }
  return `/demos/${framework}/index.html?c=${slug}`;
}
```

- [ ] **Step 4: Write `src/content/components/button.mdx`**

```mdx
---
title: Button
slug: button
category: Actions
description: A pressable control for the primary actions on a page.
---

Use `Button` for the primary action in a form, toolbar or dialog footer. Pair `variant="soft"` or `variant="ghost"` with a neutral tone for secondary actions, and reserve `variant="solid"` for the one action you want the eye drawn to.
```

- [ ] **Step 5: Write `src/layouts/ComponentPage.astro`**

```astro
---
import { readFileSync } from 'node:fs';
import { Code } from 'astro:components';
import { demoUrl, type Framework } from '../lib/demo-urls';

interface Props {
  slug: string;
  title: string;
  description: string;
  demoSourcePaths: Record<Framework, string>;
}
const { slug, title, description, demoSourcePaths } = Astro.props;
const propsDoc = JSON.parse(readFileSync(new URL(`../data/props/${slug}.json`, import.meta.url), 'utf-8'));
const frameworks: Framework[] = ['react', 'vue', 'svelte', 'angular'];
---
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title} — Manthan Docs</title>
  </head>
  <body>
    <h1>{title}</h1>
    <p>{description}</p>
    <slot />
    {propsDoc.note && <p><em>{propsDoc.note}</em></p>}
    {frameworks.map((fw) => (
      <section>
        <h2>{fw}</h2>
        <iframe src={demoUrl(fw, slug)} title={`${title} — ${fw} demo`} style="width:100%;height:200px;border:1px solid #ccc;" />
        <Code code={readFileSync(demoSourcePaths[fw], 'utf-8')} lang={fw === 'vue' ? 'vue' : fw === 'svelte' ? 'svelte' : 'tsx'} />
        {propsDoc[fw] && (
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              {propsDoc[fw].map((p: any) => (
                <tr><td>{p.name}</td><td><code>{p.type}</code></td><td>{p.required ? 'Yes' : 'No'}</td><td>{p.default ?? '—'}</td><td>{p.description ?? ''}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    ))}
  </body>
</html>
```

- [ ] **Step 6: Write `src/pages/components/[slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import ComponentPage from '../../layouts/ComponentPage.astro';

export async function getStaticPaths() {
  const entries = await getCollection('components');
  return entries.map((entry) => ({ params: { slug: entry.slug }, props: { entry } }));
}
const { entry } = Astro.props;
const { Content } = await entry.render();

const demoSourcePaths: Record<'react' | 'vue' | 'svelte' | 'angular', string> = {
  react: new URL('../../../../manthan-react/demos/registry.tsx', import.meta.url).pathname,
  vue: new URL('../../../../manthan-vue/demos/registry.ts', import.meta.url).pathname,
  svelte: new URL('../../../../manthan-svelte/demos/registry.ts', import.meta.url).pathname,
  angular: new URL('../../../../manthan-angular/projects/playground/src/demo.ts', import.meta.url).pathname,
};
---
<ComponentPage slug={entry.slug} title={entry.data.title} description={entry.data.description} demoSourcePaths={demoSourcePaths}>
  <Content />
</ComponentPage>
```

- [ ] **Step 7: Write `src/pages/components/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
const entries = await getCollection('components');
const byCategory = Object.groupBy(entries, (e) => e.data.category);
---
<html lang="en">
  <head><title>Components — Manthan Docs</title></head>
  <body>
    <h1>Components</h1>
    {Object.entries(byCategory).map(([category, items]) => (
      <section>
        <h2>{category}</h2>
        <ul>{items!.map((e) => <li><a href={`/components/${e.slug}`}>{e.data.title}</a></li>)}</ul>
      </section>
    ))}
  </body>
</html>
```

- [ ] **Step 8: Verify with all four demo servers running**

```bash
(cd ../manthan-react && npx vite demos --port 5180 &)
(cd ../manthan-vue && npx vite demos --port 5181 &)
(cd ../manthan-svelte && npx vite demos --port 5182 &)
(cd ../manthan-angular && npm run dev --workspace=playground &)
npm run extract-props
npm run dev
```
Then open `http://localhost:4321/components/button` in a browser (per this project's `run` conventions) and confirm: all four iframes render a visible soft-primary "Click me" button, all four code blocks show real source, and the props table lists `variant`, `size`, `tone`, `iconOnly`, `fullWidth`, `loading`, `disabled` with the note about native button attributes. Kill the background demo servers afterward.

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs package.json src/content/config.ts src/layouts src/lib src/pages/components src/content/components
git commit -m "feat: Astro component page wired end-to-end to Button"
git push origin main
```

---

### Task 13: Input — wire across all four frameworks

**Files:**
- Modify: `src/data/component-registry.ts` (add `input` entry)
- Modify: `manthan-react/demos/registry.tsx`, `manthan-vue/demos/registry.ts`, `manthan-svelte/demos/registry.ts`, `manthan-angular/projects/playground/src/demo.ts`
- Create: `src/content/components/input.mdx`

**Interfaces:**
- Consumes: `InputProps` (React, in `form.tsx`), `Input.vue`, `Input.svelte` (`Props`), `MnInput` (Angular, in `form.ts`).
- Produces: `/components/input` rendering live in all four frameworks.

- [ ] **Step 1: Add the registry entry**

```ts
input: {
  react: { file: '../manthan-react/src/components/form.tsx', propsType: 'InputProps' },
  vue: { file: '../manthan-vue/src/components/Input.vue' },
  svelte: { file: '../manthan-svelte/src/lib/components/Input.svelte', propsType: 'Props' },
  angular: { file: '../manthan-angular/projects/manthan/src/lib/form.ts', className: 'MnInput' },
},
```

- [ ] **Step 2: Add the React demo**

```tsx
// manthan-react/demos/registry.tsx — add to demos
import { Input } from '../src/components/form';
// ...
input: () => <Input placeholder="you@example.com" />,
```

- [ ] **Step 3: Add the Vue demo**

```ts
// manthan-vue/demos/registry.ts — add to demos
import { ref } from 'vue';
import Input from '../src/components/Input.vue';
// ...
input: () => h(Input, { modelValue: ref('').value, 'onUpdate:modelValue': () => {}, placeholder: 'you@example.com' }),
```

- [ ] **Step 4: Add the Svelte demo**

```ts
// manthan-svelte/demos/registry.ts
import Input from '../src/lib/components/Input.svelte';
// ...
export const demos = { button: Button, input: Input } as const;
export const demoProps = {
  button: { variant: 'soft', tone: 'primary' },
  input: { placeholder: 'you@example.com' },
};
```

- [ ] **Step 5: Add the Angular demo**

```ts
// manthan-angular/projects/playground/src/demo.ts
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-demo-input',
  imports: [MN_COMPONENTS, FormsModule],
  template: `<input mnInput [(ngModel)]="value" placeholder="you@example.com" />`,
})
class InputDemo {
  protected value = '';
}

// add 'input: InputDemo' to the demos map
```

- [ ] **Step 6: Write `input.mdx`**

```mdx
---
title: Input
slug: input
category: Forms
description: A single-line text control, with optional adornments and validation states.
---

Wrap `Input` in a `Field` to attach a label, description or error message — `Field` forwards `id`, `aria-describedby` and `aria-invalid` automatically. Use `startContent`/`endContent` (React/Vue/Svelte) or the `mn-input-group` wrapper (Angular) for icon or unit adornments.
```

- [ ] **Step 7: Verify**

```bash
npm run extract-props
cat src/data/props/input.json  # confirm size/startContent/endContent (React) and the note about native <input> attributes
npm run dev
```
Open `http://localhost:4321/components/input` with the four demo servers running (as in Task 12 Step 7) and confirm each framework renders a text input with the placeholder visible.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire up Input across all four frameworks"
git push origin main
```

(companion commits in `manthan-react`, `manthan-vue`, `manthan-svelte`, `manthan-angular` for their demo registry changes, same message)

---

### Task 14: Dialog — wire across all four frameworks

**Files:** same shape as Task 13, targeting Dialog.

**Interfaces:**
- Consumes: `DialogProps` (React, `overlay.tsx`), `Dialog.vue`, `Dialog.svelte` (`Props`), `MnDialog` (Angular, `overlay.ts`).

- [ ] **Step 1: Add the registry entry**

```ts
dialog: {
  react: { file: '../manthan-react/src/components/overlay.tsx', propsType: 'DialogProps' },
  vue: { file: '../manthan-vue/src/components/Dialog.vue' },
  svelte: { file: '../manthan-svelte/src/lib/components/Dialog.svelte', propsType: 'Props' },
  angular: { file: '../manthan-angular/projects/manthan/src/lib/overlay.ts', className: 'MnDialog' },
},
```

- [ ] **Step 2: Add the React demo**

```tsx
import { Button } from '../src/components/button';
import { Dialog } from '../src/components/overlay';
// ...
dialog: () => (
  <Dialog trigger={<Button>Open</Button>} title="Delete project?" description="This permanently deletes the project.">
    Are you sure?
  </Dialog>
),
```

- [ ] **Step 3: Add the Vue demo** (Dialog's `open` is a named `defineModel('open')`, controlled externally)

```ts
import { defineComponent, h, ref } from 'vue';
import Button from '../src/components/Button.vue';
import Dialog from '../src/components/Dialog.vue';
// ...
dialog: () => {
  const open = ref(false);
  return h(defineComponent(() => () => [
    h(Button, { onClick: () => (open.value = true) }, () => 'Open'),
    h(Dialog, { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), title: 'Delete project?', description: 'This permanently deletes the project.' }, () => 'Are you sure?'),
  ]));
},
```

- [ ] **Step 4: Add the Svelte demo** — Svelte's registry maps slug → component directly (Task 10's shape), so Dialog needs its own tiny wrapper component rather than fitting the generic `demoProps` spread:

```svelte
<!-- manthan-svelte/demos/DialogDemo.svelte -->
<script lang="ts">
  import Button from '../src/lib/components/Button.svelte';
  import Dialog from '../src/lib/components/Dialog.svelte';
  let open = $state(false);
</script>
<Button onclick={() => (open = true)}>Open</Button>
<Dialog bind:open title="Delete project?" description="This permanently deletes the project.">Are you sure?</Dialog>
```

```ts
// manthan-svelte/demos/registry.ts
import DialogDemo from './DialogDemo.svelte';
// ...
export const demos = { button: Button, input: Input, dialog: DialogDemo } as const;
```

Update `App.svelte` (Task 10) to render `dialog` without prop-spreading, since it needs no external props: `{#if slug === 'dialog'}<DialogDemo />{:else if Demo}<Demo {...demoProps[slug!]}>Click me</Demo>{/if}` — or simplest, give every demo component the same no-props convention and drop `demoProps` entirely, moving Button's `variant`/`tone` into its own small wrapper component (`ButtonDemo.svelte`) for consistency. Use the wrapper-component convention going forward (Task 15/16 follow it too).

- [ ] **Step 5: Add the Angular demo**

```ts
@Component({
  selector: 'app-demo-dialog',
  imports: [MN_COMPONENTS],
  template: `
    <button mnButton [mnDialogTrigger]="dlg">Open</button>
    <mn-dialog #dlg title="Delete project?" description="This permanently deletes the project.">Are you sure?</mn-dialog>
  `,
})
class DialogDemo {}
// add 'dialog: DialogDemo' to the demos map
```

- [ ] **Step 6: Write `dialog.mdx`**

```mdx
---
title: Dialog
slug: dialog
category: Overlay
description: A modal window built on the native <dialog> element, for focused tasks that interrupt the page.
---

`Dialog` traps focus and closes on Escape or backdrop click by default (`closeOnEscape`/`closeOnBackdrop`). Use `footer` (React) or the dedicated footer slot/directive (Vue/Svelte/Angular) for actions — pair a neutral "Cancel" with a tone-matched confirm action.
```

- [ ] **Step 7: Verify** — same pattern as Task 13 Step 7; additionally click each framework's "Open" trigger inside its iframe and confirm the dialog opens.

- [ ] **Step 8: Commit** (same pattern as Task 13 Step 8, across all five repos touched)

---

### Task 15: DataTable — wire across all four frameworks

**Files:** same shape as Task 13, targeting DataTable.

**Interfaces:**
- Consumes: `DataTableProps<T>` (React, `data-table.tsx`), `DataTable.vue`, `DataTable.svelte` (`Props`, generic `T`), `MnDataTable<T>` (Angular, `data-table.ts`).

- [ ] **Step 1: Add the registry entry**

```ts
'data-table': {
  react: { file: '../manthan-react/src/components/data-table.tsx', propsType: 'DataTableProps' },
  vue: { file: '../manthan-vue/src/components/DataTable.vue' },
  svelte: { file: '../manthan-svelte/src/lib/components/DataTable.svelte', propsType: 'Props' },
  angular: { file: '../manthan-angular/projects/manthan/src/lib/data-table.ts', className: 'MnDataTable' },
},
```

- [ ] **Step 2: Shared demo dataset** (used identically across all four frameworks — write once per repo's demo file, not shared across repos)

```ts
const rows = [
  { id: 'INV-1001', customer: 'Ada Lovelace', status: 'Paid' },
  { id: 'INV-1002', customer: 'Alan Turing', status: 'Pending' },
  { id: 'INV-1003', customer: 'Grace Hopper', status: 'Overdue' },
];
const columns = [
  { key: 'id', header: 'Invoice' },
  { key: 'customer', header: 'Customer' },
  { key: 'status', header: 'Status' },
];
```

- [ ] **Step 3: Add the React demo**

```tsx
import { DataTable } from '../src/components/data-table';
// ...
'data-table': () => <DataTable columns={columns} rows={rows} pageSize={3} />,
```

- [ ] **Step 4: Add the Vue demo**

```ts
import DataTable from '../src/components/DataTable.vue';
// ...
'data-table': () => h(DataTable, { columns, rows, pageSize: 3 }),
```

- [ ] **Step 5: Add the Svelte demo wrapper**

```svelte
<!-- manthan-svelte/demos/DataTableDemo.svelte -->
<script lang="ts">
  import DataTable from '../src/lib/components/DataTable.svelte';
  const rows = [ /* as above */ ];
  const columns = [ /* as above */ ];
</script>
<DataTable {columns} {rows} pageSize={3} />
```

- [ ] **Step 6: Add the Angular demo**

```ts
@Component({
  selector: 'app-demo-data-table',
  imports: [MN_COMPONENTS],
  template: `<mn-data-table [columns]="columns" [rows]="rows" [pageSize]="3" />`,
})
class DataTableDemo {
  protected rows = [ /* as above */ ];
  protected columns = [ /* as above */ ];
}
// add 'data-table': DataTableDemo to the demos map
```

- [ ] **Step 7: Write `data-table.mdx`**

```mdx
---
title: Data Table
slug: data-table
category: Data Display
description: A sortable, searchable, selectable table with pagination built in.
---

Give each column a `key` matching a field on your row objects and a `header`; pass a `cell` function (React/Vue/Svelte) or an `mnCell` template (Angular) when a column needs custom rendering, like a status badge.
```

- [ ] **Step 8: Verify** — same pattern as Task 13 Step 7; additionally use the search box inside each iframe and confirm it filters rows.

- [ ] **Step 9: Commit** (same pattern as Task 13 Step 8)

---

### Task 16: Chart — wire across all four frameworks

**Files:** same shape as Task 13, targeting Chart.

**Interfaces:**
- Consumes: `ChartProps<T>` (React, `chart.tsx`, `extends ChartControllerOptions<T>` from `manthan-base/src/dom/chart.ts` — the internal-resolution path), `Chart.vue` (inline, no extends), `Chart.svelte` (`Props`, `extends Omit<ChartControllerOptions<T>, 'hidden'>` — the internal-resolution + `Omit` path), `MnChart<T>` (Angular, `chart.ts`, flattened `input()`s).

- [ ] **Step 1: Add the registry entry**

```ts
chart: {
  react: { file: '../manthan-react/src/components/chart.tsx', propsType: 'ChartProps' },
  vue: { file: '../manthan-vue/src/components/Chart.vue' },
  svelte: { file: '../manthan-svelte/src/lib/components/Chart.svelte', propsType: 'Props' },
  angular: { file: '../manthan-angular/projects/manthan/src/lib/chart.ts', className: 'MnChart' },
},
```

- [ ] **Step 2: Shared demo dataset**

```ts
const data = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => ({ month, revenue: 30 + i * 3 }));
const series = [{ key: 'revenue', label: 'Revenue' }];
```

- [ ] **Step 3: Add the React demo**

```tsx
import { Chart } from '../src/components/chart';
// ...
chart: () => <Chart type="area" data={data} x="month" series={series} height={200} />,
```

- [ ] **Step 4: Add the Vue demo**

```ts
import Chart from '../src/components/Chart.vue';
// ...
chart: () => h(Chart, { type: 'area', data, x: 'month', series, height: 200 }),
```

- [ ] **Step 5: Add the Svelte demo wrapper**

```svelte
<!-- manthan-svelte/demos/ChartDemo.svelte -->
<script lang="ts">
  import Chart from '../src/lib/components/Chart.svelte';
  const data = [ /* as above */ ];
  const series = [{ key: 'revenue', label: 'Revenue' }];
</script>
<Chart type="area" {data} x="month" {series} height={200} />
```

- [ ] **Step 6: Add the Angular demo**

```ts
@Component({
  selector: 'app-demo-chart',
  imports: [MN_COMPONENTS],
  template: `<mn-chart type="area" [data]="data" x="month" [series]="series" [height]="200" />`,
})
class ChartDemo {
  protected data = [ /* as above */ ];
  protected series = [{ key: 'revenue', label: 'Revenue' }];
}
// add 'chart': ChartDemo to the demos map
```

- [ ] **Step 7: Write `chart.mdx`**

```mdx
---
title: Chart
slug: chart
category: Data Display
description: Line, area, bar or donut charts drawn by one shared geometry engine, so every framework looks and behaves the same.
---

`Chart` colors come from CSS custom properties (`--mn-chart-N`) and follow the active `data-mn-style`. Memoize `data`/`series` in React to avoid redrawing on unrelated renders — the other three frameworks' reactivity systems handle this for you.
```

- [ ] **Step 8: Verify**

```bash
npm run extract-props
cat src/data/props/chart.json
```
Confirm `type`, `data`, `x`, `series`, `stacked`, `curve`, `height` etc. all appear in the React and Svelte props arrays (proving the `ChartControllerOptions` cross-file resolution and `Omit<>` unwrap both worked on real source, not just the Task 2 fixtures) — this is this task's most important check, per the Review Focus section. Then run the full visual check as in Task 13 Step 7 and confirm all four iframes render a visible area chart.

- [ ] **Step 9: Commit** (same pattern as Task 13 Step 8)

---

### Task 17: `manthan-docs` CI

**Files:**
- Create: `manthan-docs/.github/workflows/ci.yml` (replaces Task 1's placeholder)

**Interfaces:**
- Consumes: all six repos at `main`; `npm run extract-props`; `scripts/check-consistency.ts` (Task 7).
- Produces: a green Actions run on every push/PR to `main`, extending the pattern already proven on the other six repos.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout manthan-icons
        uses: actions/checkout@v4
        with: { repository: tech-manthan/manthan-icons, path: manthan-icons }
      - name: Checkout manthan-base
        uses: actions/checkout@v4
        with: { repository: tech-manthan/manthan-base, path: manthan-base }
      - name: Checkout manthan-react
        uses: actions/checkout@v4
        with: { repository: tech-manthan/manthan-react, path: manthan-react }
      - name: Checkout manthan-vue
        uses: actions/checkout@v4
        with: { repository: tech-manthan/manthan-vue, path: manthan-vue }
      - name: Checkout manthan-svelte
        uses: actions/checkout@v4
        with: { repository: tech-manthan/manthan-svelte, path: manthan-svelte }
      - name: Checkout manthan-angular
        uses: actions/checkout@v4
        with: { repository: tech-manthan/manthan-angular, path: manthan-angular }
      - name: Checkout manthan-docs
        uses: actions/checkout@v4
        with: { path: manthan-docs }

      - uses: actions/setup-node@v4
        with: { node-version: '22' }

      - name: Build manthan-icons
        working-directory: manthan-icons
        run: npm ci && npm run build
      - name: Build manthan-base
        working-directory: manthan-base
        run: npm ci && npm run build
      - name: Build manthan-react (lib + demos)
        working-directory: manthan-react
        run: npm ci && npm run build && npx vite build demos --outDir demos/dist
      - name: Build manthan-vue (lib + demos)
        working-directory: manthan-vue
        run: npm ci && npm run build && npx vite build demos --outDir demos/dist
      - name: Build manthan-svelte (lib + demos)
        working-directory: manthan-svelte
        run: npm ci && npm run build && npx vite build demos --outDir demos/dist
      - name: Build manthan-angular (lib + playground)
        working-directory: manthan-angular
        run: npm ci && npm run build && npm run build:playground

      - name: Copy demo builds into manthan-docs
        run: |
          mkdir -p manthan-docs/public/demos/{react,vue,svelte,angular}
          cp -r manthan-react/demos/dist/. manthan-docs/public/demos/react/
          cp -r manthan-vue/demos/dist/. manthan-docs/public/demos/vue/
          cp -r manthan-svelte/demos/dist/. manthan-docs/public/demos/svelte/
          cp -r manthan-angular/projects/playground/dist/. manthan-docs/public/demos/angular/

      - name: Install manthan-docs
        working-directory: manthan-docs
        run: npm ci
      - name: Check content/registry consistency
        working-directory: manthan-docs
        run: npx tsx scripts/check-consistency.ts
      - name: Extract props
        working-directory: manthan-docs
        run: npm run extract-props
      - name: Test
        working-directory: manthan-docs
        run: npm test
      - name: Typecheck
        working-directory: manthan-docs
        run: npm run typecheck
      - name: Build
        working-directory: manthan-docs
        run: npm run build
```

- [ ] **Step 2: Verify locally** (run the same commands from the repo root, in the order above, substituting the manual `mkdir`/`cp` for the CI step)

Expected: every command exits 0, and `manthan-docs/dist/components/button/index.html` (and `input`, `dialog`, `data-table`, `chart`) exist after the final build.

- [ ] **Step 3: Commit and push**

```bash
cd manthan-docs
git add .github/workflows/ci.yml
git commit -m "ci: build all six repos, extract props, build the site"
git push origin main
```

- [ ] **Step 4: Confirm the Actions run is green**

```bash
gh run watch --repo tech-manthan/manthan-docs $(gh run list --repo tech-manthan/manthan-docs --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```
Expected: `success`.
