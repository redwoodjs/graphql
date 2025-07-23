---
sidebar_label: Firebase
---

# Firebase Authentication

To get started, run the setup command:

```bash
yarn rw setup auth firebase
```

This installs all the packages, writes all the files, and makes all the code modifications you need.
For a detailed explanation of all the api- and web-side changes that aren't exclusive to Firebase, see the top-level [Authentication](../authentication.md) doc.
For now, let's focus on Firebase's side of things.

If you don't have a Firebase account yet, now's the time to make one: navigate to https://firebase.google.com and click "Go to console", sign up, and create a project.
After it's ready, we'll get the API keys.

To get the API keys, we need to add a web app to our project.
Click the `</>` icon in main call to action on the dashboard—"Get started by adding Firebase to your app".
Give your app a nickname, then you should see the API keys.
Since we're only using Firebase for auth, we only need `apiKey`, `authDomain`, and `projectId`.
Copy them into your project's `.env` file:

```bash title=".env"
FIREBASE_API_KEY="..."
FIREBASE_AUTH_DOMAIN="..."
FIREBASE_PROJECT_ID="..."
```

Lastly, include `FIREBASE_API_KEY` and `FIREBASE_AUTH_DOMAIN` in the list of env vars that should be available to the web side (`FIREBASE_PROJECT_ID` is for the api side):

```toml title="redwood.toml"
[web]
  # ...
  includeEnvironmentVariables = ["FIREBASE_API_KEY", "FIREBASE_AUTH_DOMAIN"]
```

We've hooked up our Firebase app to our Redwood app, but if you try it now, it won't work.
That's because we haven't actually enabled auth in our Firebase app yet.

Back to the dashboard one more time: in the nav on the left, click "Build", "Authentication", and "Get started".
We're going to go with "Email/Password" here, but feel free to configure things as you wish.
Click "Email/Password", enable it, and click "Save".

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

"Email/Password" says what it means: Firebase doesn't redirect to a hosted sign-up page or open a sign-up modal.
In a real app, you'd build a form here, but we're going to hardcode an email and password.
After you sign up, you should see `{"isAuthenticated":true}` on the page.
