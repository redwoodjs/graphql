# Migrating a RedwoodJS (Cedar) app to RedwoodGQL

This guide walks through migrating a classic RedwoodJS GraphQL (Cedar) app to RedwoodGQL: `@rwgql/*`
packages, [RedwoodSDK](https://docs.rwsdk.com/) on the web side, and the [Vite+](https://viteplus.dev/guide/)
toolchain.

"Before" snippets use the classic Cedar layout (`web/` + `api/`). "After" snippets point at the migrated
demo in [`test-apps/`](test-apps/) in this repository.

## 1. Before you start

### Target architecture

RedwoodJS splits an app into two yarn workspaces, `web/` and `api/`. RedwoodGQL splits it into three pnpm workspace
packages, each independently runnable:

```text
RedwoodJS (Cedar)                RedwoodGQL
─────────────────                ──────────
web/                             test-apps/web/      RedwoodSDK app (Cloudflare worker SSR + client) with Apollo Client
api/  (functions, graphql,      test-apps/graphql/  GraphQL Yoga on Fastify (Nitro), SDL + services + directives
       services, directives)    test-apps/db/       Prisma schema, migrations, client — its own package
api/db/ (Prisma)
```

### Prerequisites

- [Vite+](https://viteplus.dev/guide/) (`vp`): `curl -fsSL https://vite.plus | bash`. Vite+ manages Node.js
  (>= 22.18.0) and pnpm for the repo — you do not install them separately.
- A RedwoodJS 8.x app using dbAuth, Prisma/PostgreSQL, and Cells (the shape this guide assumes).

### Features that are dropped by design

RedwoodGQL deliberately does not replace everything. Before migrating, know what goes away:

| RedwoodJS feature                                             | Status                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `<Metadata>` and `RedwoodProvider` `titleTemplate`            | Dropped for now. The `<title>` lives in `document.tsx`.             |
| `FatalErrorBoundary`, `DevFatalErrorPage`                     | Dropped. Keep `FatalErrorPage` as a plain component if you want it. |
| Prisma query logging (`emitLogLevels`, `handlePrismaLogging`) | Dropped. Use a bare `PrismaClient`.                                 |
| Storybook, Cell `.mock.ts` files, `mockGraphQLQuery`          | Dropped. Tests use Vitest + Testing Library instead.                |
| `prerender` route flag (SSG)                                  | Dropped. Worker SSR + `@rwgql/router` `cache` headers replace it.   |
| Generators and scaffolds (`yarn rw g ...`)                    | Dropped.                                                            |
| The `yarn rw` CLI                                             | Replaced by `vp` and per-package Vite+ tasks.                       |

### Principles that drive the mechanical changes

- **ESM everywhere** — every `package.json` gets `"type": "module"`; no CommonJS, no Babel.
- **Zero magic** — no auto-imported pages, no global `gql`, no glob imports (`import services from
'src/services/**/*.ts'`). Everything becomes an explicit import; generated files are checked-in `*.gen.ts`.
- **First-class dependencies** — Apollo Client, Yoga, Prisma, react-hook-form, and react-hot-toast are used directly
  instead of through `@redwoodjs/*` re-exports.

## 2. Scaffold the workspace

Replace yarn 4 workspaces and the Redwood toolchain (`@redwoodjs/core`, `@redwoodjs/project-config`,
`@redwoodjs/eslint-config`, `redwood.toml`, prettier, jest configs) with a pnpm workspace managed by Vite+.

1. Create `pnpm-workspace.yaml` at the root (see the root [`pnpm-workspace.yaml`](pnpm-workspace.yaml)):

   ```yaml
   packages:
     - test-apps/*
     - packages/*
   ```

2. Delete `redwood.toml`, `.eslintrc`/`eslintConfig`, `prettier.config.js`, `jest.config.js`, and the
   `@redwoodjs/core` / `@redwoodjs/project-config` devDependencies. Formatting and linting come from `vp check`
   (Oxfmt + Oxlint), configured in the root [`vite.config.ts`](vite.config.ts).
3. Ports move from `redwood.toml` into per-app config: the web dev server port lives in the web app's `dev` task
   (`vp dev --port 8910`) and the API port in `test-apps/graphql/nitro.config.ts` (`devServer.port: 8911`).
4. Root-level orchestration (`yarn rw dev` equivalent) becomes Vite+ tasks in the root `vite.config.ts`. The `dev`
   task in this repo builds workspace packages, starts Postgres, migrates, seeds, and runs web + GraphQL in parallel.

From here on, run `vp install` instead of `yarn install`, and `vp check` / `vp test` instead of
`yarn rw lint` / `yarn rw test`.

## 3. Move the database to its own package

In RedwoodJS, Prisma lives under `api/db/` and the client under `api/src/lib/db.ts`. In RedwoodGQL it becomes a
standalone `db` workspace package that both the GraphQL server and scripts import.

1. Create `test-apps/db/` and move `schema.prisma` + `migrations/` into `test-apps/db/prisma/`.
2. Replace `api/src/lib/db.ts` with a package entry point. Before, the client in `api/src/lib/db.ts` wires
   Redwood's Prisma logging; after ([`test-apps/db/index.ts`](test-apps/db/index.ts)) it is intentionally minimal:

   ```ts
   // test-apps/db/index.ts
   import { PrismaClient } from "@prisma/client";
   import { ensurePrismaDatabaseUrl } from "@rwgql/prisma-dev";

   ensurePrismaDatabaseUrl(import.meta.url, { levelsUp: 0 });

   export const db = new PrismaClient();

   export type * from "@prisma/client";
   ```

3. Wire local Postgres and Prisma tasks with `@rwgql/pgserve-dev` and `@rwgql/prisma-dev` (see
   [`test-apps/db/vite.config.ts`](test-apps/db/vite.config.ts) and [`test-apps/db/pgserve.config.ts`](test-apps/db/pgserve.config.ts)):

   ```ts
   // test-apps/db/pgserve.config.ts
   import { defineDbDevConfig } from "@rwgql/pgserve-dev";
   import { createPrismaEnvAdapter } from "@rwgql/prisma-dev";

   export const pgserveDevConfig = defineDbDevConfig(import.meta.url, {
     appEnvAdapter: createPrismaEnvAdapter(),
   });
   ```

   This replaces `yarn rw prisma ...` commands with tasks like `vp run db#generate`, `vp run db#migrate-deploy`,
   and `vp run db#dev:prepare` (start Postgres via pgserve and sync `DATABASE_URL`).

4. Move `scripts/seed.ts` (previously run with `yarn rw exec seed`) to a plain script executed with `tsx` — in this
   repo it lives at [`test-apps/scripts/seed.ts`](test-apps/scripts/seed.ts) and runs as the root `seed` task. Any other
   `yarn rw exec` scripts become `tsx` scripts the same way.

## 4. Stand up the GraphQL server

RedwoodJS serves GraphQL from a serverless function, `api/src/functions/graphql.ts`, built with
`createGraphQLHandler` and glob imports:

```ts
// Before: api/src/functions/graphql.ts
import { createAuthDecoder } from "@redwoodjs/auth-dbauth-api";
import { createGraphQLHandler } from "@redwoodjs/graphql-server";

import directives from "src/directives/**/*.{js,ts}";
import sdls from "src/graphql/**/*.sdl.{js,ts}";
import services from "src/services/**/*.{js,ts}";

export const handler = createGraphQLHandler({
  authDecoder,
  getCurrentUser,
  directives,
  sdls,
  services /* ... */,
});
```

RedwoodGQL replaces it with GraphQL Yoga on Fastify (served through Nitro), and replaces the glob imports with a
generated, checked-in schema registry from `@rwgql/graphql-typegen`.

1. Create `test-apps/graphql/` and move `api/src/graphql/*.sdl.ts`, `api/src/services/*`, and `api/src/directives/*` into
   `test-apps/graphql/src/` — the SDL, services, and directives move over nearly as-is (see step 5 for auth details and
   the note on `ServiceResolver` below).
2. Add the schema registry codegen. `@rwgql/graphql-typegen` scans `src/graphql/`, `src/directives/`, and
   `src/services/` and generates `typeDefs.gen.ts`, `services.gen.ts`, and `getSchema.gen.ts` — explicit imports
   instead of Redwood's build-time globs. See the `regenerate-registry`, `export-schema`, and `codegen` tasks in
   [`test-apps/graphql/vite.config.ts`](test-apps/graphql/vite.config.ts).
3. Create the Yoga instance ([`test-apps/graphql/src/graphql.ts`](test-apps/graphql/src/graphql.ts)):

   ```ts
   import { createYoga } from "graphql-yoga";
   import { createAuthDecoder } from "@rwgql/dbauth/server";
   import { createAuthYogaPlugin } from "@rwgql/auth/graphql";

   import { getSchema } from "./getSchema.gen.ts";

   const authDecoder = createAuthDecoder({ cookieName, secret: dbAuthOptions.secret });

   export const createGraphqlYoga = (logger: FastifyBaseLogger) =>
     createYoga({
       graphqlEndpoint: "/graphql",
       plugins: [
         createAuthYogaPlugin({
           decodeSession: (request) => authDecoder(request),
           getCurrentUser: (session) => getCurrentUser(session as { id: number }),
         }),
       ],
       schema: getSchema(),
     });
   ```

4. Create the Fastify server entry ([`test-apps/graphql/server.node.ts`](test-apps/graphql/server.node.ts)) and point Nitro
   at it ([`test-apps/graphql/nitro.config.ts`](test-apps/graphql/nitro.config.ts)). The Fastify logger replaces
   `@redwoodjs/api/logger`'s `createLogger` — it is pino underneath, and `@rwgql/log-formatter` gives you Vite-style
   per-operation logs in dev:

   ```ts
   const app = Fastify({
     logger: isDev
       ? { transport: { target: "@rwgql/log-formatter", options: { name: "graphql" } } }
       : true,
   });
   ```

   Delete `api/src/lib/logger.ts`; pass `app.log` (or a pino child logger) where you previously imported `logger`.

5. Update service resolver types. Redwood generated `QueryResolvers` / `MutationResolvers` types via
   `yarn rw g types`; RedwoodGQL generates the same names from the exported SDL via graphql-codegen (the `codegen`
   task) and wraps them in `ServiceResolver` so services stay plain functions callable from tests:

   ```ts
   // Before                                                    // After
   export const posts: QueryResolvers['posts'] =                export const posts: ServiceResolver<QueryResolvers["posts"]> =
     () => db.post.findMany()                                     () => db.post.findMany();
   ```

   Relation resolvers (`Post: { author }`) keep the same shape. One behavioral difference: Prisma's fluent API
   (`db.post.findUnique(...).author()`) is replaced with explicit queries — see
   [`test-apps/graphql/src/services/posts/posts.ts`](test-apps/graphql/src/services/posts/posts.ts).

## 5. Migrate auth (API side)

dbAuth survives the migration almost configuration-for-configuration via `@rwgql/dbauth`.

1. `api/src/functions/auth.ts` (`DbAuthHandler` inside a serverless function) becomes a `DbAuthHandlerOptions` object
   plus one Fastify registration call:

   ```ts
   // test-apps/graphql/src/auth/dbAuthConfig.ts
   import type { DbAuthHandlerOptions } from "@rwgql/dbauth/server";

   export const dbAuthOptions: DbAuthHandlerOptions = {
     authModelAccessor: "user",
     authFields: { id: "id", username: "email", hashedPassword: "hashedPassword" /* ... */ },
     login: {
       /* same handlers, errors, expires as before */
     },
     signup: {
       /* ... */
     },
     forgotPassword: {
       /* ... */
     },
     resetPassword: {
       /* ... */
     },
     cookie: { name: cookieName, attributes: { HttpOnly: true, Path: "/", SameSite: "Lax" } },
     secret: process.env.DB_AUTH_SECRET,
   };
   ```

   ```ts
   // test-apps/graphql/server.node.ts
   import { registerDbAuthRoutes } from "@rwgql/dbauth/server";

   registerDbAuthRoutes(app, dbAuthOptions);
   ```

   The `login`/`signup`/`forgotPassword`/`resetPassword` option shapes intentionally mirror
   `@redwoodjs/auth-dbauth-api`, so this is mostly a copy-paste. Compare
   `api/src/functions/auth.ts` with
   [`test-apps/graphql/src/auth/dbAuthConfig.ts`](test-apps/graphql/src/auth/dbAuthConfig.ts). Note that dbAuth sessions
   now require an explicit `secret` (`DB_AUTH_SECRET` env var) instead of Redwood's `SESSION_SECRET` convention.

2. `api/src/lib/auth.ts` keeps its job (`getCurrentUser`, `requireAuth`, `hasRole`) but swaps imports: `Decoded` from
   `@redwoodjs/api` and errors from `@redwoodjs/graphql-server` become `@rwgql/auth/graphql` exports. One structural
   change: there is no global `context` — `requireAuth(context, { roles })` takes the context explicitly. See
   [`test-apps/graphql/src/auth/auth.ts`](test-apps/graphql/src/auth/auth.ts).
3. The `requireAuth` / `skipAuth` directives are near drop-ins — `createValidatorDirective` moves from
   `@redwoodjs/graphql-server` to `@rwgql/auth/graphql`, and the SDL becomes a plain string (no `gql` tag needed):

   ```ts
   // After: test-apps/graphql/src/directives/requireAuth/requireAuth.ts
   import { createValidatorDirective, type ValidatorDirectiveFunc } from "@rwgql/auth/graphql";

   export const schema = `
     directive @requireAuth(roles: [String]) on FIELD_DEFINITION
   `;

   const validate: ValidatorDirectiveFunc<{ roles?: string[] }> = ({ context, directiveArgs }) => {
     applicationRequireAuth(context as AuthContext, { roles: directiveArgs.roles });
   };

   export default createValidatorDirective(schema, validate);
   ```

## 6. Scaffold the web app (RedwoodSDK)

The web side is the biggest structural change: `App.tsx` + `@redwoodjs/vite` are replaced by a RedwoodSDK app that
renders on a Cloudflare worker and hydrates on the client.

1. Create the RWSDK entry files (full versions in [`test-apps/web/src/`](test-apps/web/src/)):
   - `document.tsx` — the HTML shell. This is where the app `<title>` and stylesheet links live now (there is no
     `<Metadata>`).
   - `client.tsx` — `initClient` + `initClientNavigation` from `rwsdk/client`.
   - `worker.tsx` — replaces `App.tsx`. It decodes the dbAuth session cookie, compiles the route tree into worker
     routes, and renders pages through Apollo's streaming SSR:

     ```tsx
     // test-apps/web/src/worker.tsx (condensed)
     import { defineApp, type RequestInfo } from "rwsdk/worker";
     import { createAuthDecoder } from "@rwgql/dbauth/decoder";
     import { withWorkerCompile } from "@rwgql/router/worker";

     const authDecoder = createAuthDecoder({ cookieName, secret: import.meta.env.DB_AUTH_SECRET });

     const sessionMiddleware = ({ ctx, request }: RequestInfo) => {
       ctx.session = authDecoder(request);
     };

     const { workerRoutes } = withWorkerCompile({ ...appRoutes, routes }).compile({
       isAuthenticated: ({ ctx }) => Boolean(ctx.session),
       renderPage,
     });

     export default defineApp([setCommonHeaders(), sessionMiddleware, ...workerRoutes]);
     ```

2. Replace `RedwoodApolloProvider` with `@rwgql/rwsdk-apollo-client`. The provider chain in `App.tsx`
   (`FatalErrorBoundary` → `RedwoodProvider` → `AuthProvider` → `RedwoodApolloProvider`) becomes a client component
   with `AuthProvider` → `ApolloRwsdkProvider` (see [`test-apps/web/src/GraphQLProvider.tsx`](test-apps/web/src/GraphQLProvider.tsx)):

   ```tsx
   "use client";

   import { ApolloRwsdkProvider, createRwsdkApolloMakeClient } from "@rwgql/rwsdk-apollo-client";

   const makeClient = createRwsdkApolloMakeClient({ uri: graphQLUrl });

   <AuthProvider>
     <ApolloRwsdkProvider makeClient={makeClient} nonce={nonce} transportId={transportId}>
       {children}
     </ApolloRwsdkProvider>
   </AuthProvider>;
   ```

   Full setup, including worker-side streaming, is documented in the
   [`@rwgql/rwsdk-apollo-client` README](../packages/rwsdk-apollo-client/README.md).

3. Migrate the auth client. `web/src/auth.ts` changes two imports and nothing else conceptually:

   ```ts
   // Before                                                // After
   import { createDbAuthClient, createAuth }                import { createAuthentication } from "@rwgql/auth";
     from '@redwoodjs/auth-dbauth-web'                      import { createDbAuthClient } from "@rwgql/dbauth/web";

   const dbAuthClient = createDbAuthClient()                const client = createDbAuthClient({ authUrl });

   export const { AuthProvider, useAuth } =                 export const { AuthProvider, useAuth } =
     createAuth(dbAuthClient)                                 createAuthentication(client);
   ```

4. Replace `@redwoodjs/vite` with the RWSDK + Cloudflare Vite plugins in the web app's config
   ([`test-apps/web/vite.config.mts`](test-apps/web/vite.config.mts)):

   ```ts
   import { defineConfig } from "vite-plus";
   import { redwood } from "rwsdk/vite";
   import { cloudflare } from "@cloudflare/vite-plugin";

   export default defineConfig({
     plugins: [cloudflare({ viteEnvironment: { name: "worker" } }), redwood()],
   });
   ```

## 7. Migrate routes

`Routes.tsx` keeps the exact same JSX vocabulary — `Router`, `Route`, `Private`, `Set`, `path="/posts/{id:Int}"`,
`name`, `wrap` — but the imports change and two pieces of magic become explicit. Compare
`web/src/Routes.tsx` with
[`test-apps/web/src/Routes.tsx`](test-apps/web/src/Routes.tsx).

1. Import route primitives from `@rwgql/router/routes` and export the tree through `defineRoutes`:

   ```tsx
   import { defineRoutes, Private, Route, Router, Set } from "@rwgql/router/routes";

   const routeTree = (
     <Router>
       <Route path="/login" page={LoginPage} name="login" />
       <Set wrap={BlogLayout} cache>
         <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />
         <Route path="/" page={HomePage} name="home" />
         <Route notfound page={NotFoundPage} />
       </Set>
     </Router>
   );

   export default defineRoutes(routeTree);
   ```

2. Import every page explicitly. Redwood auto-imports `src/pages/**` at build time; RedwoodGQL does not — add a
   normal `import HomePage from "@/pages/HomePage/HomePage"` for each page (zero magic).
3. Named routes (`routes.blogPost({ id: 1 })`) come from codegen instead of the router runtime. The
   `generate-routes` task (from `createGenerateRoutesTasks()` in the web `vite.config`) writes
   `src/routeDefinitions.gen.ts`, and a small module builds the typed helper
   (see [`test-apps/web/src/routes.ts`](test-apps/web/src/routes.ts)):

   ```ts
   import { createNamedRoutes } from "@rwgql/router/routes";
   import { routeDefinitions } from "@/routeDefinitions.gen";

   export const routes = createNamedRoutes(routeDefinitions);
   ```

4. Replace `prerender` flags with `cache`. There is no SSG pass; public routes are rendered by the worker and cached
   at the edge via `cache` on a `Route` or `Set` (headers come from `@rwgql/router` — see
   [`packages/router/README.md`](../packages/router/README.md)).

## 8. Migrate pages, layouts, and components

This step is a mechanical import swap across `src/pages/`, `src/layouts/`, and `src/components/`. Components that use
hooks, browser APIs, or event handlers need a `"use client"` directive at the top (RWSDK renders server-first).

| RedwoodJS import                                                           | Replacement                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `import { useMutation } from '@redwoodjs/web'`                             | `import { useMutation } from "@apollo/client/react"`                                                   |
| `import type { TypedDocumentNode } from '@redwoodjs/web'`                  | `@graphql-typed-document-node/core` (usually replaced by `graphql()` documents, step 9)                |
| `import { toast, Toaster } from '@redwoodjs/web/toast'`                    | `import { toast, Toaster } from "react-hot-toast"`                                                     |
| `import { Link, NavLink, navigate, useBlocker } from '@redwoodjs/router'`  | same names from `@rwgql/router`                                                                        |
| `import { routes } from '@redwoodjs/router'`                               | `import { routes } from "@/routes"` (step 7)                                                           |
| `import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'` | `@rwgql/cell` (or app-local aliases, see [`test-apps/web/types/cell.ts`](test-apps/web/types/cell.ts)) |
| `import { Form, TextField, ... } from '@redwoodjs/forms'`                  | app-local shim over react-hook-form (below)                                                            |
| `import { Metadata } from '@redwoodjs/web'`                                | delete — dropped for now                                                                               |
| global `gql` template tag                                                  | `graphql()` from `@/gql` (step 9)                                                                      |

### Cells

Cells keep their `QUERY` / `Loading` / `Empty` / `Failure` / `Success` exports, but the file wires itself up
explicitly with `createCell` from `@rwgql/cell` instead of being transformed at build time. Compare
`web/src/components/AuthorCell/AuthorCell.tsx`
with [`test-apps/web/src/components/AuthorCell/AuthorCell.tsx`](test-apps/web/src/components/AuthorCell/AuthorCell.tsx):

```tsx
"use client";

import { createCell } from "@rwgql/cell";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const QUERY = graphql(`
  query FindAuthorQuery($id: Int!) {
    author: user(id: $id) {
      email
      fullName
    }
  }
`);

export const Loading = () => <span>Loading...</span>;
export const Empty = () => <span>Empty</span>;
export const Failure = ({ error }: CellFailureProps<VariablesOf<typeof QUERY>>) => (
  <span style={{ color: "red" }}>Error: {error?.message}</span>
);
export const Success = ({ author }: CellSuccessProps<ResultOf<typeof QUERY>>) => (
  <span className="author-cell">{author?.fullName}</span>
);

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
```

Cached public pages are also free to skip Cells entirely and fetch during worker SSR with `createServerGraphql` from
`@rwgql/rwsdk-apollo-client/server` — that is what `test-apps/web`'s blog routes do.

### Forms

`@redwoodjs/forms` was a wrapper over react-hook-form. RedwoodGQL uses react-hook-form directly plus a small
app-local shim that recreates the familiar components — copy
[`test-apps/web/src/lib/forms.tsx`](test-apps/web/src/lib/forms.tsx) into your app. It provides `Form`, `Label`,
`TextField`, `TextAreaField`, `NumberField`, `PasswordField`, `Submit`, `FieldError`, `FormError`, and the
`RWGqlError` type, so form JSX is unchanged:

```tsx
// Before                                                   // After
import {                                                    import {
  Form, TextField, TextAreaField,                             Form, TextField, TextAreaField,
  Submit, FieldError, Label,                                  Submit, FieldError, Label,
} from '@redwoodjs/forms'                                   } from "@/lib/forms";
```

A fully migrated page combining all of the swaps (forms, `useMutation`, toast, `useBlocker`, typed documents) is
[`test-apps/web/src/pages/ContactUsPage/ContactUsPage.tsx`](test-apps/web/src/pages/ContactUsPage/ContactUsPage.tsx); diff
it against
`web/src/pages/ContactUsPage/ContactUsPage.tsx`.

## 9. Web typegen

Redwood generated `types/graphql` from a `graphql.config.js` project file plus the global `gql` tag. RedwoodGQL uses
standard GraphQL Code Generator with the client preset:

1. The GraphQL app exports its schema to `schema.graphql` (the `export-schema` task), and
   [`test-apps/graphql/codegen.ts`](test-apps/graphql/codegen.ts) generates:
   - `test-apps/web/src/gql/` — the client preset output. Queries are written as `graphql(\`...\`)`calls and get typed
document nodes automatically, replacing both the global`gql`tag and the`import type { ... } from
     'types/graphql'` pairs.
   - `types/graphql.d.ts` on the server — `QueryResolvers`, `MutationResolvers`, and relation resolver types via
     `createRedwoodResolverGenerateEntry()` from `@rwgql/graphql-typegen/codegen` (replaces `yarn rw g types`).
2. Add [`@0no-co/graphqlsp`](https://github.com/0no-co/graphqlsp) as a TypeScript plugin for in-editor validation of
   the embedded documents, replacing `graphql.config.js`.
3. Run it with `vp run graphql#codegen`; the task graph re-exports the schema and regenerates the registry first.

## 10. Migrate tests

Jest and `@redwoodjs/testing` are replaced by Vitest through Vite+ (`vp test`), with different strategies per side.

### Web tests

- Test runner: Vitest browser mode with Playwright Chromium plus `@testing-library/react` — see the `test` block in
  [`test-apps/web/vite.config.mts`](test-apps/web/vite.config.mts). `render` comes from `@testing-library/react` instead of
  `@redwoodjs/testing/web`.
- Delete `.mock.ts` files and `.stories.tsx` files (`mockGraphQLQuery` and Storybook are dropped).
- Cell and page tests stub `fetch` (or render the exported `Success`/`Empty`/`Failure` components directly) instead
  of relying on Redwood's GraphQL mocking — see
  [`test-apps/web/src/pages/HomePage/HomePage.test.tsx`](test-apps/web/src/pages/HomePage/HomePage.test.tsx):

  ```tsx
  import { render, screen } from "@testing-library/react";
  import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ data: { blogPosts: [] } }) })),
    );
  });
  ```

- Modules like `@/auth` that need a browser-safe stand-in are swapped with a Vite alias in test mode (see the
  `resolve.alias` block in the web `vite.config`).

### API tests

- Scenarios (`defineScenario`, `ScenarioData`, `*.scenarios.ts`) are replaced by plain fixture functions plus a real
  ephemeral test database. `@rwgql/prisma-dev/test` starts a throwaway pgserve Postgres in Vitest's `globalSetup`,
  runs migrations, and tears it down (see
  [`test-apps/graphql/testUtils/globalSetup.ts`](test-apps/graphql/testUtils/globalSetup.ts)); each test resets tables and
  seeds what it needs (see [`test-apps/graphql/testUtils/db.ts`](test-apps/graphql/testUtils/db.ts)).
- Services are called through `callService` from `@rwgql/graphql-typegen/yoga`, which mirrors Redwood's service call
  convention (args first, optional root):

  ```ts
  import { callService } from "@rwgql/graphql-typegen/yoga";

  const result = await callService(post, { id: fixture.post.one.id });
  const author = await callService(Post.author!, {}, result!);
  ```

- `mockRedwoodDirective` / `getDirectiveName` become a small app-local `mockValidatorDirective` helper (copy
  [`test-apps/graphql/testUtils/directives.ts`](test-apps/graphql/testUtils/directives.ts)); directive tests otherwise read
  the same. Compare
  [`test-apps/graphql/src/directives/requireAuth/requireAuth.test.ts`](test-apps/graphql/src/directives/requireAuth/requireAuth.test.ts)
  with its classic Cedar counterpart.

## 11. Clean up and verify

Delete everything the new stack replaced:

- `redwood.toml`, `graphql.config.js`, all `jest.config.js` files, `prettier.config.js`
- `api/src/functions/` (both `graphql.ts` and `auth.ts` — replaced by the Fastify server)
- `api/src/lib/logger.ts` and the Prisma logging in `db.ts`
- `*.mock.ts`, `*.stories.tsx`, and Storybook config
- All `@redwoodjs/*` entries in every `package.json`

Then verify:

```bash
vp install        # install workspace dependencies
vp check          # format, lint, type-check
vp test           # unit + browser tests
vp run dev        # postgres + migrate + seed + web (8910) + graphql (8911)
```

Smoke-test parity by hand: signup/login/logout, forgot/reset password, Posts and Contacts scaffold CRUD (behind
auth), and the public blog pages.

## Appendix: package mapping reference

| RedwoodJS package / export                                                                           | Replacement                                             | Kind      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------- |
| `@redwoodjs/web` → `useMutation`                                                                     | `@apollo/client/react`                                  | npm       |
| `@redwoodjs/web` → `TypedDocumentNode`                                                               | `@graphql-typed-document-node/core` / codegen documents | npm       |
| `@redwoodjs/web` → Cells, `CellSuccessProps`, `CellFailureProps`                                     | `@rwgql/cell`                                           | rwgql     |
| `@redwoodjs/web` → `Metadata`, `RedwoodProvider`                                                     | dropped (title in `document.tsx`)                       | dropped   |
| `@redwoodjs/web` → `FatalErrorBoundary`, `DevFatalErrorPage`                                         | dropped                                                 | dropped   |
| `@redwoodjs/web/toast`                                                                               | `react-hot-toast`                                       | npm       |
| `@redwoodjs/web/apollo` → `RedwoodApolloProvider`                                                    | `@rwgql/rwsdk-apollo-client`                            | rwgql     |
| `@redwoodjs/router` (Link, NavLink, navigate, useBlocker, Router, Route, Private, Set, named routes) | `@rwgql/router` + `/routes` + route codegen             | rwgql     |
| `@redwoodjs/router` → `prerender`                                                                    | worker SSR + `cache` headers (`@rwgql/router`)          | rwgql     |
| `@redwoodjs/forms`                                                                                   | react-hook-form + app-local `lib/forms.tsx` shim        | npm       |
| `@redwoodjs/auth-dbauth-web`                                                                         | `@rwgql/dbauth/web` + `@rwgql/auth`                     | rwgql     |
| `@redwoodjs/auth-dbauth-api`                                                                         | `@rwgql/dbauth/server` + `/decoder`                     | rwgql     |
| `@redwoodjs/graphql-server` → `createGraphQLHandler`                                                 | Yoga + Fastify + `@rwgql/graphql-typegen` registry      | rwgql     |
| `@redwoodjs/graphql-server` → directives, errors                                                     | `@rwgql/auth/graphql`                                   | rwgql     |
| `@redwoodjs/api` → `Decoded`, auth decoding                                                          | `@rwgql/dbauth/decoder`                                 | rwgql     |
| `@redwoodjs/api/logger`                                                                              | pino (Fastify logger) + `@rwgql/log-formatter`          | rwgql/npm |
| `@redwoodjs/api/logger` → Prisma log helpers                                                         | dropped                                                 | dropped   |
| `@redwoodjs/testing/web`                                                                             | Vitest browser mode + `@testing-library/react`          | npm       |
| `@redwoodjs/testing/api` → scenarios                                                                 | fixtures + `@rwgql/prisma-dev/test`                     | rwgql     |
| `@redwoodjs/testing/api` → `mockRedwoodDirective`                                                    | app-local `mockValidatorDirective` helper               | app code  |
| `@redwoodjs/vite`                                                                                    | `rwsdk/vite` + `@cloudflare/vite-plugin` under Vite+    | npm       |
| `@redwoodjs/core`, `project-config`, `eslint-config`                                                 | Vite+ (`vp check`, `vp test`, tasks)                    | Vite+     |
| `yarn rw` CLI, `rw exec` scripts                                                                     | `vp` tasks + `tsx` scripts                              | Vite+     |
| Redwood web typegen (`types/graphql`) + `graphql.config.js`                                          | graphql-codegen client preset + `@0no-co/graphqlsp`     | npm       |
| Storybook + Cell mocks                                                                               | dropped                                                 | dropped   |
| Generators / scaffolds                                                                               | dropped                                                 | dropped   |
