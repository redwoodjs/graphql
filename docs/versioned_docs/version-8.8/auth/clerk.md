---
sidebar_label: Clerk
---

# Clerk Authentication

:::warning Did you set up Clerk a while ago?

If you set up Clerk a while ago, you may be using a deprecated `authDecoder` that's subject to rate limiting.
This decoder will be removed in the next major.
There's a new decoder you can use right now!
See the [migration guide](https://github.com/redwoodjs/redwood/releases/tag/v5.3.2) for how to upgrade.

:::

To get started, run the setup command:

```text
yarn rw setup auth clerk
```

This installs all the packages, writes all the files, and makes all the code modifications you need.
For a detailed explanation of all the api- and web-side changes that aren't exclusive to Clerk, see the top-level [Authentication](../authentication.md) doc.
But for now, let's focus on Clerk's side of things.

If you don't have a Clerk account yet, now's the time to make one: navigate to https://clerk.dev, sign up, and create an application.
The defaults are good enough to get us going, but feel free to configure things as you wish.
We'll get the application's API keys from its dashboard next.

:::note we'll only focus on the development instance

By default, Clerk applications have two instances, "Development" and "Production".
We'll only focus on the "Development" instance here, which is used for local development.
When you're ready to deploy, switch the instance the dashboard is displaying by clicking "Development" in the header at the top.
How you get your API keys to production depends on your deploy provider.

:::

After you create the application, you should be redirected to its dashboard where you should see the RedwoodJS logo.
Click on it and copy the two API keys it shows into your project's `.env` file:

```bash title=".env"
CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
```

Lastly, in your project's `redwood.toml` file, include `CLERK_PUBLISHABLE_KEY` in the list of env vars that should be available to the web side:

```toml title="redwood.toml"
[web]
  # ...
  includeEnvironmentVariables = [
    "CLERK_PUBLISHABLE_KEY",
  ]
```

That should be enough; now, things should just work.
Let's make sure: if this is a brand new project, generate a home page:

```bash
yarn rw g page Home /
```

There we'll try to sign up by destructuring `signUp` from the `useAuth` hook (import that from `'src/auth'`). We'll also destructure and display `isAuthenticated` to see if it worked:

```tsx title="web/src/pages/HomePage/HomePage.tsx"
import { useAuth } from 'src/auth'

const HomePage = () => {
  const { isAuthenticated, signUp } = useAuth()

  return (
    <>
      {/* MetaTags, h1, paragraphs, etc. */}

      <p>{JSON.stringify({ isAuthenticated })}</p>
      <button onClick={signUp}>sign up</button>
    </>
  )
}
```

Clicking sign up should open a sign-up box and after you sign up, you should see `{"isAuthenticated":true}` on the page.

## Customizing the session token

There's not a lot to the default session token.
Besides the standard claims, the only thing it really has is the user's `id`.
Eventually, you'll want to customize it so that you can get back more information from Clerk.
You can do so by navigating to the "Sessions" section in the nav on the left, then clicking on "Edit" in the "Customize session token" box:

![clerk_customize_session_token](https://github.com/redwoodjs/redwood/assets/32992335/6d30c616-b4d2-4b44-971b-8addf3b79e5a)

As long as you're using the `clerkJwtDecoder`
all the properties you add will be available to the `getCurrentUser` function:

```ts title="api/src/lib/auth.ts"
export const getCurrentUser = async (
  decoded, // 👈 All the claims you add will be available on the `decoded` object
  // ...
) => {
  decoded.myClaim...

  // ...
}
```

## Avoiding feature duplication

Redwood's Clerk integration is based on [Clerk's React SDK](https://clerk.dev/docs/reference/clerk-react/installation).
This means that there's some duplication between the features in the SDK and the ones in `@redwoodjs/auth-clerk-web`.
For example, the SDK ha a `SignedOut` component that redirects a user away from a private page—very much like wrapping a route with Redwood's `Private` component.
We recommend you use Redwood's way of doing things as much as possible since it's much more likely to get along with the rest of the framework.

## Deep dive: the `ClerkStatusUpdater` component

With Clerk, there's a bit more going on in the `web/src/auth.tsx` file than other auth providers.
This is because Clerk is a bit unlike the other auth providers Redwood integrates with in that it puts an instance of its client SDK on the browser's `window` object.
That means Redwood has to wait for it to be ready.
With other providers, Redwood instantiates their client SDK in `web/src/auth.ts{x}`, then passes it to `createAuth`.
With Clerk, instead Redwood uses Clerk components and hooks, like `ClerkLoaded` and `useUser`, to update Redwood's auth context with the client when it's ready.
