---
description: Redwood quick start
---

# Quick Start

:::info Prerequisites

- Redwood requires [Node.js](https://nodejs.org/en/) (=20.x) and [Yarn](https://yarnpkg.com/) (>=1.22.21)
- Are you on Windows? For best results, follow our [Windows development setup](how-to/windows-development-setup.md) guide

:::

Create a Redwood project with `yarn create redwood-app`:

```
yarn create redwood-app my-redwood-project
```

:::tip Prefer TypeScript?

Redwood comes with full TypeScript support from the get-go:

```
yarn create redwood-app my-redwood-project --typescript
```

:::

Then change into that directory, yarn install, and start the development server:

```
cd my-redwood-project
yarn install
yarn redwood dev
```

Your browser should automatically open to [http://localhost:8910](http://localhost:8910) where you'll see the Welcome Page, which links out to many great resources:

<img data-mode="light" src="https://user-images.githubusercontent.com/300/145314717-431cdb7a-1c45-4aca-9bbc-74df4f05cc3b.png" alt="Redwood Welcome Page" style={{ marginBottom: 20 }} />

<img data-mode="dark" src="https://user-images.githubusercontent.com/32992335/161387013-2fc6702c-dfd8-4afe-aa2f-9b06d575ba82.png" alt="Redwood Welcome Page" style={{ marginBottom: 20 }} />

Congratulations on running your first Redwood CLI command!
From dev to deploy, the CLI is with you the whole way.
And there's quite a few commands at your disposal:

```
yarn redwood --help
```

For all the details, see the [CLI reference](cli-commands.md).

### GitPod

The fastest way to start a new Redwood project is to use GitPod ([additional documentation for working with GitPod](./how-to/using-gitpod)).

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/redwoodjs/starter)

## Prisma and the database

Redwood wouldn't be a full-stack framework without a database. It all starts with the schema. Open the `schema.prisma` file in `api/db` and replace the `UserExample` model with the following `Post` model:

```js title="api/db/schema.prisma"
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  createdAt DateTime @default(now())
}
```

Redwood uses [Prisma](https://www.prisma.io/), a next-gen Node.js and TypeScript ORM, to talk to the database. Prisma's schema offers a declarative way of defining your app's data models. And Prisma [Migrate](https://www.prisma.io/migrate) uses that schema to make database migrations hassle-free:

```
yarn rw prisma migrate dev

# ...

? Enter a name for the new migration: › create posts
```

:::tip

`rw` is short for `redwood`

:::

You'll be prompted for the name of your migration. `create posts` will do.

Now let's generate everything we need to perform all the CRUD (Create, Retrieve, Update, Delete) actions on our `Post` model:

```
yarn redwood generate scaffold post
```

Navigate to [http://localhost:8910/posts/new](http://localhost:8910/posts/new), fill in the title and body, and click "Save":

<img src="https://user-images.githubusercontent.com/300/73028004-72262c00-3de9-11ea-8924-66d1cc1fceb6.png" alt="Create a new post" />

Did we just create a post in the database? Yup! With `yarn rw generate scaffold <model>`, Redwood created all the pages, components, and services necessary to perform all CRUD actions on our posts table.

## Frontend first with Storybook

Don't know what your data models look like?
That's more than ok—Redwood integrates Storybook so that you can work on design without worrying about data.
Mockup, build, and verify your React components, even in complete isolation from the backend:

```
yarn rw storybook
```

Seeing "Couldn't find any stories"?
That's because you need a `*.stories.{tsx,jsx}` file.
The Redwood CLI makes getting one easy enough—try generating a [Cell](./cells), Redwood's data-fetching abstraction:

```
yarn rw generate cell examplePosts
```

The Storybook server should hot reload and now you'll have four stories to work with.
They'll probably look a little bland since there's no styling.
See if the Redwood CLI's `setup ui` command has your favorite styling library:

```
yarn rw setup ui --help
```

## Testing with Jest

It'd be hard to scale from side project to startup without a few tests.
Redwood fully integrates Jest with both the front- and back-ends, and makes it easy to keep your whole app covered by generating test files with all your components and services:

```
yarn rw test
```

To make the integration even more seamless, Redwood augments Jest with database [scenarios](testing.md#scenarios) and [GraphQL mocking](testing.md#mocking-graphql-calls).

## Ship it

Redwood is designed for both serverless deploy targets like Netlify and Vercel and serverful deploy targets like Render and AWS:

```
yarn rw setup deploy --help
```

Don't go live without auth!
Lock down your app with Redwood's built-in, database-backed authentication system ([dbAuth](authentication.md#self-hosted-auth-installation-and-setup)), or integrate with nearly a dozen third-party auth providers:

```
yarn rw setup auth --help
```

## Next Steps

The best way to learn Redwood is by going through the comprehensive [tutorial](tutorial/foreword.md) and joining the community (via the [Discourse forum](https://community.redwoodjs.com) or the [Discord server](https://discord.gg/redwoodjs)).
