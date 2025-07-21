---
description: Monitor errors, performance and more in your Redwood app using Sentry
---

# Sentry

**Setup [Sentry](https://sentry.io/welcome/) error and performance monitoring across your Redwood application.**

From your command line, run:

```
yarn redwood setup monitoring sentry
```

This command installs and sets up [`@sentry/node`](https://docs.sentry.io/platforms/node/) and [`@sentry/react`](https://docs.sentry.io/platforms/javascript/guides/react/), enabling [Prisma](https://docs.sentry.io/platforms/node/performance/database/opt-in/#prisma-orm-integration) and [Browser](https://docs.sentry.io/platforms/javascript/performance/instrumentation/automatic-instrumentation/) tracing to capture 100% of events. The following sections detail how you may further integrate Sentry in your Redwood application.

## Sentry Envelop Plugin

The setup command will install and attempt to setup the [`@envelop/sentry`](https://the-guild.dev/graphql/envelop/plugins/use-sentry) plugin in your application's GraphQL handler. If there is a problem installing it, the following can be used to do so manually.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js title="api/src/functions/graphql.js"
import { useSentry } from '@envelop/sentry'

import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import 'src/lib/sentry'

...

export const handler = createGraphQLHandler({
  directives,
  sdls,
  services,
  extraPlugins: [useSentry()],
  ...
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/functions/graphql.ts"
import { useSentry } from '@envelop/sentry'

import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import 'src/lib/sentry'

...

export const handler = createGraphQLHandler({
  directives,
  sdls,
  services,
  extraPlugins: [useSentry()],
  ...
})
```

</TabItem>
</Tabs>

## Setting the current user

You can associate error and performance events with a unique identity using [`Sentry.setUser`](https://docs.sentry.io/platforms/node/enriching-events/identify-user/). Below is an example of doing so on the API by setting the identity to the user returned by `getCurrentUser`.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js title="api/src/lib/auth.js"
import Sentry from 'src/lib/sentry'

export const getCurrentUser = async (...) => {
  const user = await db.user.findUnique(...)

  Sentry.setUser(user)

  ...
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/lib/auth.ts"
import Sentry from 'src/lib/sentry'

export const getCurrentUser = async (...) => {
  const user = await db.user.findUnique(...)

  Sentry.setUser(user)

  ...
}
```

</TabItem>
</Tabs>

Below we set the current user on the web-side from within a [layout](#generate-layout). Note that the `useEffect` dependency array may vary depending on where you place `Sentry.setUser` in your own application.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/layouts/SentryLayout/SentryLayout.jsx"
import { useEffect } from 'react'

import { useAuth } from 'src/lib/auth'
import Sentry from 'src/lib/sentry'

const SentryLayout = ({ children }) => {
  const { currentUser } = useAuth()

  useEffect(() => Sentry.setUser(currentUser), [currentUser])

  return <>{children}</>
}

export default SentryLayout

```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/layouts/SentryLayout/SentryLayout.tsx"
import React, { useEffect } from 'react'

import { useAuth } from 'src/lib/auth'
import Sentry from 'src/lib/sentry'

interface Props {
  children: React.ReactNode
}

const SentryLayout = ({ children }: Props) => {
  const { currentUser } = useAuth()

  useEffect(() => Sentry.setUser(currentUser), [currentUser])

  return <>{children}</>
}

export default SentryLayout
```

</TabItem>
</Tabs>

## Capturing exceptions

You can make use of Sentry to capture exceptions which occur while executing API [Functions](#generate-function).

```ts title="api/src/functions/foo.{js,ts}"
import Sentry from 'src/lib/sentry'

export const handler = async (event, context) => {
  try {
    ...
  } catch (err) {
    Sentry.captureException(err)
  }
}
```
