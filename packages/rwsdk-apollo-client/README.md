# @rwgql/rwsdk-apollo-client

Apollo Client + RWSDK SSR streaming. Demo wiring: `test-apps/web/src/worker.tsx`, `test-apps/web/src/GraphQLProvider.tsx`.

## Cedar imports

| Cedar                                             | RedwoodGQL                                              |
| ------------------------------------------------- | ------------------------------------------------------- |
| `@redwoodjs/web/apollo` → `RedwoodApolloProvider` | `ApolloRwsdkProvider` from `@rwgql/rwsdk-apollo-client` |
| `@redwoodjs/web` → `useQuery`, `useMutation`      | `@apollo/client/react`                                  |
| `@redwoodjs/web` → Cells                          | `@rwgql/cell`                                           |
| App shell in `src/App.tsx`                        | Worker `renderPage` + app `GraphQLProvider`             |

`ApolloRwsdkProvider` does not take Cedar's `useAuth` prop. Pass auth via `createRwsdkApolloMakeClient`
(e.g. `credentials: "include"`) and compose `AuthProvider` in your app shell when auth and GraphQL are coupled.

## Exports

- `@rwgql/rwsdk-apollo-client` — client provider, `createRwsdkApolloMakeClient`, streaming links
- `/server` — `createServerGraphql` for Worker SSR page queries (no streaming deps)
- `/worker` — `createApolloRwsdkTransportId`, `renderApolloRwsdkStream`, `renderApolloRwsdkRscStream`, re-exports `/server`
- `/rsc` — RSC helpers (`registerApolloClient`, etc.)

Worker `renderPage` must create a transport id per request, pass `nonce` and `transportId` into your app
provider, and render through the matching stream helper.

## Server GraphQL (cached / SSR pages)

For public routes that fetch on the Worker during SSR (instead of client Cells), configure a server
client once in your app:

```tsx
// test-apps/web/src/graphql.server.ts
import { createServerGraphql } from "@rwgql/rwsdk-apollo-client/server";

export const resolveGraphqlUrl = () =>
  import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:8911/graphql";

export const { renderGraphqlPage } = createServerGraphql({
  resolveUrl: resolveGraphqlUrl,
});
```

Colocate `graphql()` documents in the page file and render with `renderGraphqlPage`:

```tsx
const PostsQueryDocument = graphql(`
  query Posts {
    posts {
      id
      title
    }
  }
`);

const HomePage = async () =>
  renderGraphqlPage(PostsQueryDocument, undefined, ({ posts }) => <PostsList posts={posts} />, {
    isEmpty: ({ posts }) => posts.length === 0,
  });
```

`createServerGraphql` options:

| Option           | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `resolveUrl`     | GraphQL HTTP endpoint (required)               |
| `resolveHeaders` | Extra headers per request (optional)           |
| `renderError`    | Custom error UI (default: `DefaultQueryError`) |

`renderGraphqlPage` accepts optional `{ isEmpty, empty }` (default empty UI: `DefaultGraphqlEmpty`).

## Client factory

```tsx
import { ApolloRwsdkProvider, createRwsdkApolloMakeClient } from "@rwgql/rwsdk-apollo-client";

const makeClient = createRwsdkApolloMakeClient({ uri: graphQLUrl });

<ApolloRwsdkProvider makeClient={makeClient} nonce={nonce} transportId={transportId}>
  {children}
</ApolloRwsdkProvider>;
```
