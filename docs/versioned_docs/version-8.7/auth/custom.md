---
sidebar_label: Custom
---

# Custom Authentication

If Redwood doesn't officially integrate with the auth provider you want to use, you're not out of luck just yet: Redwood has an API you can use to integrate your auth provider of choice.

:::tip Were you using Nhost, magic.link, GoTrue, Okta or Wallet Connect (ethereum)?

If you're here because you're using one of the providers Redwood used to support (Nhost, magic.link, GoTrue, Okta or Wallet Connect (Ethereum)), we've moved the code for them out into their own separate repos:

- [Nhost](https://github.com/redwoodjs/auth-nhost)
- [magic.link](https://github.com/redwoodjs/auth-magiclink)
- [GoTrue](https://github.com/redwoodjs/auth-gotrue)
- [Okta](https://github.com/redwoodjs/auth-okta)
- [WalletConnect (Ethereum)](https://github.com/redwoodjs/auth-walletconnect)

The code has been updated to work with the auth APIs introduced in v4, but it's mostly untested, so no guarantee it'll work.
But together with this doc, we hope getting one of the auth providers working won't be too difficult.

:::

When it comes to writing a custom auth integration, there's a little more work to do than just using one of the ready-made packages. But we'll walk you through all that work here, using [Nhost](https://nhost.io/) as an example. Hopefully you have auth up and running before too long!

To get started, run the setup command:

```bash
yarn rw setup auth custom
```

This makes all the code modifications it can, but whereas with other auth providers, all you have to do now is get your keys, here you have to write some code.

Let's work on the web side first.
Here most of our time will be spent in the `web/src/auth.ts` file.
It comes commented to guide us, but we'll get into it here.
If you're using TypeScript, scroll past the boilerplate interfaces for now to get to our first task, instantiating the client:

```ts title="web/src/auth.ts"
import { createAuthentication } from '@redwoodjs/auth'

// ...

// Replace this with the auth service provider client sdk
const client = {
  login: () => ({
    id: 'unique-user-id',
    email: 'email@example.com',
    roles: [],
  }),
  signup: () => ({
    id: 'unique-user-id',
    email: 'email@example.com',
    roles: [],
  }),
  logout: () => {},
  getToken: () => 'super-secret-short-lived-token',
  getUserMetadata: () => ({
    id: 'unique-user-id',
    email: 'email@example.com',
    roles: [],
  }),
}
```

As the comment says, we need to replace this placeholder client object with an instance of our auth provider's client SDK.
Since we're using Nhost, it's time to navigate to [their docs](https://docs.nhost.io/reference/javascript) for a bit of reading.
We'll take all the work you have to do reading docs for granted here and cut to the chase—setting up Nhost's client looks like this:

```ts
import { NhostClient } from '@nhost/nhost-js'

const client = new NhostClient({
  backendUrl: '...',
})
```

This means we have to install `@nhost/nhost-js` on the web side, so let's go ahead and do that:

```
yarn workspace web add @nhost/nhost-js
```

Then we'll have to make an account, an application, and get it's `backendUrl`.
On your application's dashboard, click "Settings" at the bottom of the the nav on the left, then "Environment Variables", and look for "NHOST_BACKEND_URL".
Copy its value into your project's `.env` file and include it in the list of env vars the web side has access to in your project's `redwood.toml` file:

```bash title=".env"
NHOST_BACKEND_URL="..."
```

```toml title="redwood.toml"
[web]
  # ...
  includeEnvironmentVariables = ["NHOST_BACKEND_URL"]
```

Lastly, let's update `web/src/auth.ts`:

```ts title="web/src/auth.ts"
import { createAuthentication } from '@redwoodjs/auth'

import { NhostClient } from '@nhost/nhost-js'

// ...

const client = new NhostClient({
  backendUrl: process.env.NHOST_BACKEND_URL,
})
```

Ok, that's it for the client.
At this point, you could update some of the TS interfaces, but we'll leave that to you and press on with the integration.
Now we have to create the `useAuth` hook using the client we just made so that the rest of Redwood, like the router, works.
Scroll down a little more to the `createAuthImplementation` function:

```ts title="web/src/auth.ts"
// This is where most of the integration work will take place. You should keep
// the shape of this object (i.e. keep all the key names) but change all the
// values/functions to use methods from the auth service provider client sdk
// you're integrating with
function createAuthImplementation(client: AuthClient) {
  return {
    type: 'custom-auth',
    client,
    login: async () => client.login(),
    logout: async () => client.logout(),
    signup: async () => client.signup(),
    getToken: async () => client.getToken(),
    /**
     * Actual user metadata might look something like this
     * {
     *   "id": "11111111-2222-3333-4444-5555555555555",
     *   "aud": "authenticated",
     *   "role": "authenticated",
     *   "roles": ["admin"],
     *   "email": "email@example.com",
     *   "app_metadata": {
     *     "provider": "email"
     *   },
     *   "user_metadata": null,
     *   "created_at": "2016-05-15T19:53:12.368652374-07:00",
     *   "updated_at": "2016-05-15T19:53:12.368652374-07:00"
     * }
     */
    getUserMetadata: async () => client.getUserMetadata(),
  }
}
```

This may seem like a lot, but it's actually not so bad: it's just about mapping the client's functions to these properties, many of which are pretty straightforward.
The fact that this is eventually the `useAuth` hook is hidden a bit—`createAuthImplementation` gets passed to `createAuthentication`, which returns the `AuthProvider` component and `useAuth` hook—but you don't have to concern yourself with that here.

Again, let's take all the reading and trial and error you'll have to do for granted, though it may be long and tedious:

```ts title="web/src/auth.ts"
function createAuthImplementation(client: AuthClient) {
  return {
    type: 'custom-auth',
    client,
    // See sign in options at https://docs.nhost.io/reference/javascript/auth/sign-in
    login: async (options) => {
      return await client.auth.signIn(options)
    },
    // See sign out options at https://docs.nhost.io/reference/javascript/auth/sign-out
    logout: async (options) => {
      return await client.auth.signOut(options)
    },
    // See sign up options at https://docs.nhost.io/reference/javascript/auth/sign-up
    signup: async (options) => {
      return await client.auth.signUp(options)
    },
    getToken: async () => {
      return (await client.auth.getJWTToken()) || null
    },
    // See https://docs.nhost.io/reference/javascript/auth/get-user
    getUserMetadata: async () => {
      return await client.auth.getUser()
    },
    restoreAuthState: async () => {
      return await client.auth.refreshSession()
    },
  }
}
```

That's it for the web side.
Let's head over to the api side.

## api side

Now that we've set up the web side, every GraphQL request includes a token.
But without a way to verify and decode that token, the api side doesn't know what to do with it, so let's start there.

In `api/src/lib/auth.ts`, make an empty function, `authDecoder`.
Eventually we'll pass this to the `createGraphQLHandler` function in `api/src/graphql.ts`.
The GraphQL server calls it with two arguments, the token and the type. Both are strings:

```ts title="api/src/lib/auth.ts"
export const authDecoder = async (token: string, type: string) => {
  // decode token...
}
```

First, let's make sure that the type is the same as the type in `createAuthImplementation`, `'custom-auth'`. If it's not, we can call it quits:

```ts title="api/src/lib/auth.ts"
export const authDecoder = async (token: string, type: string) => {
  if (type !== 'custom-auth') {
    return null
  }

  // decode token...
}
```

Now let's verify and decode the token.
We'll use the npm module [jose](https://www.npmjs.com/package/jose) to do that; it has a `jwtVerify` function that does exactly what we want.
Go ahead and add it:

```
yarn workspace api add jose
```

For `jwtVerify` to do it's job, it needs the secret.
Time for another trip to your Nhost application's dashboard.
This time you're looking for "NHOST_JWT_SECRET".
Just like "NHOST_BACKEND_URL", it should be in "Settings", "Environment Variables".
(This one is a JSON object, with two properties, `type` and `key`. We just need `key`.)
Add that one to your project's `.env` file (no need to put it in `redwood.toml` though):

```shell title=".env"
NHOST_JWT_SECRET="..."
```

Now we can use it in the `authDecoder`:

```ts title="api/src/lib/auth.ts"
import { jwtVerify } from 'jose'

export const authDecoder = async (token: string, type: string) => {
  if (type !== 'custom-auth') {
    return null
  }

  const secret = new TextEncoder().encode(process.env.NHOST_JWT_SECRET)

  const decoded = await jwtVerify(token, secret)

  return decoded
}
```

Great—now we've got a way of decoding the token in requests coming from the web side.
Just one more important step that's easy to overlook: we have to pass this function to `createGraphQLHandler` in `api/src/functions/graphql.ts`:

```ts title="api/src/functions/graphql.ts"
// highlight-next-line
import { authDecoder, getCurrentUser } from 'src/lib/auth'

// ...

export const handler = createGraphQLHandler({
  // highlight-next-line
  authDecoder,
  getCurrentUser,
  // ...
})
```

That should be enough; now, things should just work.
Let's make sure: if this is a brand new project, generate a home page.
There we'll try to sign up by destructuring `signUp` from the `useAuth` hook (import that from `'src/auth'`). We'll also destructure and display `isAuthenticated` to see if it worked:

```tsx title="web/src/pages/HomePage.tsx"
import { useAuth } from 'src/auth'

const HomePage = () => {
  const { isAuthenticated, signUp } = useAuth()

  return (
    <>
      {/* MetaTags, h1, paragraphs, etc. */}

      <p>{JSON.stringify({ isAuthenticated })}</p>
      <button
        onClick={() =>
          signUp({
            // email: 'your.email@email.com',
            // password: 'super secret password',
          })
        }
      >
        sign up
      </button>
    </>
  )
}
```

Nhost doesn't redirect to a hosted sign-up page or open a sign-up modal.
In a real app, you'd build a form here, but we're going to hardcode an email and password.
One thing you may want to do before signing up: disable email verification, else you'll actually have to verify your email.
Go to back to "Settings" in your Nhost application, but this time click "Sign in methods".
There should be a checkbox there, "Require Verified Emails".
Toggle it off.
Now try signing up and you should see `{"isAuthenticated":true}` on the page.
