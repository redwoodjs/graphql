---
description: Render pages ahead of time
---

# Prerender

Prerendering is great for providing a faster experience for your end users. Your pages will be rendered at build-time, saving your user's browser from having to do that job.

We thought a lot about what the developer experience should be for route-based prerendering. The result is one of the smallest APIs imaginable!

:::info How's Prerendering different from SSR/SSG/SWR/ISSG/...?
As Danny said in his [Prerender demo](https://www.youtube.com/watch?v=iorKyMlASZc&t=2844s) at our Community Meetup, the thing all of these have in common is that they render your markup in a Node.js context to produce HTML. The difference is when (build or runtime) and how often.

Redwood currently supports prerendering at _build_ time. So before you deploy your web side, Redwood will render your pages into HTML, and once the JavaScript has been loaded on the browser, the page becomes dynamic.
:::

<!-- [This comment](https://community.redwoodjs.com/t/prerender-proposal/849/12) on our Community forum. -->

## Prerendering a Page

Prerendering a page is as easy as it gets. Just add the `prerender` prop to the Route that you want to prerender:

```jsx {3} title="Routes.js"
<Route path="/" page={HomePage} name="home" prerender/>
```

Then run `yarn rw build` and enjoy the performance boost!

<!-- this doesn't render... -->
<!-- ![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/b2c2aa27-3b2b-4ab7-b514-6ebc963d5312/2021-02-19_20.24.00.gif](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/b2c2aa27-3b2b-4ab7-b514-6ebc963d5312/2021-02-19_20.24.00.gif) -->

### Prerendering all pages in a Set

Just add the `prerender` prop to the Set that wraps all Pages you want to prerender:

```jsx {1} title="Routes.js"
<Set prerender>
  <Route path="/" page={HomePage} name="home" />
  <Route path="/about" page={AboutPage} name="hello" />
</Set>
```

### Not found page

You can also prerender your not found page (a.k.a your 404 page). Just add—you guessed it—the `prerender` prop:

```diff
-      <Route notfound page={NotFoundPage} />
+      <Route notfound page={NotFoundPage} prerender/>
```

This will prerender your NotFoundPage to `404.html` in your dist folder. Note that there's no need to specify a path.

## Private Routes

For Private Routes, Redwood prerenders your Private Routes' `whileLoadingAuth` prop:

```jsx
<PrivateSet>
  // Loading is shown while we're checking to see if the user's logged in
  <Route path="/super-secret-admin-dashboard" page={SuperSecretAdminDashboard} name="ssad" whileLoadingAuth={() => <Loading />} prerender/>
</PrivateSet>
```

### Rendering skeletons while authenticating

Sometimes you want to render the shell of the page, while you wait for your authentication checks to happen. This can make the experience feel a lot snappier to the user, since they don't wait on a blank screen while their credentials are checked.

To do this, make use of the `whileLoadingAuth` prop on `<PrivateSet>` in your Routes file. For example, if we have a dashboard that you need to be logged in to access:

```js ./web/src/Routes.{tsx,js}
// This renders the layout with skeleton loaders in the content area
// highlight-next-line
const DashboardLoader = () => <DashboardLayout skeleton />


const Routes = () => {
  return (
    <Router>
      <Route path="/" page={HomePage} name="home" prerender />
       <Set
        private
        wrap={DashboardLayout}
        unauthenticated="login"
        // 👇 tell the router to render the shell until the user has been authenticated
        // highlight-next-line
        whileLoadingAuth={DashboardLoader}
        prerender
      >
        <Route path="/dashboard" page={DashboardPage} name="dashboard"/>
      {/* ... */}
```

## Dynamic routes & Route Hooks

Let's say you have a route like this

```jsx
<Route path="/blog-post/{id}" page={BlogPostPage} name="blogPost" prerender />
```

To be able to prerender this route you need to let Redwood know what `id`s to use. Why? Because when we are prerendering your pages - at build time - we don't know the full URL i.e. `site.com/blog-post/1` vs `site.com/blog-post/3`. It's up to you to decide whether you want to prerender _all_ of the ids, or if there are too many to do that, if you want to only prerender the most popular or most likely ones.

You do this by creating a `BlogPostPage.routeHooks.js` file next to the page file itself (so next to `BlogPostPage.js` in this case). It should export a function called `routeParameters` that returns an array of objects that specify the route parameters that should be used for prerendering.

So for example, for the route `/blogPost/{Id:Int}` - you would return `[ {id: 55}, {id: 77} ]` which would tell Redwood to prerender `/blogPost/55` and `/blogPost/77`

A single Page component can be used for different routes too! Metadata about the current route will be passed as an argument to `routeParameters` so you can return different route parameters depending on what route it is, if you need to. An example will hopefully make all this clearer.

For the example route above, all you need is this:

```js title="BlogPostPage.routeHooks.js"
export function routeParameters() {
  return [{ id: 1 }, { id: 2 }, { id: 3 }]
}
```

Or, if you wanted to get fancy

```js title="BlogPostPage.routeHooks.js"
export function routeParameters(route) {
  // If we are reusing the BlogPostPage in multiple routes, e.g. /odd/{id} and
  // /blogPost/{id} we can choose what parameters to pass to each route during
  // prerendering
  // highlight-next-line
  if (route.name === 'odd') {
    return [{ id: 1 }, { id: 3 }, { id: 5 }]
  } else {
    return [{ id: 2 }, { id: 4 }, { id: 6 }]
  }
}
```

With the config above three separate pages will be written: `web/dist/blog-post/1.html`, `web/dist/blog-post/2.html`, `web/dist/blog-post/3.html`. A word of warning - if it's just a few pages like this, it's no problem - but this can easily and quickly explode to thousands of pages, which could slow down your builds and deployments significantly (and make them costly, depending on how you're billed).

In these routeHooks scripts you have full access to your database using prisma and all your services, should you need it. You use `import { db } from '$api/src/lib/db'` to get access to the `db` object.

```js title="BlogPostPage.routeHooks.js"
import { db } from '$api/src/lib/db'

export async function routeParameters() {
  return (await db.post.findMany({ take: 7 })).map((post) => ({ id: post.id }))
}
```

Take note of the special syntax for the import, with a dollar-sign in front of api. This lets our tooling (typescript and babel) know that you want to break out of the web side the page is in to access code on the api side. This only works in the routeHook scripts (and scripts in the root /scripts directory).

---

## Prerender Utils

Sometimes you need more fine-grained control over whether something gets prerendered. This may be because the component or library you're using needs access to browser APIs like `window` or `localStorage`. Redwood has three utils to help you handle these situations:

- `<BrowserOnly>`
- `useIsBrowser`
- `isBrowser`

:::tip Heads-up!
If you're prerendering a page that uses a third-party library, make sure it's "universal". If it's not, try calling the library after doing a browser check using one of the utils above.

Look for these key words when choosing a library: _universal module, SSR compatible, server compatible_&mdash;all these indicate that the library also works in Node.js.
:::

### `<BrowserOnly/>` component

This higher-order component is great for JSX:

```jsx
import { BrowserOnly } from '@redwoodjs/prerender/browserUtils'

const MyFancyComponent = () => {
  <h2>👋🏾 I render on both the server and the browser</h2>
  <BrowserOnly>
    <h2>🙋‍♀️ I only render on the browser</h2>
  </BrowserOnly>
}
```

### `useIsBrowser` hook

If you prefer hooks, you can use the `useIsBrowser` hook:

```jsx
import { useIsBrowser } from '@redwoodjs/prerender/browserUtils'

const MySpecialComponent = () => {
  const browser = useIsBrowser()

  return (
    <div className="my-4 p-5 rounded-lg border-gray-200 border">
      <h1 className="text-xl font-bold">Render info:</h1>

      {browser ? <h2 className="text-green-500">Browser</h2> : <h2 className="text-red-500">Prerendered</h2>}
    </div>
  )
}
```

### `isBrowser` boolean

If you need to guard against prerendering outside React, you can use the `isBrowser` boolean. This is especially handy when running initializing code that only works in the browser:

```jsx
import { isBrowser } from '@redwoodjs/prerender/browserUtils'

if (isBrowser) {
  netlifyIdentity.init()
}
```

### Debugging

If you just want to debug your app, or check for possible prerendering errors, after you've built it, you can run this command:

```bash
yarn rw prerender --dry-run
```

We're actively looking for feedback! Do let us know if: everything built ok? you encountered specific libraries that you were using that didn’t work?

---

## Images and Assets

<!-- should name it... -->

Images and assets continue to work the way they used to. For more, see [this doc](assets-and-files.md).

Note that there's a subtlety in how SVGs are handled. Importing an SVG and using it in a component works great:

```jsx {1}
import logo from './my-logo.svg'

function Header() {
  return <logo />
}
```

But re-exporting the SVG as a component requires a small change:

```jsx
// ❌ due to how Redwood handles SVGs, this syntax isn't supported.
import Logo from './Logo.svg'
export default Logo
```

```jsx
// ✅ use this instead.
import Logo from './Logo.svg'

const LogoComponent = () => <Logo />

export default LogoComponent
```

---

## Cell prerendering

As of v3.x, Redwood supports prerendering your Cells with the data you were querying. There's no special config to do here, but a couple of things to note:

#### 1. Prerendering always happens as an unauthenticated user

Because prerendering happens at _build_ time, before any authentication is set, all your queries on a Route marked for prerender will be made as a public user

#### 2. We use your graphql handler to make queries during prerendering

When prerendering we look for your graphql function defined in `./api/src/functions/graphql.{ts,js}` and use it to run queries against it.

### Common Warnings & Errors

#### Could not load your GraphQL handler - the Loading fallback

During builds if you encounter this warning

```shell
⚠️ Could not load your GraphQL handler.
Your Cells have been prerendered in the "Loading" state.
```

It could mean one of two things:

a) We couldn't locate the GraphQL handler at the usual path

or

b) There was an error when trying to import your GraphQL handler - maybe due to missing dependencies or an error in the code

If you've moved this GraphQL function, or we encounter an error executing it, it won't break your builds. All your Cells will be prerendered in their `Loading` state, and will update once the JavaScript loads on the browser. This is effectively skipping prerendering your Cells, but they'll still work!

#### Cannot prerender the query \{queryName\} as it requires auth.

This error happens during builds when you have a Cell on a page you're prerendering that makes a query marked with `@requireAuth` in your SDL.

During prerender you are not logged in ([see point 1](#1-prerendering-always-happens-as-an-unauthenticated-user)), so you'll have to conditionally render the Cell - for example:

```js
import { useAuth } from '@redwoodjs/auth'

const HomePage = () => {
  // highlight-next-line
  const { isAuthenticated } = useAuth

  return (
    <>
      // highlight-next-line
      { isAuthenticated ? <MyPrivateCell /> : <NoAccess /> }
    </>
```

---

## Optimization Tips

### Dynamically loading large libraries

If you dynamically load third-party libraries that aren't part of your JS bundle, using these prerendering utils can help you avoid loading them at build time:

```jsx
import { useIsBrowser } from '@redwoodjs/prerender/browserUtils'

const ComponentUsingAnExternalLibrary = () => {
  const browser = useIsBrowser()

  // if `browser` evaluates to false, this won't be included
  if (browser) {
    loadMyLargeExternalLibrary()
  }

  return (
    // ...
  )
```

### Configuring redirects

Depending on what pages you're prerendering, you may want to change your redirect settings. Keep in mind your redirect settings will vary a lot based on what routes you are prerendering, and the settings of your deployment provider.

Using Netlify as an example:

<details>
<summary>If you prerender your `notFoundPage`, and all your other routes</summary>

You can remove the default redirect to index in your `netlify.toml`. This means the browser will accurately receive 404 statuses when navigating to a route that doesn't exist:

```diff
[[redirects]]
- from = "/*"
- to = "/index.html"
- status = 200
```

This makes your app behave much more like a traditional website, where all the possible routes are defined up front. But take care to make sure you are prerendering all your pages, otherwise you will receive 404s on pages that do exist, but that Netlify hasn't been told about.

</details>

<details>

<summary>If you don't prerender your 404s, but prerender all your other pages</summary>

You can add a 404 redirect if you want:

```diff
[[redirects]]
  from = "/*"
  to = "/index.html"
- status = 200
+ status = 404
```

This makes your app behave much more like a traditional website, where all the possible routes are defined up front. But take care to make sure you are prerendering all your pages, otherwise you will receive 404s on pages that do exist, but that Netlify hasn't been told about.

</details>

### Flash after page load

You might notice a flash after page load. Prerendering pages still has various benefits (such as SEO), but may seem jarring to users if there's a flash.

A quick workaround for this is to make sure whatever page you're seeing the flash on isn't dynamically loaded i.e. prevent code splitting. You can do this by explicitly importing the page in `Routes.js`:

```jsx
import { Router, Route } from '@redwoodjs/router'
// We don't want HomePage to be dynamically loaded
// highlight-next-line
import HomePage from 'src/pages/HomePage'

const Routes = () => {
  return (
    <Router>
      <Route path="/" page={HomePage} name="hello" prerender />
      <Route path="/about" page={AboutPage} name="hello" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
```
