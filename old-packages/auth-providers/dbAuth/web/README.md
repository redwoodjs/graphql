# Authentication

## Contributing

If you want to contribute a new auth provider integration we recommend you
start by implementing it as a custom auth provider in a Redwood App first. When
that works you can package it up as an npm package and publish it on your own.
You can then create a PR on this repo with support for your new auth provider
in our `yarn rw setup auth` cli command. The easiest option is probably to just
look at one of the existing auth providers in
`packages/cli/src/commands/setup/auth/providers` and the corresponding
templates in `../templates`.

If you need help setting up a custom auth provider you can read the auth docs
on the web.

### Contributing to the base auth implementation

If you want to contribute to our auth implementation, the interface towards
both auth service providers and RW apps we recommend you start looking in
`authFactory.ts` and then continue to `AuthProvider.tsx`. `AuthProvider.tsx`
has most of our implementation together with all the custom hooks it uses.
Another file to be accustomed with is `AuthContext.ts`. The interface in there
has pretty good code comments, and is what will be exposed to RW apps.

## getCurrentUser

`getCurrentUser` returns the user information together with
an optional collection of roles used by requireAuth() to check if the user is authenticated or has role-based access.

Use in conjunction with `requireAuth` in your services to check that a user is logged in, whether or not they are assigned a role, and optionally raise an error if they're not.

```js
@param decoded - The decoded access token containing user info and JWT claims like `sub`
@param { token, SupportedAuthTypes type } - The access token itself as well as the auth provider type
@param { APIGatewayEvent event, Context context } - An object which contains information from the invoker
such as headers and cookies, and the context information about the invocation such as IP Address
```

### Examples

#### Checks if currentUser is authenticated

This example is the standard use of `getCurrentUser`.

```js
export const getCurrentUser = async (
  decoded,
  { _token, _type },
  { _event, _context },
) => {
  return { ...decoded, roles: parseJWT({ decoded }).roles }
}
```

#### User details fetched via database query

```js
export const getCurrentUser = async (decoded) => {
  return await db.user.findUnique({ where: { decoded.email } })
}
```

#### User info is decoded from the access token

```js
export const getCurrentUser = async (decoded) => {
  return { ...decoded }
}
```

#### User info is contained in the decoded token and roles extracted

```js
export const getCurrentUser = async (decoded) => {
  return { ...decoded, roles: parseJWT({ decoded }).roles }
}
```

#### User record query by email with namespaced app_metadata roles as Auth0 requires custom JWT claims to be namespaced

```js
export const getCurrentUser = async (decoded) => {
  const currentUser = await db.user.findUnique({
    where: { email: decoded.email },
  })

  return {
    ...currentUser,
    roles: parseJWT({ decoded: decoded, namespace: NAMESPACE }).roles,
  }
}
```

#### User record query by an identity with app_metadata roles

```js
const getCurrentUser = async (decoded) => {
  const currentUser = await db.user.findUnique({
    where: { userIdentity: decoded.sub },
  })
  return {
    ...currentUser,
    roles: parseJWT({ decoded: decoded }).roles,
  }
}
```

#### Cookies and other request information are available in the req parameter, just in case

```js
const getCurrentUser = async (_decoded, _raw, { event, _context }) => {
  const cookies = cookie(event.headers.cookies)
  const session = cookies['my.cookie.name']
  const currentUser = await db.sessions.findUnique({ where: { id: session } })
  return currentUser
}
```

## requireAuth

Use `requireAuth` in your services to check that a user is logged in, whether or not they are assigned a role, and optionally raise an error if they're not.

```js
@param {string=} roles - An optional role or list of roles
@param {string[]=} roles - An optional list of roles

@returns {boolean} - If the currentUser is authenticated (and assigned one of the given roles)

@throws {AuthenticationError} - If the currentUser is not authenticated
@throws {ForbiddenError} If the currentUser is not allowed due to role permissions
```

### Examples

#### Checks if currentUser is authenticated

```js
requireAuth()
```

#### Checks if currentUser is authenticated and assigned one of the given roles

```js
requireAuth({ role: 'admin' })
requireAuth({ role: ['editor', 'author'] })
requireAuth({ role: ['publisher'] })
```
