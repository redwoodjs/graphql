# Supabase Authentication

To get started, run the setup command:

```bash
yarn rw setup auth supabase
```

This installs all the packages, writes all the files, and makes all the code modifications you need.
For a detailed explanation of all the api- and web-side changes that aren't exclusive to Supabase, see the top-level [Authentication](../authentication.md) doc. For now, let's focus on Supabase's side of things.

## Setup

If you don't have a Supabase account yet, now's the time to make one: navigate to https://supabase.com and click "Start your project" in the top right. Then sign up and create an organization and a project.

While Supabase creates your project, it thoughtfully shows your project's API keys.
(If the page refreshes while you're copying them over, just scroll down a bit and look for "Connecting to your new project".)
We're looking for "Project URL" and "API key" (the `anon`, `public` one).
Copy them into your project's `.env` file as `SUPABASE_URL` and `SUPABASE_KEY` respectively.

There's one more we need, the "JWT Secret", that's not here.
To get that one, click the cog icon ("Project Settings") near the bottom of the nav on the left.
Then click "API", scroll down a bit, and you should see it—"JWT Secret" under "JWT Settings".
Copy it into your project's `.env` file as `SUPABASE_JWT_SECRET`.
All together now:

```bash title=".env"
SUPABASE_URL="..."
SUPABASE_KEY="..."
SUPABASE_JWT_SECRET="..."
```

Lastly, in `redwood.toml`, include `SUPABASE_URL` and `SUPABASE_KEY` in the list of env vars that should be available to the web side:

```toml title="redwood.toml"
[web]
  # ...
  includeEnvironmentVariables = ["SUPABASE_URL", "SUPABASE_KEY"]
```

## Authentication UI

Supabase doesn't redirect to a hosted sign-up page or open a sign-up modal.
In a real app, you'd build a form here, but we're going to hardcode an email and password.

### Basic Example

After you sign up, head to your inbox: there should be a confirmation email from Supabase waiting for you.

Click the link, then head back to your app.
Once you refresh the page, you should see `{"isAuthenticated":true}` on the page.

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
            email: 'your.email@email.com',
            password: 'super secret password',
          })
        }
      >
        sign up
      </button>
    </>
  )
}
```

## Authentication Reference

You will notice that [Supabase Javascript SDK Auth API](https://supabase.com/docs/reference/javascript/auth-api) reference documentation presents methods to sign in with the various integrations Supabase supports: password, OAuth, IDToken, SSO, etc.

The RedwoodJS implementation of Supabase authentication supports these as well, but within the `logIn` method of the `useAuth` hook.

That means that you will see that Supabase documents sign in with email password as:

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'example@email.com',
  password: 'example-password',
})
```

In RedwoodJS, you will always use `logIn` and pass the necessary credential options and also an `authenticationMethod` to declare how you want to authenticate.

```ts
const { logIn } = useAuth()

await logIn({
  authenticationMethod: 'password',
  email: 'example@email.com',
  password: 'example-password',
})
```

### Sign Up with email and password

Creates a new user.

```ts
const { signUp } = useAuth()

await signUp({
  email: 'example@email.com',
  password: 'example-password',
})
```

### Sign Up with email and password and additional user metadata

Creates a new user with additional user metadata.

```ts
const { signUp } = useAuth()

await signUp({
  email: 'example@email.com',
  password: 'example-password',
  options: {
    data: {
      first_name: 'John',
      age: 27,
    },
  },
})
```

### Sign Up with email and password and a redirect URL

Creates a new user with a redirect URL.

```ts
const { signUp } = useAuth()

await signUp({
  email: 'example@email.com',
  password: 'example-password',
  options: {
    emailRedirectTo: 'https://example.com/welcome',
  },
})
```

### Sign in a user with email and password

Log in an existing user with an email and password or phone and password.

- Requires either an email and password or a phone number and password.

```ts
const { logIn } = useAuth()

await logIn({
  authenticationMethod: 'password',
  email: 'example@email.com',
  password: 'example-password',
})
```

### Sign in a user through Passwordless/OTP

Log in a user using magiclink or a one-time password (OTP).

- Requires either an email or phone number.

- This method is used for passwordless sign-ins where a OTP is sent to the user's email or phone number.

```ts
const { logIn } = useAuth()

await logIn({
  authenticationMethod: 'otp',
  email: 'example@email.com',
  options: {
    emailRedirectTo: 'https://example.com/welcome',
  },
})
```

### Sign in a user through OAuth

Log in an existing user via a third-party provider.

- This method is used for signing in using a third-party provider.

- Supabase supports many different [third-party providers](https://supabase.com/docs/guides/auth#providers).

```ts
const { logIn } = useAuth()

await logIn({
  authMethod: 'oauth',
  provider: 'github',
})
```

### Sign in a user with IDToken

Log in a user using IDToken.

```ts
const { logIn } = useAuth()

await logIn({
  authenticationMethod: 'id_token',
  provider: 'apple',
  token: 'cortland-apple-id-token',
})
```

### Sign in a user with SSO

Log in a user using IDToken.

```ts
const { logIn } = useAuth()

await logIn({
  authenticationMethod: 'sso',
  providerId: 'sso-provider-identity-uuid',
  domain: 'example.com',
})
```

### Get Current User

Gets the content of the current user set by API side authentication.

```ts
const { currentUser } = useAuth()

<p>{JSON.stringify({ currentUser })}</p>
```

### Get Current User Metadata

Gets content of the current Supabase user session, i.e., `auth.getSession()`.

```ts
const { userMetadata } = useAuth()

<p>{JSON.stringify({ userMetadata })}</p>
```

### Sign out a user

Inside a browser context, signOut() will remove the logged in user from the browser session and log them out - removing all items from localStorage and then trigger a "SIGNED_OUT" event.

In order to use the signOut() method, the user needs to be signed in first.

```ts
const { logOut } = useAuth()

logOut()
```

### Verify and log in through OTP

Log in a user given a User supplied OTP received via mobile.

- The verifyOtp method takes in different verification types. If a phone number is used, the type can either be sms or phone_change. If an email address is used, the type can be one of the following: signup, magiclink, recovery, invite or email_change.

- The verification type used should be determined based on the corresponding auth method called before verifyOtp to sign up / sign-in a user.

The RedwoodJS auth provider doesn't expose the `veriftyOtp` method from the Supabase SDK directly.

Instead, since you always have access the the Supabase Auth client, you can access any method it exposes.

So, in order to use the `verifyOtp` method, you would:

```ts
const { client } = useAuth()

useEffect(() => {
  const { data, error } = await client.verifyOtp({ phone, token, type: 'sms' })
}, [client])
```

### Access the Supabase Auth Client

Sometimes you may need to access the Supabase Auth client directly.

```ts
const { client } = useAuth()
```

You can then use it to work with Supabase sessions, or auth events.

When using in a React component, you'll have to put any method that needs an `await` in a `useEffect()`.

### Retrieve a session

Returns the session, refreshing it if necessary. The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.

```ts
const { client } = useAuth()

useEffect(() => {
  const { data, error } = await client.getSession()
}, [client])
```

### Listen to auth events

Receive a notification every time an auth event happens.

- Types of auth events: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY`

```ts
const { client } = useAuth()

useEffect(() => {
  const {
    data: { subscription },
  } = client.onAuthStateChange((event, session) => {
    console.log(event, session)
  })

  return () => {
    subscription.unsubscribe()
  }
}, [client])
```
