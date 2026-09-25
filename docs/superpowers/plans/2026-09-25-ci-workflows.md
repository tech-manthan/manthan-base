# CI Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all six Manthan repos a GitHub Actions workflow that runs build, test and typecheck on every push/PR to their default branch, in dependency order (icons → base → frameworks).

**Architecture:** Each repo gets its own `.github/workflows/ci.yml`. Because packages link to each other with `file:../manthan-*` devDependencies (not npm registry versions), a repo's CI job cannot just checkout itself — it must also checkout the upstream repos it depends on into sibling directories (`actions/checkout` with `path:`), build them first, then install/build/test/typecheck itself. `manthan-icons` has no Manthan dependencies; `manthan-base` needs `manthan-icons` built; the four framework repos need both `manthan-icons` and `manthan-base` built.

**Tech Stack:** GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`), Node 22 (Angular requires ≥ 22.22.3), npm (all repos have committed `package-lock.json`, so `npm ci` is used).

**Spec:** `/Users/manthansharma/works/manthan/manthan-base/CLAUDE.md` (Roadmap item 3: "CI: no repo has GitHub Actions yet. Each repo should run build, test and typecheck, in dependency order (icons → base → frameworks). Angular needs Node ≥ 22.22.3.")

## Global Constraints

- Node version pinned to `'22'` in every workflow (satisfies Angular's ≥ 22.22.3 floor as of 2026).
- Trigger branch is `claude/great-turing-ihfjsd` for both `push` and `pull_request` — there is no `main` branch, and this is already each repo's GitHub default branch (verified via `gh repo view --json defaultBranchRef` on 2026-09-25).
- Use `npm ci`, never `npm install`, since every repo has a committed lockfile.
- Cross-repo checkouts (`actions/checkout` with a foreign `repository:`) rely on the workflow's default `GITHUB_TOKEN`; all six repos are public under the `tech-manthan` org, which is sufficient for anonymous-equivalent read access — no PAT/secret needed.
- Every sibling repo checkout uses an explicit `path:` so relative `file:../manthan-*` resolution inside `npm ci` matches local dev layout exactly.
- Don't add caching (`actions/setup-node` `cache:`) — with three separate checkouts per job there's no single lockfile root to key off cleanly, and correctness matters more than speed for a first CI pass. Out of scope; can be added later.

## Review Focus

- **A workflow that "looks right" but the sibling checkout path is wrong** (e.g. missing `path:` on the self-checkout, so `file:../manthan-base` resolves outside `$GITHUB_WORKSPACE`) — the acceptance test for every task is a real, green Actions run, not just YAML lint.
- **`npm ci` running in a repo before its file-linked dependency has been built** — dist files (e.g. `manthan-icons/dist/index.js`) must exist before the *downstream* repo's own `build`/`test`/`typecheck` steps execute, since those import from the sibling package.
- **Angular's Node floor silently unmet** — if `actions/setup-node` ever resolves to an old cached `22.x` below `22.22.3`, `ng build`/`ng test` will fail with an unclear error; the task for `manthan-angular` explicitly checks the resolved Node version in the run log.
- **A workflow that only covers `push` and gets skipped on PRs** (or vice versa) — every task's workflow declares both triggers on the same branch.
- **`npm test` exit code masked by a `pretest` hook failing silently** (icons' `pretest`/`pretypecheck` re-run `scripts/build.mjs`) — verified locally before push by running the exact `npm run build && npm test && npm run typecheck` sequence and checking each exits 0.

---

### Task 1: manthan-icons CI

**Files:**
- Create: `manthan-icons/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing (no Manthan dependencies).
- Produces: a green Actions run on `manthan-icons` that later tasks' upstream builds implicitly rely on being correct (they build icons the same way).

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [claude/great-turing-ihfjsd]
  pull_request:
    branches: [claude/great-turing-ihfjsd]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Typecheck
        run: npm run typecheck
```

- [ ] **Step 2: Verify locally before pushing**

Run from `manthan-icons/`:
```bash
rm -rf node_modules dist && npm ci && npm run build && npm test && npm run typecheck
```
Expected: all four commands exit 0 (test count: 5, per CLAUDE.md hand-off table).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

- [ ] **Step 4: Push and confirm the Actions run is green**

```bash
git push origin claude/great-turing-ihfjsd
gh run watch --repo tech-manthan/manthan-icons
```
Expected: `gh run watch` reports the run as `success`. If `gh auth status` shows an invalid token first, run `gh auth refresh -h github.com` before pushing.

---

### Task 2: manthan-base CI

**Files:**
- Create: `manthan-base/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `manthan-icons` built at sibling path `../manthan-icons` (dist emitted by Task 1's `npm run build`).
- Produces: a green Actions run on `manthan-base` that Tasks 3–6 rely on being correct (they build base the same way).

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [claude/great-turing-ihfjsd]
  pull_request:
    branches: [claude/great-turing-ihfjsd]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout manthan-icons
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-icons
          path: manthan-icons

      - name: Checkout manthan-base
        uses: actions/checkout@v4
        with:
          path: manthan-base

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Build manthan-icons
        working-directory: manthan-icons
        run: |
          npm ci
          npm run build

      - name: Install manthan-base
        working-directory: manthan-base
        run: npm ci

      - name: Build
        working-directory: manthan-base
        run: npm run build

      - name: Test
        working-directory: manthan-base
        run: npm test

      - name: Typecheck
        working-directory: manthan-base
        run: npm run typecheck
```

- [ ] **Step 2: Verify locally before pushing**

Run from `manthan/` (the parent of all six repos, since this reproduces the sibling-checkout layout):
```bash
(cd manthan-icons && npm ci && npm run build)
(cd manthan-base && rm -rf node_modules dist && npm ci && npm run build && npm test && npm run typecheck)
```
Expected: all commands exit 0 (test count: 73, per CLAUDE.md hand-off table).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

- [ ] **Step 4: Push and confirm the Actions run is green**

```bash
git push origin claude/great-turing-ihfjsd
gh run watch --repo tech-manthan/manthan-base
```
Expected: `success`. Confirm in the log that the "Build manthan-icons" step completed before "Install manthan-base" started.

---

### Task 3: manthan-react CI

**Files:**
- Create: `manthan-react/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `manthan-icons` and `manthan-base` built at sibling paths (same pattern as Task 2).
- Produces: a green Actions run on `manthan-react`.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [claude/great-turing-ihfjsd]
  pull_request:
    branches: [claude/great-turing-ihfjsd]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout manthan-icons
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-icons
          path: manthan-icons

      - name: Checkout manthan-base
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-base
          path: manthan-base

      - name: Checkout manthan-react
        uses: actions/checkout@v4
        with:
          path: manthan-react

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Build manthan-icons
        working-directory: manthan-icons
        run: |
          npm ci
          npm run build

      - name: Build manthan-base
        working-directory: manthan-base
        run: |
          npm ci
          npm run build

      - name: Install manthan-react
        working-directory: manthan-react
        run: npm ci

      - name: Build
        working-directory: manthan-react
        run: npm run build

      - name: Test
        working-directory: manthan-react
        run: npm test

      - name: Typecheck
        working-directory: manthan-react
        run: npm run typecheck
```

- [ ] **Step 2: Verify locally before pushing**

Run from `manthan/`:
```bash
(cd manthan-icons && npm ci && npm run build)
(cd manthan-base && npm ci && npm run build)
(cd manthan-react && rm -rf node_modules dist && npm ci && npm run build && npm test && npm run typecheck)
```
Expected: all commands exit 0 (test count: 20).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

- [ ] **Step 4: Push and confirm the Actions run is green**

```bash
git push origin claude/great-turing-ihfjsd
gh run watch --repo tech-manthan/manthan-react
```
Expected: `success`.

---

### Task 4: manthan-vue CI

**Files:**
- Create: `manthan-vue/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `manthan-icons` and `manthan-base` built at sibling paths.
- Produces: a green Actions run on `manthan-vue`.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [claude/great-turing-ihfjsd]
  pull_request:
    branches: [claude/great-turing-ihfjsd]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout manthan-icons
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-icons
          path: manthan-icons

      - name: Checkout manthan-base
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-base
          path: manthan-base

      - name: Checkout manthan-vue
        uses: actions/checkout@v4
        with:
          path: manthan-vue

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Build manthan-icons
        working-directory: manthan-icons
        run: |
          npm ci
          npm run build

      - name: Build manthan-base
        working-directory: manthan-base
        run: |
          npm ci
          npm run build

      - name: Install manthan-vue
        working-directory: manthan-vue
        run: npm ci

      - name: Build
        working-directory: manthan-vue
        run: npm run build

      - name: Test
        working-directory: manthan-vue
        run: npm test

      - name: Typecheck
        working-directory: manthan-vue
        run: npm run typecheck
```

- [ ] **Step 2: Verify locally before pushing**

Run from `manthan/`:
```bash
(cd manthan-icons && npm ci && npm run build)
(cd manthan-base && npm ci && npm run build)
(cd manthan-vue && rm -rf node_modules dist && npm ci && npm run build && npm test && npm run typecheck)
```
Expected: all commands exit 0 (test count: 18).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

- [ ] **Step 4: Push and confirm the Actions run is green**

```bash
git push origin claude/great-turing-ihfjsd
gh run watch --repo tech-manthan/manthan-vue
```
Expected: `success`.

---

### Task 5: manthan-svelte CI

**Files:**
- Create: `manthan-svelte/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `manthan-icons` and `manthan-base` built at sibling paths.
- Produces: a green Actions run on `manthan-svelte`.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [claude/great-turing-ihfjsd]
  pull_request:
    branches: [claude/great-turing-ihfjsd]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout manthan-icons
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-icons
          path: manthan-icons

      - name: Checkout manthan-base
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-base
          path: manthan-base

      - name: Checkout manthan-svelte
        uses: actions/checkout@v4
        with:
          path: manthan-svelte

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Build manthan-icons
        working-directory: manthan-icons
        run: |
          npm ci
          npm run build

      - name: Build manthan-base
        working-directory: manthan-base
        run: |
          npm ci
          npm run build

      - name: Install manthan-svelte
        working-directory: manthan-svelte
        run: npm ci

      - name: Build
        working-directory: manthan-svelte
        run: npm run build

      - name: Test
        working-directory: manthan-svelte
        run: npm test

      - name: Typecheck
        working-directory: manthan-svelte
        run: npm run typecheck
```

- [ ] **Step 2: Verify locally before pushing**

Run from `manthan/`:
```bash
(cd manthan-icons && npm ci && npm run build)
(cd manthan-base && npm ci && npm run build)
(cd manthan-svelte && rm -rf node_modules dist && npm ci && npm run build && npm test && npm run typecheck)
```
Expected: all commands exit 0 (test count: 5).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

- [ ] **Step 4: Push and confirm the Actions run is green**

```bash
git push origin claude/great-turing-ihfjsd
gh run watch --repo tech-manthan/manthan-svelte
```
Expected: `success`.

---

### Task 6: manthan-angular CI

**Files:**
- Create: `manthan-angular/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `manthan-icons` and `manthan-base` built at sibling paths.
- Produces: a green Actions run on `manthan-angular`, with a checked Node version ≥ 22.22.3.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [claude/great-turing-ihfjsd]
  pull_request:
    branches: [claude/great-turing-ihfjsd]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout manthan-icons
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-icons
          path: manthan-icons

      - name: Checkout manthan-base
        uses: actions/checkout@v4
        with:
          repository: tech-manthan/manthan-base
          path: manthan-base

      - name: Checkout manthan-angular
        uses: actions/checkout@v4
        with:
          path: manthan-angular

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Check Node version meets Angular's floor
        run: node -e "const [maj,min,patch]=process.versions.node.split('.').map(Number); if (maj<22 || (maj===22 && (min<22 || (min===22 && patch<3)))) { console.error('Node', process.versions.node, 'is below the 22.22.3 floor Angular CLI needs'); process.exit(1); } console.log('Node', process.versions.node, 'OK');"

      - name: Build manthan-icons
        working-directory: manthan-icons
        run: |
          npm ci
          npm run build

      - name: Build manthan-base
        working-directory: manthan-base
        run: |
          npm ci
          npm run build

      - name: Install manthan-angular
        working-directory: manthan-angular
        run: npm ci

      - name: Build
        working-directory: manthan-angular
        run: npm run build

      - name: Test
        working-directory: manthan-angular
        run: npm test

      - name: Typecheck
        working-directory: manthan-angular
        run: npm run typecheck
```

- [ ] **Step 2: Verify locally before pushing**

Run from `manthan/`:
```bash
(cd manthan-icons && npm ci && npm run build)
(cd manthan-base && npm ci && npm run build)
(cd manthan-angular && rm -rf node_modules dist && npm ci && npm run build && npm test && npm run typecheck)
```
Expected: all commands exit 0 (test count: 5). Also confirm local Node is ≥ 22.22.3 with `node -v`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

- [ ] **Step 4: Push and confirm the Actions run is green**

```bash
git push origin claude/great-turing-ihfjsd
gh run watch --repo tech-manthan/manthan-angular
```
Expected: `success`, with the "Check Node version" step logging a version ≥ 22.22.3.

---

### Task 7: Update the roadmap doc

**Files:**
- Modify: `manthan-base/CLAUDE.md` (the copy at `/Users/manthansharma/works/manthan/CLAUDE.md` is a duplicate read at session start — update both if they're meant to stay in sync; verify with `diff` first).

**Interfaces:**
- Consumes: results of Tasks 1–6 (all six CI runs green) and the earlier finding that every repo's GitHub `defaultBranchRef` is already `claude/great-turing-ihfjsd`.
- Produces: an accurate roadmap so the next session doesn't re-investigate branch state or re-propose CI.

- [ ] **Step 1: Diff the two CLAUDE.md copies**

```bash
diff /Users/manthansharma/works/manthan/CLAUDE.md /Users/manthansharma/works/manthan/manthan-base/CLAUDE.md
```

- [ ] **Step 2: Edit roadmap item 1 and item 3 in both copies (if they differ, edit both; if one is a symlink, edit once)**

Replace:
```markdown
1. **Branches:** open PRs, or make `claude/great-turing-ihfjsd` the `main`/default branch. No repo has `main` yet.
2. **npm publishing:** ...
3. **CI:** no repo has GitHub Actions yet. Each repo should run build, test and typecheck, in dependency order (icons → base → frameworks). Angular needs Node ≥ 22.22.3.
```
With:
```markdown
1. **Branches:** done — `claude/great-turing-ihfjsd` is already each repo's GitHub default branch (verified 2026-09-25). No repo has `main`; PRs, when opened, should target `claude/great-turing-ihfjsd`.
2. **npm publishing:** ...
3. **CI:** done — every repo has `.github/workflows/ci.yml` running build, test and typecheck on push/PR to `claude/great-turing-ihfjsd`. Framework repos checkout `manthan-icons` and `manthan-base` as siblings and build them first, since dependencies are `file:../manthan-*` links, not registry versions.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark branches and CI roadmap items done"
```
