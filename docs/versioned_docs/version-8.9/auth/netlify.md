---
sidebar_label: Netlify
---

# Netlify Identity Authentication

To get started, run the setup command:

```bash
yarn rw setup auth netlify
```

This installs all the packages, writes all the files, and makes all the code modifications you need.
For a detailed explanation of all the api- and web-side changes that aren't exclusive to Netlify Identity, see the top-level [Authentication](../authentication.md) doc.
For now let's focus on Netlify's side of things.

There's a catch with Netlify Identity: your app has to be be deployed to Netlify to use it.
If this's a deal breaker for you, there are [other great auth providers to choose from](../authentication.md#official-integrations).
But here we'll assume it's not and that your app is already deployed.
(If it isn't, do that first, then come back. And yes, there's a setup command for that: `yarn rw setup deploy netlify`.)

Once you've deployed your app, go to it's overview, click "Integrations" in the nav at the top, search for Netlify Identity, enable it, and copy the API endpoint in the Identity card.
(It should look something like `https://my-redwood-app.netlify.app/.netlify/identity`.)

Let's do one more thing while we're here to make signing up later a little easier.
Right now, if we sign up, we'll have to verify our email address.
Let's forego that feature for the purposes of this doc: click "Settings and usage", then scroll down to "Emails" and look for "Confirmation template".
Click "Edit settings", tick the box next to "Allow users to sign up without verifying their email address", and click "Save".

Netlify Identity works a little differently than the other auth providers in that you don't have to copy API keys to your project's `.env` and `redwood.toml` files.
Instead, the first time you use it (by, say, calling `signUp` from `useAuth`), it'll ask you for your app's API endpoint.
So let's go ahead and use it: if this is a brand new project, generate a home page.
There we'll try to sign up by destructuring `signUp` from the `useAuth` hook (import that from `'src/auth'`). We'll also destructure and display `isAuthenticated` to see if it worked:

```
yarn rw g page home /
```

```tsx title="web/src/pages/HomePage.tsx"
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

Clicking sign up should open a modal; paste the API endpoint you copied earlier there:

<img width="1522" alt="image" src="https://user-images.githubusercontent.com/32992335/209391973-239d5a12-649f-4e33-9098-cd297034f563.png" />

After that, you should see a sign-up modal. Go ahead and sign up:

<img width="1522" alt="image" src="https://user-images.githubusercontent.com/32992335/209392156-e87a04b8-9ce8-4bc6-bc6b-92a2de8effe3.png" />

After you sign up, you should see `{"isAuthenticated":true}` on the page.
