---
sidebar_label: Auth0
---

# Auth0 Authentication

To get started, run the setup command:

```bash
yarn rw setup auth auth0
```

This installs all the packages, writes all the files, and makes all the code modifications you need.
For a detailed explanation of all the api- and web-side changes that aren't exclusive to Auth0, see the top-level [Authentication](../authentication.md) doc.
For now, let's focus on Auth0's side of things.

If you don't have an Auth0 account yet, now's the time to make one: navigate to https://auth0.com and sign up, then create an application.
When it asks you to choose an application type, choose SPA (single-page application).
Don't bother with the the quick start—just click the "Settings" tab.
We'll get some of our application's API keys here.

You should see two of the four API keys we need right away: "Domain" and "Client ID".
Copy those over to your project's `.env` file as `AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` respectively.

There's one more on this page; scroll down to "Application URIs" and look for "Allowed Callback URLs".
With Auth0, when you log in or sign up, it'll redirect you to Auth0's hosted log-in or sign-up page, then back to your Redwood app.
But where in your Redwood app exactly?
Auth0 needs to know, and this setting tells it.

We'll keep things simple for now and make it "http://localhost:8910", but feel free to configure it as you wish.
Paste "http://localhost:8910" in the text areas below "Allowed Callback URLs", "Allowed Logout URLs" and "Allowed Web Origins" then click "Save Changes" at the bottom of the page.
Copy this one over to your project's `.env` file too, as `AUTH0_REDIRECT_URI`.

Ok, just one more to go: under "Applications" in the nav on the left, click "APIs".
There should be one there already.
We don't need to click into it; next to it's name ("Auth0 Management API" maybe) Auth0 thoughtfully shows what we need, the "API Audience".
Copy it into your project's `.env` file as `AUTH0_AUDIENCE`.
All together now:

```bash title=".env"
AUTH0_DOMAIN="..."
AUTH0_CLIENT_ID="..."
AUTH0_REDIRECT_URI="http://localhost:8910"
AUTH0_AUDIENCE="..."
```

Lastly, include all these env vars in the list of env vars that should be available to the web side in `redwood.toml`:

```toml title="redwood.toml"
[web]
  # ...
  includeEnvironmentVariables = [
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_REDIRECT_URI",
    "AUTH0_AUDIENCE",
  ]
```

That should be enough; now, things should just work.
Let's make sure: if this is a brand new project, generate a home page.
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

Clicking sign up should redirect you to Auth0:

<img width="1522" alt="image" src="https://user-images.githubusercontent.com/32992335/209001246-244db949-31f8-42ff-804e-18f3e423ce89.png" />

After you sign up, you should be redirected back to your Redwood app, and you should see `{"isAuthenticated":true}` on the page.
