#!/usr/bin/env bash
set -euo pipefail

pnpm install
# Fresh Render clones have no dist/ artifacts; vp script cache replays logs without
# restoring output files unless output globs are configured per package.
pnpm exec vp run --no-cache bootstrap
pnpm --filter db exec prisma generate
rm -rf test-apps/graphql/.output
pnpm exec vp run --no-cache graphql#build

# Dev-only db env files must not ship into the runtime image.
rm -f test-apps/db/.env test-apps/db/connection.env

for file in \
  packages/auth/dist/graphql.mjs \
  packages/dbauth/dist/server.mjs \
  packages/graphql-typegen/dist/index.mjs \
  packages/log-formatter/dist/index.mjs; do
  if [ ! -f "$file" ]; then
    echo "Missing workspace build output: $file" >&2
    exit 1
  fi
done
