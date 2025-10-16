# Adding Comments to the Schema

Let's take a moment to appreciate how amazing this is—we built, designed and tested a completely new component for our app, which displays data from an API call (which would pull that data from a database) without actually having to build any of that backend functionality! Redwood let us provide fake data to Storybook and Jest so we could get our component working.

Unfortunately, even with all of this flexibility there's still no such thing as a free lunch. Eventually we're going to have to actually do that backend work. Now's the time.

If you went through the first part of the tutorial you should be somewhat familiar with this flow:

1. Add a model to `schema.prisma`
2. Run a `yarn rw prisma migrate dev` commands to create a migration and apply it to the database
3. Generate an SDL and service

### Adding the Comment model

Let's do that now:

```javascript title="api/db/schema.prisma"
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  // highlight-next-line
  comments  Comment[]
  createdAt DateTime @default(now())
}

model Contact {
  id        Int      @id @default(autoincrement())
  name      String
  email     String
  message   String
  createdAt DateTime @default(now())
}

model User {
  id                  Int @id @default(autoincrement())
  name                String?
  email               String @unique
  hashedPassword      String
  salt                String
  resetToken          String?
  resetTokenExpiresAt DateTime?
}

// highlight-start
model Comment {
  id        Int      @id @default(autoincrement())
  name      String
  body      String
  post      Post     @relation(fields: [postId], references: [id])
  postId    Int
  createdAt DateTime @default(now())
}
// highlight-end
```

Most of these lines look very similar to what we've already seen, but this is the first instance of a [relation](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-schema/relations) between two models. `Comment` gets two entries to denote this relationship:

- `post` which has a type of `Post` and a special `@relation` keyword that tells Prisma how to connect a `Comment` to a `Post`. In this case the field `postId` references the field `id` in `Post`
- `postId` is just a regular `Int` column which contains the `id` of the `Post` that this comment is referencing

This gives us a classic database model:

```
┌───────────┐       ┌───────────┐
│   Post    │       │  Comment  │
├───────────┤       ├───────────┤
│ id        │───┐   │ id        │
│ title     │   │   │ name      │
│ body      │   │   │ body      │
│ createdAt │   └──<│ postId    │
└───────────┘       │ createdAt │
                    └───────────┘
```

Note that there is no real database column named `post` in `Comment`—this is special syntax for Prisma to know how to connect the models together and for you to reference that connection. When you query for a `Comment` using Prisma you can get access to the attached `Post` using that name:

```javascript
db.comment.findUnique({ where: { id: 1 } }).post()
```

Prisma also added a convenience `comments` field to `Post` which gives us the same capability in reverse:

```javascript
db.post.findUnique({ where: { id: 1 } }).comments()
```

### Running the Migration

This one is easy enough: we'll create a new migration with a name and then run it:

```bash
yarn rw prisma migrate dev
```

When prompted, give this one a name something like "create comment".

:::tip

You'll need to restart the test suite runner at this point if it's still running. You can do a Ctrl-C or just press `q`. Redwood creates a second, test database for you to run your tests against (it is at `.redwood/test.db` by default). The database migrations are run against that test database whenever the test suite is _started_, not while it's running, so you'll need to restart it to test against the new database structure.

:::

### Creating the SDL and Service

Next we'll create the SDL (that defines the GraphQL interface) and a service (to get the records out of the database) with a generator call:

```bash
yarn rw g sdl Comment --no-crud
```

Note the `--no-crud` flag here. This gives us bare-bones functionality to start with (read-only access to our model) that we can build on. We got all the CRUD endpoints for free when we created the Post section of our site, so let's do the opposite here and see how to add functionality from scratch.

That command will create both the SDL and the service. One change we'll need to make to the generated code is to allow access to anonymous users to view all comments. Change the `@requireAuth` directive to `@skipAuth` instead:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="api/src/graphql/comments.sdl.js"
export const schema = gql`
  type Comment {
    id: Int!
    name: String!
    body: String!
    post: Post!
    postId: Int!
    createdAt: DateTime!
  }

  type Query {
    // highlight-next-line
    comments: [Comment!]! @skipAuth
  }

  input CreateCommentInput {
    name: String!
    body: String!
    postId: Int!
  }

  input UpdateCommentInput {
    name: String
    body: String
    postId: Int
  }
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="api/src/graphql/comments.sdl.ts"
export const schema = gql`
  type Comment {
    id: Int!
    name: String!
    body: String!
    post: Post!
    postId: Int!
    createdAt: DateTime!
  }

  type Query {
    // highlight-next-line
    comments: [Comment!]! @skipAuth
  }

  input CreateCommentInput {
    name: String!
    body: String!
    postId: Int!
  }

  input UpdateCommentInput {
    name: String
    body: String
    postId: Int
  }
`
```

</TabItem>
</Tabs>

Now if you take a look back at the real app in the browser (not Storybook) you should see a different message than the GraphQL error we were seeing before:

![image](https://user-images.githubusercontent.com/300/101552505-d1405100-3967-11eb-883f-1227689e5f88.png)

"Empty" means the Cell rendered correctly! There just aren't any comments in the database yet. Let's update the `CommentsCell` component to make that "Empty" message a little more friendly:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.jsx"
export const Empty = () => {
  // highlight-next-line
  return <div className="text-center text-gray-500">No comments yet</div>
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.tsx"
export const Empty = () => {
  // highlight-next-line
  return <div className="text-center text-gray-500">No comments yet</div>
}
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/153501827-87b9f931-ee68-4baf-9342-3a70b03d55e2.png)

That's better. Let's update the test that covers the Empty component render as well:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.test.jsx"
it('renders Empty successfully', async () => {
  // highlight-start
  render(<Empty />)
  expect(screen.getByText('No comments yet')).toBeInTheDocument()
  // highlight-end
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.test.tsx"
it('renders Empty successfully', async () => {
  // highlight-start
  render(<Empty />)
  expect(screen.getByText('No comments yet')).toBeInTheDocument()
  // highlight-end
})
```

</TabItem>
</Tabs>

Okay, let's focus on the service for a bit. We'll need to add a function to let users create a new comment and we'll add a test that covers the new functionality.

### Building out the Service

By virtue of using the generator we've already got the function we need to select all comments from the database:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.js"
import { db } from 'src/lib/db'

export const comments = () => {
  return db.comment.findMany()
}

export const comment = ({ id }) => {
  return db.comment.findUnique({
    where: { id },
  })
}

export const Comment = {
  post: (_obj, { root }) =>
    db.comment.findUnique({ where: { id: root.id } }).post(),
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.ts"
import type { Prisma } from '@prisma/client'
import type { ResolverArgs } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

export const comments = () => {
  return db.comment.findMany()
}

export const comment = ({ id }: QueryResolvers['comment'] => {
  return db.comment.findUnique({
    where: { id },
  })
}

export const Comment: CommentRelationResolvers = {
  post: (_obj, { root }) => {
    return db.comment.findUnique({ where: { id: root?.id } }).post()
  },
}
```

</TabItem>
</Tabs>

We've also got a function that returns only a single comment, as well as this `Comment` object at the end. That allows us to return nested post data for a comment through GraphQL using syntax like this (don't worry about adding this code to our app, this is just an example):

```graphql
query CommentsQuery {
  comments {
    id
    name
    body
    createdAt
    post {
      id
      title
      body
      createdAt
    }
  }
}
```

:::info

Have you noticed that something may be amiss? The `comments()` function returns _all_ comments, and all comments only. Could this come back to bite us?

Hmmm...

:::

We need to be able to create a comment as well. We'll use the same convention that's used in Redwood's generated scaffolds: the create endpoint will accept a single parameter `input` which is an object with the individual model fields:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.js"
export const createComment = ({ input }) => {
  return db.comment.create({
    data: input,
  })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```javascript title="api/src/services/comments/comments.ts"
interface CreateCommentArgs {
  input: Prisma.CommentCreateInput
}

export const createComment = ({ input }: CreateCommentArgs) => {
  return db.comment.create({
    data: input,
  })
}
```

</TabItem>
</Tabs>

We'll also need to expose this function via GraphQL so we'll add a Mutation to the SDL and use `@skipAuth` since, again, it can be accessed by everyone:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="api/src/graphql/comments.sdl.js"
export const schema = gql`
  type Comment {
    id: Int!
    name: String!
    body: String!
    post: Post!
    postId: Int!
    createdAt: DateTime!
  }

  type Query {
    comments: [Comment!]! @skipAuth
  }

  input CreateCommentInput {
    name: String!
    body: String!
    postId: Int!
  }

  input UpdateCommentInput {
    name: String
    body: String
    postId: Int
  }

  // highlight-start
  type Mutation {
    createComment(input: CreateCommentInput!): Comment! @skipAuth
  }
  // highlight-end
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="api/src/graphql/comments.sdl.ts"
export const schema = gql`
  type Comment {
    id: Int!
    name: String!
    body: String!
    post: Post!
    postId: Int!
    createdAt: DateTime!
  }

  type Query {
    comments: [Comment!]! @skipAuth
  }

  input CreateCommentInput {
    name: String!
    body: String!
    postId: Int!
  }

  input UpdateCommentInput {
    name: String
    body: String
    postId: Int
  }

  // highlight-start
  type Mutation {
    createComment(input: CreateCommentInput!): Comment! @skipAuth
  }
  // highlight-end
`
```

</TabItem>
</Tabs>

:::tip

The `CreateCommentInput` type was already created for us by the SDL generator.

:::

That's all we need on the api-side to create a comment! But let's think for a moment: is there anything else we need to do with a comment? Let's make the decision that users won't be able to update an existing comment. And we don't need to select individual comments (remember earlier we talked about the possibility of each comment being responsible for its own API request and display, but we decided against it).

What about deleting a comment? We won't let a user delete their own comment, but as owners of the blog we should be able to delete/moderate them. So we'll need a delete function and API endpoint as well. Let's add those:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.js"
export const deleteComment = ({ id }) => {
  return db.comment.delete({
    where: { id },
  })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.ts"
export const deleteComment = ({ id }: Prisma.CommentWhereUniqueInput) => {
  return db.comment.delete({
    where: { id },
  })
}
```

</TabItem>
</Tabs>

Since we only want owners of the blog to be able to delete comments, we'll use `@requireAuth`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="api/src/graphql/comments.sdl.js"
type Mutation {
  createComment(input: CreateCommentInput!): Comment! @skipAuth
  // highlight-next-line
  deleteComment(id: Int!): Comment! @requireAuth
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="api/src/graphql/comments.sdl.ts"
type Mutation {
  createComment(input: CreateCommentInput!): Comment! @skipAuth
  // highlight-next-line
  deleteComment(id: Int!): Comment! @requireAuth
}
```

</TabItem>
</Tabs>

`deleteComment` will be given a single argument, the ID of the comment to delete, and it's required. A common pattern is to return the record that was just deleted in case you wanted to notify the user or some other system about the details of the thing that was just removed, so we'll do that here as well. But, you could just as well return `null`.

### Testing the Service

Let's make sure our service functionality is working and continues to work as we modify our app.

If you open up `api/src/services/comments/comments.test.js` you'll see there's one in there already, making sure that retrieving all comments (the default `comments()` function that was generated along with the service) works:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.test.js"
import { comments } from './comments'

describe('comments', () => {
  scenario('returns all comments', async (scenario) => {
    const result = await comments()

    expect(result.length).toEqual(Object.keys(scenario.comment).length)
  })
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```javascript title="api/src/services/comments/comments.test.ts"
import { comments } from './comments'

describe('comments', () => {
  scenario('returns all comments', async (scenario: StandardScenario) => {
    const result = await comments()

    expect(result.length).toEqual(Object.keys(scenario.comment).length)
  })
})
```

</TabItem>
</Tabs>

What is this `scenario()` function? That's made available by Redwood that mostly acts like Jest's built-in `it()` and `test()` functions, but with one important difference: it pre-seeds a test database with data that is then passed to you in the `scenario` argument. You can count on this data existing in the database and being reset between tests in case you make changes to it. You can create the data structure for any and all models defined in `schema.prisma`, not just comments (the file happens to be named that because it's the ones that will load when running `comments.test.js`).

:::info In the section on mocks you said relying on data in the database for testing was dumb?

Yes, all things being equal it would be great to not have these tests depend on a piece of software outside of our control.

However, the difference here is that in a service almost all of the logic you write will depend on moving data in and out of a database and it's much simpler to just let that code run and _really_ access the database, rather than trying to mock and intercept each and every possible call that Prisma could make.

Not to mention that Prisma itself is currently under development and implementations could change at any time. Trying to keep pace with those changes and constantly keep mocks in sync would be a nightmare!

That being said, if you really wanted to you could use Jest's [mocking utilities](https://jestjs.io/docs/en/mock-functions) and completely mock the Prisma interface to abstract the database away completely. But don't say we didn't warn you!

:::

Where does that data come from? Take a look at the `comments.scenarios.{js,ts}` file which is next door:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments.scenarios.js"
export const standard = defineScenario({
  comment: {
    one: {
      data: {
        name: 'String',
        body: 'String',
        post: { create: { title: 'String', body: 'String' } },
      },
    },
    two: {
      data: {
        name: 'String',
        body: 'String',
        post: { create: { title: 'String', body: 'String' } },
      },
    },
  },
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments.scenarios.ts"
import type { Prisma } from '@prisma/client'

export const standard = defineScenario<Prisma.CommentCreateArgs>({
  comment: {
    one: {
      data: {
        name: 'String',
        body: 'String',
        post: { create: { title: 'String', body: 'String' } },
      },
    },
    two: {
      data: {
        name: 'String',
        body: 'String',
        post: { create: { title: 'String', body: 'String' } },
      },
    },
  },
})
```

</TabItem>
</Tabs>

This calls a `defineScenario()` function which checks that your data structure matches what's defined in Prisma. Each scenario data object (for example, `scenario.comment.one`) is passed as-is to Prisma's [`create`](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#create). That way you can customize the scenario object using any of Prisma's supported options.

:::info The "standard" scenario

The exported scenario here is named "standard." Remember when we worked on component tests and mocks, there was a special mock named `standard` which Redwood would use by default if you didn't specify a name? The same rule applies here! When we add a test for `createComment()` we'll see an example of using a different scenario with a unique name.

:::

The nested structure of a scenario is defined like this:

- **comment**: the name of the model this data is for
  - **one, two**: a friendly name given to the scenario data which you can reference in your tests
    - **data**: contains the actual data that will be put in the database
      - **name, body, post**: fields that correspond to the schema. In this case a **Comment** requires that it be related to a **Post**, so the scenario has a `post` key and values as well (using Prisma's [nested create syntax](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#nested-writes))
    - **select, include**: optionally, to customize the object to `select` or `include` related fields [using Prisma's syntax](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#create-a-related-record)

When you receive the `scenario` argument in your test, the `data` key gets unwrapped so that you can reference fields like `scenario.comment.one.name`.

:::info Why does every field just contain the string "String"?

When generating the service (and the test and scenarios) all we (Redwood) knows about your data is the types for each field as defined in `schema.prisma`, namely `String`, `Integer` or `DateTime`. So we add the simplest data possible that fulfills the type requirement by Prisma to get the data into the database. You should definitely replace this data with something that looks more like the real data your app will be expecting. In fact...

:::

Let's replace that scenario data with something more like the real data our app will be expecting:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.scenarios.js"
export const standard = defineScenario({
  comment: {
    // highlight-start
    jane: {
      data: {
        name: 'Jane Doe',
        body: 'I like trees',
        post: {
          create: {
            title: 'Redwood Leaves',
            body: 'The quick brown fox jumped over the lazy dog.',
          },
        },
      },
    },
    john: {
      data: {
        name: 'John Doe',
        body: 'Hug a tree today',
        post: {
          create: {
            title: 'Root Systems',
            body: 'The five boxing wizards jump quickly.',
          },
        },
      },
    },
    // highlight-end
  },
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.scenarios.ts"
import type { Prisma } from '@prisma/client'

export const standard = defineScenario<Prisma.CommentCreateArgs>({
  comment: {
    // highlight-start
    jane: {
      data: {
        name: 'Jane Doe',
        body: 'I like trees',
        post: {
          create: {
            title: 'Redwood Leaves',
            body: 'The quick brown fox jumped over the lazy dog.',
          },
        },
      },
    },
    john: {
      data: {
        name: 'John Doe',
        body: 'Hug a tree today',
        post: {
          create: {
            title: 'Root Systems',
            body: 'The five boxing wizards jump quickly.',
          },
        },
      },
    },
    // highlight-end
  },
})
```

</TabItem>
</Tabs>

Note that we changed the names of the records from `one` and `two` to the names of the authors, `jane` and `john`. More on that later. Why didn't we include `id` or `createdAt` fields? We told Prisma, in `schema.prisma`, to assign defaults to these fields so they'll be set automatically when the records are created.

The test created by the service generator simply checks to make sure the same number of records are returned so changing the content of the data here won't affect the test.

#### Testing createComment()

Let's add our first service test by making sure that `createComment()` actually stores a new comment in the database. When creating a comment we're not as worried about existing data in the database so let's create a new scenario which only contains a post—the post we'll be linking the new comment to through the comment's `postId` field. You can create multiple scenarios and then say which one you want pre-loaded into the database at the time the test is run. We'll let the `standard` scenario stay as-is and make a new one with a new set of data:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.scenarios.js"
export const standard = defineScenario({
  // ...
})

// highlight-start
export const postOnly = defineScenario({
  post: {
    bark: {
      data: {
        title: 'Bark',
        body: "A tree's bark is worse than its bite",
      },
    },
  },
})
// highlight-end
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.scenarios.ts"
import type { Prisma } from '@prisma/client'

export const standard = defineScenario<Prisma.CommentCreateArgs>({
  // ...
})

// highlight-start
export const postOnly = defineScenario<Prisma.PostCreateArgs>({
  post: {
    bark: {
      data: {
        title: 'Bark',
        body: "A tree's bark is worse than its bite",
      },
    },
  },
})
// highlight-end

export type StandardScenario = typeof standard
// highlight-next-line
export type PostOnlyScenario = typeof postOnly
```

</TabItem>
</Tabs>

Now we can pass the `postOnly` scenario name as the first argument to a new `scenario()` test:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.test.js"
// highlight-next-line
import { comments, createComment } from './comments'

describe('comments', () => {
  scenario('returns all comments', async (scenario) => {
    const result = await comments()

    expect(result.length).toEqual(Object.keys(scenario.comment).length)
  })

  // highlight-start
  scenario('postOnly', 'creates a new comment', async (scenario) => {
    const comment = await createComment({
      input: {
        name: 'Billy Bob',
        body: 'What is your favorite tree bark?',
        post: {
          connect: { id: scenario.post.bark.id },
        },
      },
    })

    expect(comment.name).toEqual('Billy Bob')
    expect(comment.body).toEqual('What is your favorite tree bark?')
    expect(comment.postId).toEqual(scenario.post.bark.id)
    expect(comment.createdAt).not.toEqual(null)
  })
  // highlight-end
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.test.ts"
// highlight-next-line
import { comments, createComment } from './comments'

// highlight-next-line
import type { StandardScenario, PostOnlyScenario } from './comments.scenarios'

describe('comments', () => {
  scenario('returns all comments', async (scenario: StandardScenario) => {
    const result = await comments()

    expect(result.length).toEqual(Object.keys(scenario.comment).length)
  })

  // highlight-start
  scenario(
    'postOnly',
    'creates a new comment',
    async (scenario: PostOnlyScenario) => {
      const comment = await createComment({
        input: {
          name: 'Billy Bob',
          body: 'What is your favorite tree bark?',
          post: {
            connect: { id: scenario.post.bark.id },
          },
        },
      })

      expect(comment.name).toEqual('Billy Bob')
      expect(comment.body).toEqual('What is your favorite tree bark?')
      expect(comment.postId).toEqual(scenario.post.bark.id)
      expect(comment.createdAt).not.toEqual(null)
    }
  )
  // highlight-end
})
```

</TabItem>
</Tabs>

We pass an optional first argument to `scenario()` which is the named scenario to use, instead of the default of "standard."

We were able to use the `id` of the post that we created in our scenario because the scenarios contain the actual database data after being inserted, not just the few fields we defined in the scenario itself. In addition to `id` we could access `createdAt` which is defaulted to `now()` in the database.

:::info What's that `post: { connect: { id } }` nested structure? Can't we simply pass the Post's ID directly here?

What you're looking at is the [connect syntax](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#connect-an-existing-record), which is a Prisma
core concept. And yes, we could simply pass `postId: scenario.post.bark.id` instead – as a so-called "unchecked" input. But as the name implies, the connect syntax is king
in Prisma-land.

<ShowForTs>
Note that if you try to use `postId` that would give you red squiggles, because that input would violate the `CreateCommentArgs` interface definition in
`api/src/services/comments/comments.ts`. In order to use the `postId` input, that'd need to be changed to

```ts
interface CreateCommentArgs {
  input: Prisma.CommentUncheckedCreateInput
}
```

or

```ts
interface CreateCommentArgs {
  input: Prisma.CommentCreateInput | Prisma.CommentUncheckedCreateInput
}
```

in case we wanted to allow both ways – which Prisma generally allows, however [it doesn't allow to pick and mix](https://stackoverflow.com/a/69169106/1246547) within the same input.
</ShowForTs>

:::

We'll test that all the fields we give to the `createComment()` function are actually created in the database, and for good measure just make sure that `createdAt` is set to a non-null value. We could test that the actual timestamp is correct, but that involves freezing the JavaScript Date object so that no matter how long the test takes, you can still compare the value to `new Date` which is right _now_, down to the millisecond. While possible, it's beyond the scope of our easy, breezy tutorial since it gets [very gnarly](https://codewithhugo.com/mocking-the-current-date-in-jest-tests/)!

:::info What's up with the names for scenario data? `posts.bark`? Really?

This makes reasoning about your tests much nicer! Which of these would you rather work with:

**"`claire` paid for an `ebook` using her `visa` credit card."**

or:

**"`user[3]` paid for `product[0]` using their `cards[2]` credit card?**

If you said the second one, remember: you're not writing your code for the computer, you're writing it for other humans! It's the compiler's job to make code understandable to a computer, it's our job to make code understandable to our fellow developers.

:::

Okay, our comments service is feeling pretty solid now that we have our tests in place. The last step is add a form so that users can actually leave a comment on a blog post.

:::info Mocks vs. Scenarios

Mocks are used on the web site and scenarios are used on the api side. It might be helpful to remember that **mock** is a synonym for "fake", as in "this is fake data not really in the database" (so that we can create stories and tests in isolation without the api side getting involved). Whereas a **scenario** is real data in the database, it's just pre-set to some known state that we can rely on.

Maybe a [mnemonic](https://www.mnemonicgenerator.com/?words=M%20W%20S%20A) would help?

**M**ocks : **W**eb :: **S**cenarios : **A**PI:

- Mysterious Weasels Scratched Armor
- Minesweepers Wrecked Subliminal Attorneys
- Martian Warriors Squeezed Apricots

Maybe not...

:::
