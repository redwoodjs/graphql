# Setting up dbAuth to be passwordless

Security is really important. Sometimes you don't want to integrate with a third-party authentication services. Whatever the reason, Redwood has you covered with Redwood's dbAuth to authenticate users. This is a great option.

One thing though is now you're collecting the user's login and password. If you'd like to not collect that, an alternative is to generate a token in place of the password. The only data needed for passwordless is the users email address.

In this how-to I'll show you how to set up dbAuth to be passwordless, you'll still need to set up a way to [send emails](../how-to/sending-emails.md), but there's plenty of ways to do that.

## Background

Let me start by sharing a little bit about how passwordless works.

### What is a passwordless authentication method?

A passwordless authentication method is a method of authentication where the user is not required to enter a password. Instead, the user is sent a link to their email address. When they click the link, they are logged in.

Passwordless uses a token that is time-sensitive. So instead of storing a password, we store a token, and an expiration.

That token is generated randomly and is stored in the database.

## How to do it

### 1. Modify the Prisma schema

First, we need to modify the Prisma schema.

If you followed the tutorial you'll have a `User` model. Here's is what it looks like with after the changes.

```jsx {4-6}
model User {
  id                  Int       @id @default(autoincrement())
  name                String?
  email               String    @unique
  loginToken          String
  loginTokenExpiresAt DateTime?
  salt                String?
}
```

Make note of the optional `salt` field.

Once you've made the changes, you'll need to migrate your database.

```bash
yarn rw prisma migrate dev
```

### 2. Setting up the generateToken function

Next, we need to create a function that will generate a token and an expiration date.

If you followed the tutorial, you might not have a `/api/src/services/users/users.js` file. If that's the case, you can create it with the following command using your terminal.

```bash
yarn rw g service users
```

Now that you have the file, let's add the `generateToken` function.

```javascript title="/api/src/services/users/users.js"
// add the following two imports to the top of the file
import crypto from 'node:crypto'
import { hashPassword } from '@redwoodjs/auth-dbauth-api'

// add this to the bottom of the file
export const generateLoginToken = async ({ email }) => {
  try {
    // look up if the user exists
    const lookupUser = await db.user.findFirst({ where: { email } })

    if (!lookupUser) {
      return { message: 'Login Request received' }
    }

    // here we're going to generate a random password of 6 numbers
    const randomNumber = crypto
      .randomInt(0, 1_000_000)
      .toString()
      .padStart(6, '0')
    console.log({ randomNumber }) // email the user this number

    const [loginToken, salt] = hashPassword(randomNumber)
    // now we'll update the user with the new salt and loginToken
    const loginTokenExpiresAt = new Date()
    loginTokenExpiresAt.setMinutes(loginTokenExpiresAt.getMinutes() + 15)
    const data = {
      salt,
      loginToken,
      loginTokenExpiresAt,
    }
    await db.user.update({
      where: { id: lookupUser.id },
      data,
    })

    return { message: 'Login Request received' }
  } catch (error) {
    console.log({ error })
    throw new UserInputError(error.message)
  }
}
```

### 3. Add generateToken to the SDL and secure loginToken

In addition to the new function, we need to add it to the sdl file. While we're here let's also ensure we do not expose the loginToken. This file may be users.sdl.js or users.sdl.ts depending on if you set up Redwood to use JavaScript or TypeScript.

```javascript title="/api/src/graphql/users.sdl.js"
export const schema = gql`
  type User {
    id: Int!
    name: String
    email: String!
  }
  input CreateUserInput {
    name: String
    email: String!
  }
  input UpdateUserInput {
    name: String
    email: String!
  }
  type userTokenResponse {
    message: String!
  }
  type Mutation {
    createUser(input: CreateUserInput!): User! @requireAuth
    updateUser(id: Int!, input: UpdateUserInput!): User! @requireAuth
    deleteUser(id: Int!): User! @requireAuth
    generateToken(email: String!): userTokenResponse! @skipAuth
  }
```

### 4. Modify the auth function

We need to consider how we want to limit the authentication. I've added a expiration date to the token, so we'll need to check that.

```js title="/api/src/functions/auth.js"
// ... other functions
const loginOptions = {
  handler: async (user) => {
    let loginExpiresAt = new Date(user?.loginTokenExpiresAt)
    let now = new Date()

    if (loginExpiresAt < now) {
      throw 'Login token expired'
    }
    // if the user logged in with a token we need to break
    // the token.  We'll do this by clearing the salt and
    // expiration
    // this will make the token a one-time use
    // if the user logged in with a token we need to break
    // the token.  We'll do this by clearing the salt and
    // expiration
    // this will make the token a one-time use
    db.user.update({
      where: { id: user.id },
      data: {
        loginTokenExpiresAt: null,
        salt: null,
      },
    })
    return user
  },
  errors: {
    // here I modified the following, feel free to modify the other messages
    incorrectPassword: 'Incorrect token',
  },
}
// we also need to update the signupOptions
const signupOptions = {
  handler: ({ username, hashedPassword, userAttributes }) => {
    return db.user.create({
      data: {
        email: username,
        loginToken: hashedPassword,
        salt: null,
        name: userAttributes.name,
      },
    })
  },
  // ... othter stuff
}
// and last we need to update the authFields
const authHandler = new DbAuthHandler(event, context, {
  db: db,
  authModelAccessor: 'user',
  authFields: {
    id: 'id',
    hashedPassword: 'loginToken',
    salt: 'salt',
  },
  // ... other stuff
})
```

As of right now, nothing works, lets fix that.

### 5. Making the login form

We need to make a form that will allow the user to enter their email address.

Let's start with the generator.

```bash
yarn rw g component LoginPasswordlessForm
```

This created a component in `web/src/components/LoginPasswordlessForm/LoginPasswordlessForm.js`. Let's update it.

```jsx title="/web/src/components/LoginPasswordlessForm/LoginPasswordlessForm.js"
import {
  Form,
  Label,
  TextField,
  PasswordField,
  Submit,
  FieldError,
} from '@redwoodjs/forms'
import { navigate, routes, Link } from '@redwoodjs/router'
import { Metadata, useMutation } from '@redwoodjs/web'
import { Toaster, toast } from '@redwoodjs/web/toast'
const GENERATE_LOGIN_TOKEN = gql`
  mutation generateLoginToken($email: String!) {
    generateLoginToken(email: $email) {
      message
    }
  }
`

const LoginPasswordlessForm = ({ setWaitingForCode, setEmail }) => {
  const [generateLoginToken] = useMutation(
    GENERATE_LOGIN_TOKEN,
    {
      onCompleted: () => {
        toast.success('Check your email for a login link')
        setWaitingForCode(true)
      },
    }
  )
  const onSubmit = async (data) => {
    setEmail(data.email)
    const response = await generateLoginToken({
      variables: { email: data.email },
      fetchPolicy: 'no-cache',
    })
    if (response.error) {
      toast.error(response.error)
    }
  }

  return (
    <>
      <Metadata title="Login" />
      <main className="rw-main">
        <Toaster toastOptions={{ className: 'rw-toast', duration: 6000 }} />
        <div className="rw-scaffold rw-login-container">
          <div className="rw-segment">
            <header className="rw-segment-header">
              <h2 className="rw-heading rw-heading-secondary">Login</h2>
            </header>

            <div className="rw-segment-main">
              <div className="rw-form-wrapper">
                <Form onSubmit={onSubmit} className="rw-form-wrapper">
                  <Label
                    name="email"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Email
                  </Label>
                  <TextField
                    name="email"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    validation={{
                      required: {
                        value: true,
                        message: 'Email is required',
                      },
                    }}
                  />

                  <FieldError name="email" className="rw-field-error" />
                  <div className="rw-button-group">
                    <Submit className="rw-button rw-button-blue">
                      Send Token
                    </Submit>
                  </div>
                </Form>
              </div>
            </div>
          </div>
          <div className="rw-login-link">
            <span>Don&apos;t have an account?</span>{' '}
            <Link to={routes.signup()} className="rw-link">
              Sign up!
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default LoginPasswordlessForm
```

We aren't rendering it anywhere yet, but when we do it will look like this.

![image](https://user-images.githubusercontent.com/638764/220204773-6c6aaf86-680f-4e2c-877c-3876070254d3.png)

### 6. Making the login with token form

Now we also need a form that will accept the code that was sent to the user.

```bash
yarn rw g component LoginPasswordlessTokenForm
```

```jsx title="/web/src/components/LoginPasswordlessTokenForm/LoginPasswordlessTokenForm.js"
import { useEffect, useRef } from 'react'

import {
  Form,
  Label,
  TextField,
  PasswordField,
  Submit,
  FieldError,
} from '@redwoodjs/forms'
import { navigate, routes, Link } from '@redwoodjs/router'
import { Metadata, useMutation } from '@redwoodjs/web'
import { Toaster, toast } from '@redwoodjs/web/toast'

import { useAuth } from 'src/auth'

const LoginPasswordlessTokenForm = ({ setWaitingForCode, email, code }) => {
  const { isAuthenticated, logIn } = useAuth()
  useEffect(() => {
    if (isAuthenticated) {
      navigate(routes.home())
    }
    if (email && code) {
      console.log('email', email)
      logIn({ username: email, password: code })
    }
  }, [isAuthenticated, email, code, logIn])
  const onSubmit = async (data) => {
    // login expects a username and password for dbauth
    // so we are passing them.
    const response = await logIn({ username: email, password: data.loginToken })
    if (response.error) {
      toast.error(response.error)
    }
  }

  return (
    <>
      <Metadata title="Login" />
      <main className="rw-main">
        <Toaster toastOptions={{ className: 'rw-toast', duration: 6000 }} />
        <div className="rw-scaffold rw-login-container">
          <div className="rw-segment">
            <header className="rw-segment-header">
              <h2 className="rw-heading rw-heading-secondary">
                Login with Token
              </h2>
            </header>

            <div className="rw-segment-main">
              <div className="rw-form-wrapper">
                <Form onSubmit={onSubmit} className="rw-form-wrapper">
                  <Label
                    name="email"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Email
                  </Label>
                  <TextField
                    name="email"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    readOnly={true}
                    defaultValue={email}
                  />

                  <FieldError name="email" className="rw-field-error" />
                  <Label
                    name="loginToken"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Token
                  </Label>
                  <TextField
                    name="loginToken"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                  />

                  <FieldError name="loginToken" className="rw-field-error" />
                  <div className="rw-button-group">
                    <Submit className="rw-button rw-button-blue">Login</Submit>
                  </div>
                  <div className="rw-button-group">
                    <button
                      className="rw-button rw-button-blue"
                      onClick={() => {
                        setWaitingForCode(false)
                      }}
                    >
                      Get another Token
                    </button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
          <div className="rw-login-link">
            <span>Don&apos;t have an account?</span>{' '}
            <Link to={routes.signup()} className="rw-link">
              Sign up!
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default LoginPasswordlessTokenForm
```

This will be the form loaded after the email is entered. Again, we aren't rendering it anywhere, but we will in the next step.

Here's a preview of the form.

![image](https://user-images.githubusercontent.com/638764/220212316-bcc5cde6-53cf-4a65-ab54-0e2763da924a.png)

### 7. Making the new login page

Now each of those forms are controlled with the props we pass to them. We will make a new page that will control the state of the forms.

```bash
yarn rw g page LoginPasswordless
```

```jsx title="/web/pages/LoginPasswordlessPage/LoginPasswordlessPage.js"
import { useEffect, useState } from 'react'

import { useLocation } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import LoginPasswordlessForm from 'src/components/LoginPasswordlessForm/LoginPasswordlessForm'
import LoginPasswordlessTokenForm from 'src/components/LoginPasswordlessTokenForm/LoginPasswordlessTokenForm'

const LoginPasswordlessPage = () => {
  let [waitingForCode, setWaitingForCode] = useState(false)
  let [email, setEmail] = useState()
  let [code, setCode] = useState()
  // onload set email from query string
  let { search } = useLocation()
  useEffect(() => {
    let params = new URLSearchParams(search)
    // decode magic param
    let magic = params.get('magic')
    let decoded = window.atob(params.get('magic'))
    // if magic param exists, set email and waitingForCode
    if (magic) {
          // decoded is email:code
      let [email, code] = decoded.split(':')
      setEmail(email)
      setCode(code)
      setWaitingForCode(true)
    }
  }, [search])

  return (
    <>
      <Metadata
        title="LoginPasswordless"
        description="LoginPasswordless page"
      />

      {!waitingForCode && (
        <LoginPasswordlessForm
          setWaitingForCode={setWaitingForCode}
          setEmail={setEmail}
        />
      )}
      {waitingForCode && (
        <LoginPasswordlessTokenForm
          email={email}
          setWaitingForCode={setWaitingForCode}
          code={code}
        />
      )}
    </>
  )
}

export default LoginPasswordlessPage
```

### 8. Updating the signup page

We need to update the signup page to just take the email.

```jsx title="/web/src/pages/SignupPage/SignupPage.js"
import { useRef } from 'react'
import { useEffect } from 'react'

import {
  Form,
  Label,
  TextField,
  PasswordField,
  FieldError,
  Submit,
} from '@redwoodjs/forms'
import { Link, navigate, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'
import { toast, Toaster } from '@redwoodjs/web/toast'

import { useAuth } from 'src/auth'

const SignupPage = () => {
  const { isAuthenticated, signUp } = useAuth()
  let randomString = (length) {
    if(typeof length == undefined) length = 32;
    const characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    const returnString = Array.from(array)
      .map((value) => characterSet[value % characterSet.length])
      .join('');
    return returnString;
  }
  useEffect(() => {
    if (isAuthenticated) {
      navigate(routes.home())
    }
  }, [isAuthenticated])

  // focus on username box on page load
  const emailRef = useRef(null)
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const onSubmit = async (data) => {
    const response = await signUp({
      username: data.email,
      password: randomString(), // this is a random string and is not important
    })

    if (response.message) {
      toast(response.message)
    } else if (response.error) {
      toast.error(response.error)
    } else {
      // user is signed in automatically
      toast.success('Welcome!')
    }
  }

  return (
    <>
      <Metadata title="Signup" />

      <main className="rw-main">
        <Toaster toastOptions={{ className: 'rw-toast', duration: 6000 }} />
        <div className="rw-scaffold rw-login-container">
          <div className="rw-segment">
            <header className="rw-segment-header">
              <h2 className="rw-heading rw-heading-secondary">Signup</h2>
            </header>

            <div className="rw-segment-main">
              <div className="rw-form-wrapper">
                <Form onSubmit={onSubmit} className="rw-form-wrapper">
                  <Label
                    name="email"
                    className="rw-label"
                    errorClassName="rw-label rw-label-error"
                  >
                    Email
                  </Label>
                  <TextField
                    name="email"
                    className="rw-input"
                    errorClassName="rw-input rw-input-error"
                    ref={emailRef}
                    validation={{
                      required: {
                        value: true,
                        message: 'Email is required',
                      },
                    }}
                  />
                  <FieldError name="email" className="rw-field-error" />

                  <div className="rw-button-group">
                    <Submit className="rw-button rw-button-blue">
                      Sign Up
                    </Submit>
                  </div>
                </Form>
              </div>
            </div>
          </div>
          <div className="rw-login-link">
            <span>Already have an account?</span>{' '}
            <Link to={routes.login()} className="rw-link">
              Log in!
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

export default SignupPage
```

You should see the changes and it should look like this!

![image](https://user-images.githubusercontent.com/638764/220204883-800829ab-e037-41e1-a2da-d47923c4d20c.png)

### 9. Updating the routes

The last thing we need to to do is update the routes to use the new page.

```jsx title="/web/src/Routes.js"
const Routes = () => {
  // other stuff
  return (
    <Router useAuth={useAuth}>
      <Route path="/login" page={LoginPasswordlessPage} name="login" />
      <Route path="/signup" page={SignupPage} name="signup" />
      {/*other routes*/}
    </Router>
  )
}
```

## You did it!

Now that you did you can rest easy. Your authentication relies on just your database but also, if some bad actor got access to it the only user data you have is really the email address.
