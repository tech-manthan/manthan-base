#!/usr/bin/env bash
# Clone (if missing), install and build every Manthan repo in dependency order.
# Run from manthan-base: ./scripts/bootstrap.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPOS=(manthan-icons manthan-base manthan-react manthan-vue manthan-svelte manthan-angular)

for repo in "${REPOS[@]}"; do
  if [ ! -d "$ROOT/$repo" ]; then
    git clone "https://github.com/tech-manthan/$repo.git" "$ROOT/$repo"
  fi
done

for repo in "${REPOS[@]}"; do
  echo "▸ $repo"
  (cd "$ROOT/$repo" && npm install --no-audit --no-fund && npm run build)
done
