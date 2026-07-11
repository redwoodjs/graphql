# db

Workspace package for PostgreSQL + Prisma. Other apps import the shared client:

```ts
import { db, type User } from "db";
```

`test-apps/graphql` and `test-apps/scripts/seed.ts` depend on this package.

## Day to day

From the repo root, `vp run dev` handles the database for you: start or reuse local Postgres (via
[pgserve](https://www.npmjs.com/package/pgserve)), apply migrations, generate the Prisma client, and seed data.

You usually do not need to run anything in this directory manually.

## Layout

| Path                   | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `index.ts`             | Exports `db` (`PrismaClient`) and model types |
| `prisma/schema.prisma` | Schema                                        |
| `prisma/migrations/`   | Migration history                             |
| `pgserve.config.ts`    | Local Postgres dev config                     |
| `vite.config.ts`       | `db#…` task definitions                       |
| `.env`                 | Generated connection URLs (gitignored)        |
| `.pgserve/`            | Local Postgres data directory (gitignored)    |

## Tasks

Run from the repo root with `vp run db#<task>`:

| Task             | When to use                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `dev:prepare`    | Start/reuse Postgres and refresh `.env` before dev (used by root `dev`) |
| `dev:stop`       | Stop the detached Postgres process (run on dev shutdown)                |
| `generate`       | Regenerate `@prisma/client` after schema changes                        |
| `migrate-deploy` | Apply pending migrations (production-style; used by root `seed`)        |
| `pgserve`        | Start Postgres only, on port **8432**                                   |
| `prepare`        | Ensure Postgres is running and connection env is written                |

Root tasks that depend on this package:

```bash
vp run dev    # db#dev:prepare → migrate → seed → start apps
vp run seed   # db#migrate-deploy → test-apps/scripts/seed.ts
```

## Schema changes

1. Edit `prisma/schema.prisma`.
2. Create and apply a migration:

```bash
vp run db#dev:prepare
cd test-apps/db && vp exec prisma migrate dev --name describe_your_change
```

1. Commit the new files under `prisma/migrations/`.

`vp run db#generate` runs automatically as part of the dev prepare flow; run it yourself if you only need the client
regenerated.

## Environment

`db#dev:prepare` writes `test-apps/db/.env` with `DATABASE_URL` and `PRISMA_DATABASE_URL`. See `.env.defaults` for the
expected shape.

GraphQL service tests use an ephemeral RAM-backed Postgres instance via `@rwgql/prisma-dev/test`, so `vp test` does not
read or write the dev database seeded by `test-apps/scripts/seed.ts`.

Override values by editing `.env` locally — it is gitignored. You should not need a separate install step; `pgserve` is
already a devDependency of this package.
