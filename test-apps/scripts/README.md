# Workspace scripts

Project-specific scripts live here. Shared dev tooling lives in packages:

- [`@rwgql/pgserve-dev`](../../packages/pgserve-dev) — PostgreSQL/pgserve lifecycle, CLI utilities, and related Vite
  tasks (ORM-agnostic)
- [`@rwgql/prisma-dev`](../../packages/prisma-dev) — Prisma env loading and Vite tasks (`generate`, `migrate-deploy`)

Pgserve configuration for this app is in [`db/pgserve.config.ts`](../db/pgserve.config.ts). CLI entrypoints
load that module via an absolute `--config` path derived from the workspace root; pgserve defaults come from
`defineDbDevConfig()` in `@rwgql/pgserve-dev`, with the Prisma env adapter from `createPrismaEnvAdapter()` in
`@rwgql/prisma-dev`.

## Local scripts

- `seed.ts` — database seed data (`vp run seed`)

## Vite tasks

Root [`vite.config.ts`](../../vite.config.ts) orchestrates workspace flows:

- `bootstrap` — packs workspace tooling packages via `dependsOn` (`vp run bootstrap`; also runs automatically before `dev`
  and `ready`)
- `dev` — depends on `bootstrap`, `db#dev:prepare`, `seed`, and `graphql#codegen`; then runs
  `rwsdk#dev`, `graphql#dev`, and `db#dev` in parallel via `vp run --parallel`. Each package handles its own
  shutdown on Ctrl+C; `db#dev` holds the session and stops pgserve quietly when it ends
- `seed` — runs `test-apps/scripts/seed.ts`; depends on `db#migrate-deploy`
- `ready` — format, lint, type-check, tests, and build across the workspace (`vp run ready`)

[`db/vite.config.ts`](../db/vite.config.ts) owns the db task graph via `createPgserveTasks()` and
`createPrismaTasks()`:

- `setup-env`, `pgserve`, `prepare`, `dev:prepare`, `dev`, `dev:stop`
- `generate`, `migrate-deploy`

Cross-package ordering uses Vite+ `package#task` notation in `dependsOn` (e.g. `db#migrate-deploy`).

Generated files (gitignored): `db/.pgserve/connection.env`, `db/.env`.
