# Supabase Middleware

```tsx filename='entry.server.tsx'
import type { TagDescriptor } from '@redwoodjs/web'

import App from './App'
import initSupabaseMiddleware from '@redwoodjs/auth-supabase-middleware'
import { Document } from './Document'

import { getCurrentUser } from '$api/src/lib/auth'

interface Props {
  css: string[]
  meta?: TagDescriptor[]
}

export const registerMiddleware = () => {
  const supabaseAuthMiddleware = initSupabaseMiddleware({
    // Optional. If not set, Supabase will use its own `currentUser` function
    // instead of your app's
    getCurrentUser,
    // Optional. If you wish to enforce RBAC, define a function to return roles.
    // Typically, one will define roles in Supabase in the user's app_metadata.
    getRoles,
  })

  return [supabaseAuthMiddleware]
}

export const ServerEntry: React.FC<Props> = ({ css, meta }) => {
  return (
    <Document css={css} meta={meta}>
      <App />
    </Document>
  )
}
```

## About Roles

### How To Set Roles in Supabase

Typically, one will define roles in Supabase in the user's `app_metadata`.

Supabase `app_metadata` includes the provider attribute indicates the first provider that the user used to sign up with. The providers attribute indicates the list of providers that the user can use to login with.

You can add information to `app_metadata` via `SQL`:

You can set a single role:

```sql
update AUTH.users
  set raw_app_meta_data = raw_app_meta_data || '{"roles": "admin"}'
where
  id = '11111111-1111-1111-1111-111111111111';
```

Or multiple roles:

```sql
update AUTH.users
  set raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin", "owner"]}'
where
  id = '11111111-1111-1111-1111-111111111111';
```

Alternatively, you can update the user's `app_metadata` via the [Auth Admin `update user` api](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid). Only a service role api request can modify the user app_metadata.

> A custom data object to store the user's application specific metadata. This maps to the `auth.users.app_metadata` column. Only a service role can modify. The `app_metadata` should be a JSON object that includes app-specific info, such as identity providers, roles, and other access control information.

```ts
const { data: user, error } = await supabase.auth.admin.updateUserById(
  '11111111-1111-1111-1111-111111111111',
  { app_metadata: { roles: ['admin', 'owner'] } },
)
```

Note: You may see a `role` attribute on the Supabase user. This is an internal claim used by Postgres to perform Row Level Security (RLS) checks.

### What is the default implementation?

If you do not supply a `getRoles` function, we look in the `app_metadata.roles` property.

If you only had a string, e.g.

```
{
  app_metadata: {
    provider: 'email',
    providers: ['email'],
    roles: 'admin', // <-- ⭐ notice this is a string
  },
  user_metadata: {
    ...
}
```

it will convert the roles here to `['admin']`.

If you place your roles somewhere else, you will need to provide an implementation of the `getRoles` function. e.g.

```
{
  app_metadata: {
    provider: 'email',
    providers: ['email'],
    organization: {
      name: 'acme',
      userRoles: ['admin']
    }
  },
  user_metadata: {
    ...
}
```

```js
// In entry.server.jsx
export const registerMiddleware = () => {
  const supabaseAuthMiddleware = initSupabaseMiddleware({
    // Customise where you get your roles from
    getRoles: (decoded) => {
      return decoded.app_metadata.organization?.userRoles
    },
  })

  return [supabaseAuthMiddleware]
}
```
