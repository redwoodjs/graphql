# What is Redwood?

_What follows is a high-level description of Redwood and how it works. If you want to get right to the meat and potatoes of building something, skip ahead to [Chapter 1](../chapter1/prerequisites.md)._

Redwood is a React framework with lots of pre-installed packages and configuration that makes it easy to build full-stack web applications.

Now that the elevator pitch is out of the way, what does that actually _mean_? At its core, Redwood is React plus a bunch of stuff that makes your life as a developer easier. Some of that stuff includes:

- GraphQL
- Prisma
- Jest
- Storybook
- vite
- Babel
- Typescript

What do we mean when we say a "full-stack web application?" We're talking about your classic web app: a UI that's visible in the browser (the frontend), backed by a server and database (the backend). Until React Server Components came along (more on those later) React had no idea a server and/or database existed: it was up to you to somehow get data into your app. Maybe this was done with a `fetch()` or in a build step which would pre-bake some of the data needed right into your components. However the data got there, it wasn't an ideal solution.

One of the core principals behind Redwood was that getting data from the backend should be as simple as possible, going so far as to create conventions around it so that retrieving data for display in a component was as easy as adding a couple of lines of code directly into the component itself. Oh and while we're at it, Redwood will automatically show a loading message while waiting for the data, a different state if there's an error, and even a separate message if the data returned from the server is empty (the classic "blank slate").

## How a Redwood App Works

A Redwood app is actually two apps: a frontend (that's the React part) and a backend, which is your server and talks to a database and other third party systems. Your app is technically a monorepo with two top-level directories: `web` containing the frontend code and `api` containing the backend.

You can start them both with a single command: `yarn redwood dev`

## The Frontend

### The Router

When you open your web app in a browser, React does its thing initializing your app and monitoring the history for changes so that new content can be shown. Redwood features a custom, declarative Router that lets you specify URLs and the requisite pages (just a React component) will be shown. A simple routes file may look something like:

```jsx
import { Route, Router, Set, PrivateSet } from '@redwoodjs/router'
import ApplicationLayout from 'src/layouts/ApplicationLayout'
import { useAuth } from './auth'

const Routes = () => {
  return (
    <Router useAuth={useAuth}>
      <Set wrap={ApplicationLayout}>
        <Route path="/login" page={LoginPage} name="login" />
        <Route path="/signup" page={SignupPage} name="signup" />
        <PrivateSet unauthenticated="login">
          <Route path="/dashboard" page={DashboardPage} name="dashboard" />
          <Route path="/products/{sku}" page={ProductsPage} name="products" />
        </PrivateSet>
      </Set>

      <Route path="/" page={HomePage} name="home" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}
```

You can probably get a sense of how all of this works without ever having seen a Redwood route before! Some routes can be marked as `<PrivateSet>` and will not be accessible without being logged in. Others can be wrapped in a "layout" (again, just a React component) to provide common styling shared between pages in your app.

#### Prerender

If you have content on your page that can be purely static (like public facing marketing-focused pages) you can simply add the `prerender` attribute to your route and that page will be completely rendered (no matter how deeply nested the internal components go) into an HTML page. This page loads instantly, but still contains the JS needed to include React. Once React loads, the page is rehydrated and becomes interactive.

You can also prerender pages that contain variables pulled from the URL, like the `/products/{sku}` route above. Redwood will [iterate](../../prerender.md#dynamic-routes--route-hooks) through all available skus and generate a page for each.

This is Redwood's version of static site generation, aka SSG.

#### Accessibility

Redwood includes a couple of components to [aid screen readers](https://redwoodjs.com/docs/accessibility) in properly navigating your app. The `<RouteAnnouncement>` component tells a screen reader to read something aloud, even though it isn't visible in the browser. And the `<RouteFocus>` tells a reader to skip verbose navigation options at the top of a page and get to the content.

### Authentication

The `<PrivateSet>` route limits access to users that are authenticated, but how do they authenticate? Redwood includes integrations to many popular third party authentication hosts (including [Auth0](https://auth0.com/), [Supabase](https://supabase.com/docs/guides/auth) and [Clerk](https://clerk.com/)). You can also [host your own auth](https://redwoodjs.com/docs/auth/dbauth), or write your own [custom authentication](https://redwoodjs.com/docs/auth/custom) option. If going self-hosted, we include login, signup, and reset password pages, as well as the option to include TouchID/FaceID and third party biometric readers!

Once authenticated, how do you know what a user is allowed to do or not do? Redwood includes helpers for [role-based access control](https://redwoodjs.com/docs/how-to/role-based-access-control-rbac) that integrates on both the front- and backend.

The homepage is accessible _without_ being logged in, browsing to `/` will load the `HomePage` page (component) which itself is just composed of more React components, nothing special there. But, what if the homepage, say, displayed some testimonials from the database? Ahh, now things are getting interesting. Here's where Redwood's handpicked selection of technologies start to take the spotlight.

### GraphQL

Redwood uses GraphQL as the glue between the front- and backends: whenever you want data from the server/database, you're going to retrieve it via GraphQL. Now, we could have just given you raw access to some GraphQL library and let you make those calls yourself. We use [Apollo Client](https://www.apollographql.com/apollo-client) on the frontend and Apollo provides hooks like [useQuery()](https://www.apollographql.com/tutorials/lift-off-part1/10-the-usequery-hook) and [useMutation()](https://www.apollographql.com/tutorials/lift-off-part4/08-the-usemutation-hook) to retrieve and set data, respectively. But Redwood has a much deeper integration.

What if you could have a component that was not only responsible for its own display _but even its own data retrieval_? Meaning everything that component needed in order to display itself could all be self-contained. That includes the code to display while the data is loading, or if something goes wrong. These kinds of uber-components are real, and Redwood calls them "cells."

### Cells

A cell is still just a React component (also called a [single file component](https://www.swyx.io/react-sfcs-here)), it just happens to follow a couple of conventions that make it work as described above:

1. The name of the file ends in "Cell"
2. The file exports several named components, at the very least one named `QUERY` and another named `Success`
3. The file can optionally export several other components, like `Loading`, `Failure` and `Empty`. You can probably guess what those are for!

So, any time React is about to render a cell, the following lifecycle occurs:

1. The `Loading` component is displayed
2. A `useQuery()` hook is fired, using the exported `QUERY`
3. Assuming the data returns successfully, the `Success` component is rendered with one of the props being the data returned from `useQuery()`

As an alternative to step 3, if something went wrong then `Failure` is rendered. If the query returned `null` or an empty array, the `Empty` component is rendered. If you don't export either of those then `Success` will be rendered and it would be up to you to show the error or empty state through conditional code.

Going back to our testimonals hypothetical, a cell to fetch and display them may look something like:

```js
export const QUERY = gql`
  query GetTestimonials {
    testimonials {
      id
      author
      quote
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Failure = ({ error }) => <div>An error occured! {error.message}</div>

export const Success = ({ testimonials }) => {
  return (
    <ul>
      {testimonials.map((test) => {
        <li key={test.id}>{test.quote} — {test.author}</li>
      })}
    </ul>
  )
}
```

(In this case we don't export `Empty` so that if there aren't any testimonials, that section of the final page won't render anything, not even indicating to the user that something is missing.)

If you ever create additional clients for your server (a mobile app, perhaps) you'll be giving yourself a huge advantage by using GraphQL from the start.

Oh, and prerendering also works with cells! At build time, Redwood will start up the GraphQL server and make requests, just as if a user was accessing the pages, rendering the result to plain HTML, ready to be loaded instantly by the browser.

### Apollo Cache

The Apollo Client library also intelligently caches the results of that `QUERY` above, and so if the user browses away and returns to the homepage, the `Success` component is now rendered _immediately_ from the cache! Simultaneously, the query is made to the server again to see if any data has changed since the cache was populated. If so, the new data is merged into the cache and the component will re-render to show any new testimonials since the last time it was viewed.

So, you get performance benefits of an instant display of cached data, but with the guarantee that you won't only see stale data: it's constantly being kept in sync with the latest from the server.

You can also directly manipulate the cache to add or remove entries, or even use it for [state management](https://www.apollographql.com/docs/react/local-state/local-state-management/).

If you're familiar with GraphQL then you know that on the backend you define the structure of data that GraphQL queries will return with "resolvers." But GraphQL itself doesn't know anything about talking to databases. How does the raw data in the database make it into those resolvers? That's where our next package comes in.

## The Backend

Now we're into the backend code in the `api` directory.

### Prisma

[Prisma](https://www.prisma.io/) is the package Redwood uses to talk to your database, and provides automated migrations, type-safety and auto-completion in your IDE. Your Redwood app will contain a file called `schema.prisma` that will reflect your current database schema:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

model Testimonial {
  id        Int       @id @default(autoincrement())
  author    String    @unique
  quote     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

Prisma has a couple of command line tools that take changes to this file and turn them into [SQL DDL commands](https://www.sqlshack.com/sql-ddl-getting-started-with-sql-ddl-commands-in-sql-server/) which are executed against your database to update its structure to match.

#### GraphQL

Redwood abstracts the concept of GraphQL resolver into a "service." You will generally start with one service function per GraphQL query/mutation. For example, going back to our testimonials example, you would have a service function named `testimonials()` that returns the data for the GraphQL query named `testimonials`. That function uses Prisma to query the database:

```js
import { db } from 'src/lib/db'

export const testimonials = () => {
  return db.testimonial.findMany()
}
```

How does GraphQL know to go here for its `testimonials` resolver? Redwood introduces an "SDL" file, which contains the mapping from GraphQL to the world of services:

```js
export const schema = gql`
  type Testimonial {
    id: Int!
    author: String!
    quote: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Query {
    testimonials: [Testimonial!] @skipAuth
  }
`
```

Any definitions listed in the `type Query` section are expected to have a service function with the same name: `testimonials` -> `testimonials()`

### Security

Redwood is secure-by-default: no GraphQL request will be fulfilled if made by an unauthenticated user. You can choose to allow access to certain query/mutations to the public, but you'll have to enable that manually for each option. Consider a more complete Testimonials SDL file:

```js
export const schema = gql`
  type Testimonial {
    id: Int!
    author: String!
    quote: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CreateTestimonialInput {
    author: String!
    quote: String!
  }

  type Query {
    testimonials: [Testimonial!] @skipAuth
  }

  type Mutation {
    createTestimonal($input: CreateTestimonialInput!): Testimonial! @requireAuth
    deleteTestimonal($id: Int!): Testimonial! @requireAuth
  }
`
```

The `testimonials` query is marked with the [GraphQL directive](../../directives.md) `@skipAuth` meaning that requests here should _not_ be limited to authenticated users. However, the critical `createTestimonial` and `deleteTestimonial` mutations are marked `@requireAuth`, and so can only be called by a logged in user.

Redwood's backend GraphQL server is powered by [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) and so you have access to everything that makes Yoga secure and performant: rate and depth limiting, logging, directives, and a ton more.

#### Auth

If a user is logged in, they will be available in any of your services in the `context` object, available everywhere, all the time:

```js
import { db } from 'src/lib/db'
import { AuthenticationError } from '@redwoodjs/graphql-server'

export const createTestimonial = ({ data }) => {
  if (context.currentUser.roles.includes('admin')) {
    return db.testimonial.create({ data })
  } else {
    throw new AuthenticationError(
      'You are not authorized to create testimonials'
    )
  }
}
```

So `@requireAuth` and `@skipAuth` provide a gate around entire GraphQL queries for authenticated users, but once inside you can be more fine-grained based on who the user actually is.

## Generators

Let's take a look at an often overlooked tool in many frameworks' kit: the command line tools. Redwood has focused extensively on these, and one of the most powerful are the "generators." These are used to create files, setup integrations, execute scripts, start the dev server, and more.

A huge timesaver is generating layouts, pages and cells. There isn't much boilerplate in Redwood's files, but it's still nice to have them built out for, even going so far as creating tests for the bare functionality (more on tests in a minute).

They also provide easy access to dev tools like Graphiql (for executing GraphQL functions against your server) and Prisma Studio (providing a full GUI for your database).

![image](https://github.com/redwoodjs/redwood/assets/300/18c928ff-aa34-4f06-941b-69c8035cee61)

![image](https://github.com/redwoodjs/redwood/assets/300/11f7553e-26a5-4a8f-b618-b9464828cafa)

Redwood has setup commands for UI libraries like [Tailwind](https://tailwindcss.com/) and [Mantine](https://mantine.dev/), and even provides access to experimental new features, making it easy to enable and disable them on the fly.

There's even an interactive console that lets you, for example, execute Prisma queries to fetch data from the database. This comes in handy when you want to double check that your query is fetching the data you think it is, without dropping a bunch of `console.log()` statements in your code and reloading the browser.

## Jest

Being able to develop a full-stack application this easily is great, but how do you verify that it's working as intended? That's where a great test suite comes in. [Jest](https://jestjs.io/) is a test framework that, as they say, focuses on simplicity. We felt that it was a natural fit with Redwood, and so most files you can generate will include the related test file automatically (pre-filled with some tests, even!).

Redwood includes several Jest helpers and matchers, allowing you to mock out GraphQL requests, database data, logged in users, and more.

- [Scenarios](../../testing#scenarios) accept a simple JSON object and pre-populate your database with just that data so it's in a known state that you can test against.
- [Mock Service Worker](../../testing#mock-service-worker) allow you to simulate the response from API calls, including GraphQL
- `mockCurrentUser()` is a helper that allows you to stub out the user that's logged in on either the `web` or `api` codebase, without having to worry about actually passing them through your auth provider

![image](https://github.com/redwoodjs/redwood/assets/300/614d9867-9765-474f-8b8b-c9217f3f7dcf)

You can write Jest tests in both the front- and backend of your app.

## Storybook

While Jest can test your code, [Storybook](https://storybook.js.org/) can be used to catalog and test your UI. They call themselves a "frontend workshop for building UI components in isolation" and we couldn't agree more. Build your components separate from your app, even having props be dynamic while viewing their effects. All you have to do is run `yarn redwood storybook`.

Redwood adds data mocking for Storybook so that you can display components that would normally be populated with data from GraphQL, but without needing a server running.

![image](https://github.com/redwoodjs/redwood/assets/300/2753a292-01d4-41b9-9975-edc1f8c1c3ac)

Storybook is strictly a frontend codebase concern.

## vite, Babel and Typescript

Notice at no point above did we say "and then we need to write configuration for this package..." Redwood has done all of that for you and will continue to do that with every release of a new version. We're sure you won't miss spending hours or days trying to add and configure a package in your application. You can eject from our default configs, and add custom code if needed, but most apps will never need to do this: everything Just Works.

We use vite as our bundler, packaging up the frontend code and automatically code splitting on pages. It also serves the frontend (the `web` directory). The backend (the `api` directory) is compiled by Babel and served with [Fastify](https://fastify.dev/).

The entire framework is ([strictly](https://redwoodjs.com/docs/typescript/strict-mode)) typed so you can autocomplete all the things in your IDE.

## Deployment

Redwood's job doesn't end until your application is deployed to the world! That's why we include deploy commands and config to get your app running on the most popular hosts (whether they are serverless or traditional server infrastructure) including:

- [Coherence (GWC/AWS)](https://www.withcoherence.com/)
- [Flightcontrol.dev (AWS)](https://www.flightcontrol.dev?ref=redwood)
- [Edg.io](https://edg.io)
- [Netlify.com](https://www.netlify.com/)
- [Render.com](https://render.com)
- [Serverless.com](https://serverless.com)
- [Vercel.com](https://vercel.com)
- anywhere [Docker](https://www.docker.com) is accepted

* You can even deploy to your own server via SSH commands (we call that our [Baremetal](../../deploy/baremetal.md) deploy)!

## Coming Soon

Redwood is still in active development, and we're working on some [features](https://community.redwoodjs.com/c/experimental-features/25) that are on the cutting edge of the React ecosystem:

- [React Server Components](https://community.redwoodjs.com/t/react-server-components-rsc/5081) and a new transparent, non-GraphQL API
- [SSR/Streaming](https://community.redwoodjs.com/t/render-modes-ssr-streaming-experimental/4858)
- [Realtime and GraphQL Subscriptions](https://community.redwoodjs.com/t/redwoodjs-realtime/5002)
- [Redwood Studio](https://community.redwoodjs.com/t/redwood-studio-experimental/4771) for getting runtime insights into your project
- [Mailer](https://github.com/redwoodjs/redwood/pull/9058)

These are just a few highlights from our current [Bighorn Epoch](https://tom.preston-werner.com/2023/05/30/redwoods-next-epoch-all-in-on-rsc). You can see the full list and follow along via our Roadmap project board at [www.redwoodjs.com/roadmap](https://redwoodjs.com/roadmap).

## Backing

Redwood was created by Tom Preston-Werner, cofounder of GitHub and projects like Semantic Versioning, TOML, Jekyll, and many more. Tom believes that JavaScript applications, specifically full-stack JS applications, are the future of the web, and Redwood has his full support.

## Updates

Redwood is constantly being updated and sticks strictly to semantic versioning requirements. You can be sure that there won't be any sudden, breaking changes without a major version revision. Redwood is famous for its [copious release notes](https://community.redwoodjs.com/t/redwood-3-0-0-is-now-available/3989) and comprehensive upgrade guides, and if code changes need to be made to your app, we make every effort to include a codemod script that will make the changes for you.

## Community

There's a very active community around Redwood, including a [Discourse forum](https://community.redwoodjs.com/) and [Discord chat](https://discord.gg/redwoodjs), where even members of the core team can be found answering questions. We're building this framework for users like you, and we need your feedback if we're going to be successful!
