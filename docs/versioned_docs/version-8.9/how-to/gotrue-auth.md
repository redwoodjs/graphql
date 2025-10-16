# GoTrue Auth

If you've completed the [Authentication section](../tutorial/chapter4/authentication.md) of The Tutorial, you've seen how you can add the [Netlify Identity Widget](https://github.com/netlify/netlify-identity-widget) to your Redwood app in a matter of minutes.
But what do you do if you want to use Netlify Identity, but ditch the widget? There are many cases where we want much more control over our authentication interface and functionality, while still maintaining some _ease-of-use_ when it comes to development.

Enter [GoTrue-JS](https://github.com/netlify/gotrue-js), a client library for interfacing with Netlify Identity's GoTrue API.

In this recipe, we'll:

- [configure Redwood Auth with GoTrue-JS](#generate-auth-configuration),
- [create a Sign Up form](#sign-up),
- [create a Sign In form](#sign-in),
- [create a Sign Out button](#sign-out),
- [add auth links](#auth-links) that display the correct buttons based on our auth state

But first, some housekeeping...

## Prerequisites

Before getting started, there are a few steps you should have completed:

- [Create a Redwood app](../tutorial/chapter1/installation.md)
- [Create a Netlify account](https://www.netlify.com/)
- [Deploy your Netlify site](../tutorial/chapter4/deployment.md)
- [Enable Netlify Identity](#enable-netlify-identity)
- Fire up a dev server: `yarn redwood dev`

### Enable Netlify Identity

Unless you've skipped the [requirements](#prerequisites) section (for shame!), you should already have a Netlify account and a site set up. If you'd be so kind, navigate to your site's **Dashboard**, head to the **Identity** tab, and click **Enable Identity**:

![Netlify Identity screenshot](https://user-images.githubusercontent.com/300/82271191-f5850380-992b-11ea-8061-cb5f601fa50f.png)

Now you should see an Identity API endpoint, e.g. `https://my-bodacious-app.netlify.app/.netlify/identity`. Copy and paste that somewhere&mdash;we'll need it in a moment when we instantiate GoTrue-JS.

## Generate Auth Configuration

Let's start by installing the required packages and generating boilerplate code and files for Redwood Auth, all with this simple [CLI command](../cli-commands.md#setup-auth):

```bash
yarn redwood setup auth goTrue
```

By specifying `goTrue` as the provider, Redwood automatically added the necessary GoTrue-JS config to our App.js. Let's open up `web/src/App.js` and inspect. You should see:

```jsx {1-2,11-14,18,22} title="web/src/App.js"
import { AuthProvider } from '@redwoodjs/auth'
import GoTrue from 'gotrue-js'
import { FatalErrorBoundary } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

const goTrueClient = new GoTrue({
  APIUrl: 'https://MYAPP.netlify.app/.netlify/identity',
  setCookie: true,
})

const App = () => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <AuthProvider client={goTrueClient} type="goTrue">
      <RedwoodApolloProvider>
        <Routes />
      </RedwoodApolloProvider>
    </AuthProvider>
  </FatalErrorBoundary>
)

export default App
```

Time to use that API endpoint we copied from the Netlify Identity page. Replace the value of `APIUrl` with your API endpoint. For example:

```jsx {4} title="web/src/App.js"
// imports...

const goTrueClient = new GoTrue({
  APIUrl: 'https://gotrue-recipe.netlify.app/.netlify/identity',
  setCookie: true,
})
```

That's all for configuration. Easy!

## Sign Up

Sign Up feels like an appropriate place to start building our interface.

Our first iteration won't include features like Email Confirmation or Password Recovery. Those, among other features, will be covered in the Advanced Concepts section of this recipe (coming soon).

To forego email confirmation, head back over to your site's **Netlify Dashboard**, open the **Identity** tab, and click **Settings and usage**.

![Netlify Identity Settings screenshot](https://user-images.githubusercontent.com/458233/86220685-ed86c900-bb51-11ea-9d74-f1ee4ab0a91b.png)

In **Emails > Confirmation template**, click **Edit settings**, check **Allow users to sign up without verifying their email address**, and hit **Save**.

![Netlify Identity Confirmation template](https://user-images.githubusercontent.com/458233/86221090-7140b580-bb52-11ea-8530-b1a7be937c56.png)

Nicely done. Now, back to our app.

**The Sign Up Page**

Let's generate a Sign Up page:

```bash
yarn redwood generate page Signup
```

This adds a Signup [route](../router.md#router-and-route) to our routes file and creates a SignupPage component.

In the just-generated SignupPage component (`web/src/pages/SignupPage/SignupPage.js`), let's import some [Redwood Form components](../forms.md) and add a very basic form to our render component:

```jsx title="web/src/pages/SignupPage/SignupPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'

const SignupPage = () => {
  return (
    <>
      <h1>Sign Up</h1>
      <Form>
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </>
  )
}

export default SignupPage
```

Did I mention it was basic? If you want to add some polish, you might find both the [Redwood Form docs](https://5efa4336f1e71f00081df803--redwoodjs.netlify.app/docs/form) and the [tutorial section on forms](https://5efa4336f1e71f00081df803--redwoodjs.netlify.app/tutorial/everyone-s-favorite-thing-to-build-forms) quite useful. For our purposes, let's just focus on the functionality.

Now that we have a form interface, we're going to want to do something when the user submits it. Let's add an `onSubmit` function to our component and pass it as a prop to our Form component:

```jsx {4-6,11} title="web/src/pages/SignupPage/SignupPage.js"
// imports...

const SignupPage = () => {
  const onSubmit = (data) => {
    // do something here
  }

  return (
    <>
      <h1>Sign Up</h1>
      <Form onSubmit={onSubmit}>
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </>
  )
}
//...
```

The _something_ we need to do is—surprise!—sign up. To do this, we'll need a way to communicate with `<AuthProvider />` and the GoTrue-JS client we passed to it. Look no further than the [`useAuth` hook](https://redwoodjs.com/docs/authentication#api), which lets us subscribe to our auth state and its properties. In our case, we'll be glad to now have access to `client` and, thusly, our GoTrue-JS instance and [all of its functions](https://github.com/netlify/gotrue-js/blob/master/README.md#authentication-examples).

Let's import `useAuth` and destructure `client` from it in our component:

```jsx {2,5} title="web/src/pages/SignupPage/SignupPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'

const SignupPage = () => {
  const { client } = useAuth()

  const onSubmit = (data) => {
    // do something here
  }

  return (
    <>
      <h1>Sign Up</h1>
      <Form onSubmit={onSubmit}>
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </>
  )
}

export default SignupPage
```

And now we'll attempt to create a new user in the `onSubmit` function with [`client.signup()`](https://github.com/netlify/gotrue-js/blob/master/README.md#create-a-new-user) by passing in the `email` and `password` values that we've captured from our form:

```jsx {8-11} title="web/src/pages/SignupPage/SignupPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'

const SignupPage = () => {
  const { client } = useAuth()

  const onSubmit = (data) => {
    client
      .signup(data.email, data.password)
      .then((res) => console.log(res))
      .catch((error) => console.log(error))
  }

  return (
    <>
      <h1>Sign Up</h1>
      <Form onSubmit={onSubmit}>
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </>
  )
}

export default SignupPage
```

Presently, our sign up will work as is, but simply console-logging the response from `client.signup()` is hardly useful behavior.

Let's display errors to the user if there is one. To do this, we'll set up `React.useState()` to manage our error state and conditionally render the error message if there is one. We'll also want to reset the error state at the beginning of every submission with `setError(null)`:

```jsx {6,9,13,20} title="web/src/pages/SignupPage/SignupPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'

const SignupPage = () => {
  const { client } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    client
      .signup(data.email, data.password)
      .then((res) => console.log(res))
      .catch((error) => setError(error.message))
  }

  return (
    <>
      <h1>Sign Up</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </>
  )
}

export default SignupPage
```

Now we can handle a successful submission. Once a user has signed up, we should direct them to the sign in page that we'll be building out in the next section.

Start by [generating](../cli-commands.md#generate-page) a sign in page:

```bash
yarn redwood generate page Signin
```

Back in our `SignupPage`, let's import `routes` and `navigate` from [Redwood Router](../router.md#navigate) and use them to redirect on successful sign up:

```jsx {3,13} title="web/src/pages/SignupPage/SignupPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'
import { routes, navigate } from '@redwoodjs/router'

const SignupPage = () => {
  const { client } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    client
      .signup(data.email, data.password)
      .then(() => navigate(routes.signin()))
      .catch((error) => setError(error.message))
  }

  return (
    <>
      <h1>Sign Up</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </>
  )
}

export default SignupPage
```

Hoorah! We've just added a sign up page and created a sign up form. We created a function to sign up users and we redirect users to the sign up page upon successful submission. Let's move on to Sign In.

## Sign In

Let's get right to it. In the SigninPage we generated in the last section, let's add a basic form with `email` and `password` fields, some error reporting setup, and a hollow `onSubmit` function:

```jsx title="web/src/pages/SigninPage/SigninPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'

const SigninPage = () => {
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    // do sign in here
  }

  return (
    <>
      <h1>Sign In</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign In</Submit>
      </Form>
    </>
  )
}

export default SigninPage
```

Then we'll need to import `useAuth` from `@redwoodjs/auth` and destructure `logIn` so that we can use it in our `onSubmit` function:

```jsx {2,5} title="web/src/pages/SigninPage/SigninPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'

const SigninPage = () => {
  const { logIn } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    // do sign in here
  }

  return (
    <>
      <h1>Sign In</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign In</Submit>
      </Form>
    </>
  )
}

export default SigninPage
```

Now we'll add `logIn` to our `onSubmit` function. This time we'll be passing an object to our function as we're using Redwood Auth's logIn function directly (as opposed to `client`). This object takes an email, password, and a remember boolean. We'll also chain on `then` and `catch` to handle the response:

```jsx {10-14} title="web/src/pages/SigninPage/SigninPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'

const SigninPage = () => {
  const { logIn } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    logIn({ email: data.email, password: data.password, remember: true })
      .then(() => {
        // do something
      })
      .catch((error) => setError(error.message))
  }

  return (
    <>
      <h1>Sign In</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign In</Submit>
      </Form>
    </>
  )
}

export default SigninPage
```

Now then, upon a successful login let's redirect our user back to the home page. First, [generate](../cli-commands.md#generate-page) a homepage (if you haven't already):

```bash
yarn redwood generate page Home /
```

In our `SigninPage`, import `navigate` and `routes` from [`@redwoodjs/router`](../router.md) and add them to the `then` function:

```jsx {3,12} title="web/src/pages/SigninPage/SigninPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'
import { navigate, routes } from '@redwoodjs/router'

const SigninPage = () => {
  const { logIn } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    logIn({ email: data.email, password: data.password, remember: true })
      .then(() => navigate(routes.home()))
      .catch((error) => setError(error.message))
  }

  return (
    <>
      <h1>Sign In</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign In</Submit>
      </Form>
    </>
  )
}

export default SigninPage
```

Well done! We've created a sign in page and form and we successfully handle sign in. Next up...

## Sign Out

Sign out is by far the easiest auth functionality to implement: all we need to do is fire off useAuth's `logOut` method.

Let's start by [generating a component](../cli-commands.md#generate-component) to house our Sign Out Button:

```bash
yarn redwood generate component SignoutBtn
```

In the `web/src/components/SignoutBtn/SignoutBtn.js` file we just generated, let's render a button and add a click handler:

```jsx title="web/src/components/SignoutBtn/SignoutBtn.js"
const SignoutBtn = () => {
  const onClick = () => {
    // do sign out here.
  }
  return <button onClick={() => onClick()}>Sign Out</button>
}

export default SignoutBtn
```

Now we can import [`useAuth` from `@redwoodjs/auth`](../authentication.md#api). We'll destructure its `logOut` method and invoke it in the `onClick` function:

```jsx {1,4,7} title="web/src/components/SignoutBtn/SignoutBtn.js"
import { useAuth } from '@redwoodjs/auth'

const SignoutBtn = () => {
  const { logOut } = useAuth()

  const onClick = () => {
    logOut()
  }

  return <button onClick={() => onClick()}>Sign Out</button>
}

export default SignoutBtn
```

This works as is, but, because the user may be in a private area of your app when the Sign Out button is clicked, we should make sure we also navigate the user away from this page:

```jsx {2,8} title="web/src/components/SignoutBtn/SignoutBtn.js"
import { useAuth } from '@redwoodjs/auth'
import { navigate, routes } from '@redwoodjs/router'

const SignoutBtn = () => {
  const { logOut } = useAuth()

  const onClick = () => {
    logOut().then(() => navigate(routes.home()))
  }

  return <button onClick={() => onClick()}>Sign Out</button>
}

export default SignoutBtn
```

And that's it for Sign Out! Err, of course, we're not rendering it anywhere in our app yet. In the next section, well add some navigation that conditionally renders the appropriate sign up, sign in, and sign out buttons based on our authentication state.

## Auth Links

Here we'll implement some auth-related navigation that conditionally renders the correct links and buttons based on the user's authentication state.

- When the user is not logged in, we should see **Sign Up** and **Sign In**.
- When the user is logged in, we should see **Log Out**.

Let's start by [generating a navigation component](../cli-commands.md#generate-component):

```bash
yarn redwood generate component Navigation
```

This creates `web/src/components/Navigation/Navigation.js`. In that file, let's import [the `Link` component and the `routes` object](../router.md#link-and-named-route-functions) from `@redwoodjs/router`.

We'll also import [`useAuth`](../authentication.md#api) since we'll need to subscribe to the auth state in order for our components to decide what to render:

```jsx title="web/src/components/Navigation/Navigation.js"
import { Link, routes } from '@redwoodjs/router'
import { useAuth } from '@redwoodjs/auth'

const Navigation = () => {
  return <nav></nav>
}

export default Navigation
```

Let's destructure [`isAuthenticated` from the `useAuth`](../authentication.md#api) API and apply it to some conditionals in the render method:

```jsx {5,8-12} title="web/src/components/Navigation/Navigation.js"
import { Link, routes } from '@redwoodjs/router'
import { useAuth } from '@redwoodjs/auth'

const Navigation = () => {
  const { isAuthenticated } = useAuth()
  return (
    <nav>
      {isAuthenticated ? (
        // signed in - show the Sign Out button
      ) : (
        // signed out - show the Sign Up and Sign In links
      )}
    </nav>
  )
}

export default Navigation
```

Because Redwood Auth uses [React's Context API](https://reactjs.org/docs/context.html) to manage and broadcast the auth state, we can be confident that `isAuthenticated` will always be up-to-date, even if it changes from within another component in the tree (so long as it's a child of `<AuthProvider />`). In our case, when `isAuthenticated` changes, React will auto-magically take care of rendering the appropriate components.

So, now let's import our sign out button and add it, as well as sign in and sign up links, to the appropriate blocks in the conditional:

```jsx {3,9-16} title="web/src/components/Navigation/Navigation.js"
import { Link, routes } from '@redwoodjs/router'
import { useAuth } from '@redwoodjs/auth'
import SignoutBtn from 'src/components/SignoutBtn/SignoutBtn'

const Navigation = () => {
  const { isAuthenticated } = useAuth()
  return (
    <nav>
      {isAuthenticated ? (
        <SignoutBtn />
      ) : (
        <>
          <Link to={routes.signup()}>Sign Up</Link>
          <Link to={routes.signin()}>Sign In</Link>
        </>
      )}
    </nav>
  )
}

export default Navigation
```

We have a working navigation component, but we still need to render it somewhere. Let's [generate a layout](../cli-commands.md#generate-layout) called GlobalLayout:

```bash
yarn redwood generate layout Global
```

Then import and render the navigation component in the newly generated `web/src/layouts/GlobalLayout/GlobalLayout.js`:

```jsx title="web/src/layouts/GlobalLayout/GlobalLayout.js"
import Navigation from 'src/components/Navigation/Navigation'

const GlobalLayout = ({ children }) => {
  return (
    <>
      <header>
        <Navigation />
      </header>
      <main>{children}</main>
    </>
  )
}

export default GlobalLayout
```

Finally, we'll import and wrap each of our generated pages in this GlobalLayout component:

**Home**

```jsx title="web/src/pages/HomePage/Homepage.js"
import GlobalLayout from 'src/layouts/GlobalLayout/GlobalLayout'

const HomePage = () => {
  return (
    <GlobalLayout>
      <h1>Home</h1>
      <p>My Gotrue Redwood Auth</p>
    </GlobalLayout>
  )
}

export default HomePage
```

**Sign Up**

```jsx title="web/src/pages/SignupPage/SignupPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'
import { routes, navigate } from '@redwoodjs/router'

import GlobalLayout from 'src/layouts/GlobalLayout/GlobalLayout'

const SignupPage = () => {
  const { client } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    client
      .signup(data.email, data.password)
      .then(() => navigate(routes.signin()))
      .catch((error) => setError(error.message))
  }

  return (
    <GlobalLayout>
      <h1>Sign Up</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign Up</Submit>
      </Form>
    </GlobalLayout>
  )
}

export default SignupPage
```

**Sign In**

```jsx title="web/src/pages/SigninPage/SigninPage.js"
import { Form, TextField, PasswordField, Submit } from '@redwoodjs/forms'
import { useAuth } from '@redwoodjs/auth'
import { navigate, routes } from '@redwoodjs/router'

import GlobalLayout from 'src/layouts/GlobalLayout/GlobalLayout'

const SigninPage = () => {
  const { logIn } = useAuth()
  const [error, setError] = React.useState(null)

  const onSubmit = (data) => {
    setError(null)
    logIn({ email: data.email, password: data.password, remember: true })
      .then(() => navigate(routes.home()))
      .catch((error) => setError(error.message))
  }

  return (
    <GlobalLayout>
      <h1>Sign In</h1>
      <Form onSubmit={onSubmit}>
        {error && <p>{error}</p>}
        <TextField name="email" placeholder="email" />
        <PasswordField name="password" placeholder="password" />
        <Submit>Sign In</Submit>
      </Form>
    </GlobalLayout>
  )
}

export default SigninPage
```

Now we have navigation that renders the correct links and buttons based on our auth state. When the user signs in, they'll see a **Sign Out** button. When the user signs out, they'll see **Sign Up** and **Sign In** links.

## Wrapping Up

We've configured GoTrue with Redwood Auth, created a Sign Up page, a Sign In page, a Sign Out button, and added auth links to our layout. Nicely done!

Thanks for tuning in!

> If you spot an error or have trouble completing any part of this recipe, please feel free to open an issue on [Github](https://github.com/redwoodjs/redwood) or create a topic on our [community forum](https://community.redwoodjs.com/).
