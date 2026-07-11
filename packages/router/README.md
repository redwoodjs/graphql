# @rwgql/router

Redwood-style route trees for RedwoodSDK apps: JSX route definitions, named route helpers, worker
compilation, and edge-cache metadata for public routes.

## Route trees

Define routes in `src/Routes.tsx` using `<Router>`, `<Set>`, `<Private>`, and `<Route>`:

```tsx
import { defineRoutes, Private, Route, Router, Set } from "@rwgql/router/routes";

const routeTree = (
  <Router>
    <Route path="/double" page={DoublePage} name="double" cache />
    <Set wrap={BlogLayout} cache>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />
      <Private unauthenticated="login">
        <Route path="/profile" page={ProfilePage} name="profile" />
      </Private>
    </Set>
  </Router>
);

export default defineRoutes(routeTree);
export { routes, type WebRouteName } from "@/routes";
```

Run `vp run generate-routes` (via `createGenerateRoutesTasks()` in your Vite config) to emit
`src/routeDefinitions.gen.ts` for `buildNamedRoutes()`.

## Public routes and edge caching

RedwoodSDK renders on the edge (SSR/RSC). For public pages, the RWSdk-native alternative to Cedar
build-time prerender is **edge SSR plus CDN caching** — not static HTML generation at build time.

Mark cacheable routes with `cache`:

```tsx
<Set wrap={BlogLayout} cache>
  <Route path="/about" page={AboutPage} name="about" />
</Set>
```

- `cache` on `<Set>` applies to all public child routes.
- `cache` on `<Route>` applies to that route (or overrides a Set default).
- `cache={false}` opts a route out of an inherited Set policy.
- A custom policy string is supported: `cache="public, max-age=300"`.
- Routes inside `<Private>` never receive cache headers, even under a caching Set.

Default policy: `public, max-age=60, stale-while-revalidate=300`.

The router sets `Cache-Control` via RedwoodSDK route middleware before your page handler runs.
Cloudflare can then cache the SSR HTML response at the edge.

Auth, form, and session routes should omit `cache` so responses stay private.

## Worker integration

Compile the route tree for the RedwoodSDK worker:

```tsx
import { withWorkerCompile } from "@rwgql/router/worker";

const { workerRoutes } = withWorkerCompile({
  ...appRoutes,
  routes,
}).compile({
  isAuthenticated: ({ ctx }) => Boolean(ctx.session),
  parseRouteId: (requestInfo) => Number.parseInt(requestInfo.params.id, 10),
  renderPage,
});
```

See `test-apps/web/src/worker.tsx` for a full example with Apollo streaming.

## Package exports

| Export                  | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `@rwgql/router`         | Client helpers (`Link`, `NavLink`, `usePathname`)        |
| `@rwgql/router/routes`  | Route tree JSX primitives, `defineRoutes`, cache helpers |
| `@rwgql/router/worker`  | Worker route compilation                                 |
| `@rwgql/router/codegen` | Route definition generation                              |
| `@rwgql/router/tasks`   | Vite Task helpers (`createGenerateRoutesTasks`)          |

## Cedar parity note

Classic Redwood `prerender` and `*.routeHooks.ts` / `routeParameters()` are intentionally **not**
replicated here. They target build-time SSG, which does not match the RedwoodSDK Worker model. Use
`cache` on public routes instead; see classic Cedar apps for the legacy prerender model.
