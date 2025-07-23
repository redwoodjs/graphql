# Accessing currentUser in the API side

As our blog has evolved into a multi-million dollar enterprise, we find ourselves so busy counting our money that we no longer have the time to write actual blog posts! Let's hire some authors to write them for us.

What do we need to change to allow multiple users to create posts? Well, for one, we'll need to start associating a blog post to the author that wrote it so we can give them credit. We'll also want to display the name of the author when reading an article. Finally, we'll want to limit the list of blog posts that an author has access to edit to only their own: Alice shouldn't be able to make changes to Bob's articles.

## Associating a Post to a User

Let's introduce a relationship between a `Post` and a `User`, AKA a foreign key. This is considered a one-to-many relationship (one `User` has many `Post`s), similar to the relationship we created earlier between a `Post` and its associated `Comment`s. Here's what our new schema will look like:

```
┌─────────────────────┐       ┌───────────┐
│        User         │       │  Post     │
├─────────────────────┤       ├───────────┤
│ id                  │───┐   │ id        │
│ name                │   │   │ title     │
│ email               │   │   │ body      │
│ hashedPassword      │   └──<│ userId    │
│ ...                 │       │ createdAt │
└─────────────────────┘       └───────────┘
```

Making data changes like this will start becoming second nature soon:

1. Add the new relationship the `schema.prisma` file
2. Migrate the database
3. Generate/update SDLs and Services

### Add the New Relationship to the Schema

First we'll add the new `userId` field to `Post` and the relation to `User`:

```javascript title="api/db/schema.prisma"
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  comments  Comment[]
  // highlight-start
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  // highlight-end
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
  roles               String @default("moderator")
  // highlight-next-line
  posts               Post[]
}
```

:::info User SDL
We created a User model in Chapter 4 when we set up authentication for our blog. Redwood's `setup auth dbAuth` command generated two files for us that manage authentication: the `auth` file in `api/src/lib/`, and the `auth` file in `api/src/functions/`. Both of these files use our PrismaClient directly to work with the User model, so we didn't need to set up an SDL or services for the User model.

If you followed our recommendation in the Intermission to use the Example repo, the User SDL and service is already added for you. If not, you'll need to add it yourself:

```bash
yarn rw g sdl User --no-crud
```

We'll comment out the sensitive fields of our GraphQL User type so there's no chance of them leaking:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js title="api/src/graphql/users.sdl.js"
  type User {
    ...
    # hashedPassword: String!
    # salt: String!
    # resetToken: String
    # resetTokenExpiresAt: DateTime
  }
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/graphql/users.sdl.ts"
  type User {
    ...
    # hashedPassword: String!
    # salt: String!
    # resetToken: String
    # resetTokenExpiresAt: DateTime
  }
```

</TabItem>
</Tabs>
:::

### Migrate the Database

Next, migrate the database to apply the changes (when given the option, name the migration something like "add userId to post"):

```
yarn rw prisma migrate dev
```

Whoops!

<img width="584" alt="image" src="https://user-images.githubusercontent.com/300/192899337-9cc1167b-e6da-42d4-83dc-d2a6c0cd1179.png" />

Similar to what happened when we added `roles` to `User`, We made `userId` a required field, but we already have several posts in our development database. Since we don't have a default value for `userId` defined, it's impossible to add this column to the database.

:::warning Why don't we just set `@default(1)` in the schema?

This would get us past this problem, but could cause hard-to-track-down bugs in the future: if you ever forget to assign a `post` to a `user`, rather than fail it'll happily just set `userId` to `1`, which may or may not even exist some day! It's best to take the extra time to do things The Right Way and avoid the quick hacks to get past an annoyance like this. Your future self will thank you!

:::

Since we're in development, let's just blow away the database and start over:

```
yarn rw prisma migrate reset
```

:::info Database Seeds

If you started the second half the tutorial from the [Redwood Tutorial repo](https://github.com/redwoodjs/redwood-tutorial) you'll get an error after resetting the database—Prisma attempts to seed the database with a user and some posts to get you started, but the posts in that seed do not have the new required `userId` field! Open up `scripts/seed.js` and edit each post to add `userId: 1` to each:

```javascript title="scripts/seed.js"
{
  id: 1,
  name: 'John Doe',
  title: 'Welcome to the blog!',
  body:
    "I'm baby single- origin coffee kickstarter lo - fi paleo skateboard.Tumblr hashtag austin whatever DIY plaid knausgaard fanny pack messenger bag blog next level woke.Ethical bitters fixie freegan,helvetica pitchfork 90's tbh chillwave mustache godard subway tile ramps art party. Hammock sustainable twee yr bushwick disrupt unicorn, before they sold out direct trade chicharrones etsy polaroid hoodie. Gentrify offal hoodie fingerstache.",
  // highlight-next-line
  userId: 1,
},
```

Now run `yarn rw prisma migrate reset` and and...you'll get a different error. But that's okay, read on...

:::

We've got an error here because running a database `reset` doesn't also apply pending migrations. So we're trying to set a `userId` where one doesn't exist in the database (it does exist in Prisma generated client libs though, so it thinks that there _should_ be one, even if it doesn't exist in the database yet).

It may feel like we're stuck, but note that the database did reset successfully, it's just the seed that failed. So now let's migrate the database to add the new `userId` to `Post`, and then re-run the seed to populate the database, naming it something like "add userId to post":

```
yarn rw prisma migrate dev
```

And then the seed:

```
yarn rw prisma db seed
```

:::info

If you didn't start your codebase from the [Redwood Tutorial repo](https://github.com/redwoodjs/redwood-tutorial) then you'll now have no users or posts in the database. Go ahead and create a user by going to [http://localhost:8910/signup](http://localhost:8910/signup) but don't create any posts yet! Change the user's role to be "admin", either by using the console introduced in the [previous page](/docs/canary/tutorial/chapter7/rbac#changing-roles-on-a-user) or by [opening Prisma Studio](/docs/canary/tutorial/chapter2/getting-dynamic#prisma-studio) and changing it directly in the database.

:::

### Add Fields to the SDL and Service

Let's think about where we want to show our new relationship. For now, probably just on the homepage and article page: we'll display the author of the post next to the title. That means we'll want to access the user from the post in a GraphQL query something like this:

```graphql
post {
  id
  title
  body
  createdAt
  user {
    name
  }
}
```

To enable this we'll need to make two modifications on the api side:

1. Add the `user` field to the `posts` SDL
2. Add a **relation resolver** for the `user` in the `posts` service

#### Add User to Posts SDL

```javascript title="api/src/graphql/posts.sdl.js"
  type Post {
    id: Int!
    title: String!
    body: String!
    createdAt: DateTime!
    // highlight-next-line
    user: User!
  }
```

:::info What about the mutations?

We did _not_ add `user` or `userId` to the `CreatePostInput` or `UpdatePostInput` types. Although we want to set a user on each newly created post, we don't want just anyone to do that via a GraphQL call! You could easily create or edit a post and assign it to someone else by just modifying the GraphQL payload. We'll save assigning the user to just the service, so it can't be manipulated by the outside world.

:::

Here we're using `User!` with an exclamation point because we know that every `Post` will have an associated user to it—this field will never be `null`.

#### Add User Relation Resolver

This one is a little tricker: we need to add a "lookup" in the `posts` service, so that it knows how to get the associated user. When we generated the `comments` SDL and service we got this **relation resolver** created for us. We could re-run the service generator for `Post` but that could blow away changes we made to this file. Our only option would be to include the `--force` flag since the file already exists, which will write over everything. In this case we'll just add the resolver manually:

```javascript title="api/src/services/posts/posts.js"
import { db } from 'src/lib/db'

export const posts = () => {
  return db.post.findMany()
}

export const post = ({ id }) => {
  return db.post.findUnique({
    where: { id },
  })
}

export const createPost = ({ input }) => {
  return db.post.create({
    data: input,
  })
}

export const updatePost = ({ id, input }) => {
  return db.post.update({
    data: input,
    where: { id },
  })
}

export const deletePost = ({ id }) => {
  return db.post.delete({
    where: { id },
  })
}

// highlight-start
export const Post = {
  user: (_obj, { root }) =>
    db.post.findFirst({ where: { id: root.id } }).user(),
}
// highlight-end
```

This can be non-intuitive so let's step through it. First, declare a variable with the same name as the model this service is for: `Post` for the `posts` service. Now, set that to an object containing keys that are the same as the fields that are going to be looked up, in this case `user`. When GraphQL invokes this function it passes a couple of arguments, one of which is `root` which is the object that was resolved to start with, in this case the `post` in our GraphQL query:

```graphql
post {   <- root
  id
  title
  body
  createdAt
  user {
    name
  }
}
```

That post will already be retrieved from the database, and so we know its `id`. `root` is that object, so can simply call `.id` on it to get that property. Now we know everything we need to to make a `findFirst()` query in Prisma, giving it the `id` of the record we already found, but returning the `user` associated to that record, rather than the `post` itself.

We could also write this resolver as follows:

```javascript
export const Post = {
  user: (_obj, { root }) => db.user.findFirst({ where: { id: root.userId } }),
}
```

Note that if you keep the relation resolver above, but also included a `user` property in the post(s) returned from `posts` and `post`, this field resolver will still be invoked and whatever is returned will override any `user` property that exists already. Why? That's just how GraphQL works—resolvers, if they are present for a named field, will always be invoked and their return value used, even if the `root` already contains that data.

:::info Prisma and the N+1 Problem

If you have any experience with database design and retrieval you may have noticed this method presents a less than ideal solution: for every post that's found, you need to perform an _additional_ query just to get the user data associated with that `post`, also known as the [N+1 problem](https://medium.com/the-marcy-lab-school/what-is-the-n-1-problem-in-graphql-dd4921cb3c1a). This is just due to the nature of GraphQL queries: each resolver function really only knows about its own parent object, nothing about potential children.

There have been several attempts to work around this issue. A simple one that includes no extra dependencies is to remove this field resolver and simply include `user` data along with any `post` you retrieve from the database:

```javascript
export const post = ({ id }) => {
  return db.post.findUnique({
    where: { id },
    include: {
      user: true,
    },
  })
}
```

This may or may not work for you: you are incurring the overhead of always returning user data, even if that data wasn't requested in the GraphQL query. In addition, this breaks further nesting of queries: what if you wanted to return the user for this post, and a list of all the other posts IDs that they created?

```graphql
post {
  id
  title
  body
  createdAt
  user {
    name
    posts {
      id
    }
  }
}
```

This query would now fail because you only have `post.user` available, not `post.user.posts`.

The Redwood team is actively looking into more elegant solutions to the N+1 problem, so stay tuned!

:::

## Displaying the Author

In order to get the author info we'll need to update our Cell queries to pull the user's name.

There are two places where we publicly present a post:

1. The homepage
2. A single article page

Let's update their respective Cells to include the name of the user that created the post:

```jsx title="web/src/components/ArticlesCell/ArticlesCell.js"
export const QUERY = gql`
  query ArticlesQuery {
    articles: posts {
      id
      title
      body
      createdAt
      // highlight-start
      user {
        name
      }
      // highlight-end
    }
  }
`
```

```jsx title="web/src/components/ArticleCell/ArticleCell.js"
export const QUERY = gql`
  query ArticleQuery($id: Int!) {
    article: post(id: $id) {
      id
      title
      body
      createdAt
      // highlight-start
      user {
        name
      }
      // highlight-end
    }
  }
`
```

And then update the display component that shows an Article:

```jsx title="web/src/components/Article/Article.js"
import { Link, routes } from '@redwoodjs/router'

const Article = ({ article }) => {
  return (
    <article>
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
          // highlight-start
          <span className="ml-2 text-gray-400 font-normal">
            by {article.user.name}
          </span>
          // highlight-end
        </h2>
      </header>

      <div className="mt-2 text-gray-900 font-light">{article.body}</div>
    </article>
  )
}

export default Article
```

Depending on whether you started from the Redwood Tutorial repo or not, you may not have any posts to actually display. Let's add some! However, before we can do that with our posts admin/scaffold, we'll need to actually associate a user to the post they created. Remember that we don't allow setting the `userId` via GraphQL, which is what the scaffolds use when creating/editing records. But that's okay, we want this to only happen in the service anyway, which is where we're heading now.

## Accessing `currentUser` on the API side

There's a magical variable named `context` that's available within any of your service functions. It contains the context in which the service function is being called. One property available on this context is the user that's logged in (_if_ someone is logged in). It's the same `currentUser` that is available on the web side:

```javascript title="api/src/service/posts/posts.js"
export const createPost = ({ input }) => {
  return db.post.create({
    // highlight-next-line
    data: { ...input, userId: context.currentUser.id },
  })
}
```

So `context.currentUser` will always be around if you need access to the user that made this request. We'll take their user `id` and appened it the rest of the incoming data from the scaffold form when creating a new post. Let's try it out!

You should be able to create a post via the admin now:

<img width="937" alt="image" src="https://user-images.githubusercontent.com/300/193152401-d98b488e-dd71-475a-a78c-6cd5233e5bee.png" />

And going back to the hompage should actually start showing posts and their authors!

<img width="937" alt="image" src="https://user-images.githubusercontent.com/300/193152524-2715e49d-a1c3-43a1-b968-84a4f8ae3846.png" />

## Only Show a User Their Posts in Admin

Right now any admin that visits `/admin/posts` can still see all posts, not only their own. Let's change that.

Since we know we have access to `context.currentUser` we can sprinkle it throughout our posts service to limit what's returned to only those posts that the currently logged in user owns:

```javascript title="api/src/services/posts/posts.js"
import { db } from 'src/lib/db'

export const posts = () => {
  // highlight-next-line
  return db.post.findMany({ where: { userId: context.currentUser.id } })
}

export const post = ({ id }) => {
  // highlight-start
  return db.post.findFirst({
    where: { id, userId: context.currentUser.id },
  })
  // highlight-end
}

export const createPost = ({ input }) => {
  return db.post.create({
    data: { ...input, userId: context.currentUser.id },
  })
}

export const updatePost = ({ id, input }) => {
  return db.post.update({
    data: input,
    where: { id },
  })
}

export const deletePost = ({ id }) => {
  return db.post.delete({
    where: { id },
  })
}

export const Post = {
  user: (_obj, { root }) =>
    db.post.findFirst({ where: { id: root.id } }).user(),
}
```

:::info Prisma's `findUnique()` vs. `findFirst()`

Note that we switched from `findUnique()` to `findFirst()` here. Prisma's `findUnique()` requires that any attributes in the `where` clause have unique indexes, which `id` does, but `userId` does not. So we need to switch to the `findFirst()` function which allows you to put whatever you want in the `where`, which may return more than one record, but Prisma will only return the first of that set. In this case we know there'll always only be one, because we're selecting by `id` _in addition_ to `userId`.

:::

These changes make sure that a user can only see a list of their own posts, or the detail for a single post that they own.

What about `updatePost` and `deletePost`? They aren't limited to just the `currentUser`, which would let anyone update or delete a post if they made a manual GraphQL call! That's not good. We'll deal with those [a little later](#update-and-delete).

But there's a problem with the updates we just made: doesn't the homepage also use the `posts` service to display all the articles for the homepage? This code update would limit the homepage to only showing a logged in user's own posts and no one else! And what happens if someone who is _not_ logged in goes to the homepage? ERROR.

How can we return one list of posts in the admin, and a different list of posts for the homepage?

## An AdminPosts Service

We could go down the road of adding variables in the GraphQL queries, along with checks in the existing `posts` service, that return a different list of posts whether you're on the homepage or in the admin. But this complexity adds a lot of surface area to test and some fragility if someone goes in there in the future—they have to be very careful not to add a new condition or negate an existing one and accidentally expose your admin functionality to exploits.

What if we created _new_ GraphQL queries for the admin views of posts? They would have automatic security checks thanks to `@requireAuth`, no custom code required. These new queries will be used in the admin posts pages, and the original, simple `posts` service will be used for the homepage and article detail page.

There are several steps we'll need to complete:

1. Create a new `adminPosts` SDL that defines the types
2. Create a new `adminPosts` service
3. Update the posts admin GraphQL queries to pull from `adminPosts` instead of `posts`

### Create the `adminPosts` SDL

Let's keep the existing `posts.sdl.js` and make that the "public" interface. Duplicate that SDL, naming it `adminPosts.sdl.js`, and modify it like so:

```javascript title="api/src/graphql/adminPosts.sdl.js"
export const schema = gql`
  type Query {
    adminPosts: [Post!]! @requireAuth(roles: ["admin"])
    adminPost(id: Int!): Post @requireAuth(roles: ["admin"])
  }

  input CreatePostInput {
    title: String!
    body: String!
  }

  input UpdatePostInput {
    title: String
    body: String
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post! @requireAuth(roles: ["admin"])
    updatePost(id: Int!, input: UpdatePostInput!): Post!
      @requireAuth(roles: ["admin"])
    deletePost(id: Int!): Post! @requireAuth(roles: ["admin"])
  }
`
```

```javascript title="api/src/graphql/posts.sdl.js"
export const schema = gql`
  type Post {
    id: Int!
    title: String!
    body: String!
    createdAt: DateTime!
    user: User!
  }

  type Query {
    posts: [Post!]! @skipAuth
    post(id: Int!): Post @skipAuth
  }
`
```

So we keep a single type of `Post` since the data contained within it is the same, and either SDL file will return this same data type. We can remove the mutations from the `posts` SDL since the general public will not need to access those. We move create, update and delete mutations to the new `adminPosts` SDL, and rename the two queries from `posts` to `adminPosts` and `post` to `adminPost`. In case you didn't know: every query/mutation must have a unique name across your entire application!

In `adminPosts` we've updated the queries to use `@requireAuth` instead of `@skipAuth`. Now that we have dedicated queries for our admin pages, we can lock them down to only allow access when authenticated.

### Create the `adminPosts` Service

Next let's create an `adminPosts` service. We'll need to move our create/update/delete mutations to it, as the name of the SDL needs to match the name of the service:

```javascript title="api/src/services/adminPosts/adminPosts.js"
import { db } from 'src/lib/db'

export const adminPosts = () => {
  return db.post.findMany({ where: { userId: context.currentUser.id } })
}

export const adminPost = ({ id }) => {
  return db.post.findFirst({
    where: { id, userId: context.currentUser.id },
  })
}

export const createPost = ({ input }) => {
  return db.post.create({
    data: { ...input, userId: context.currentUser.id },
  })
}

export const updatePost = ({ id, input }) => {
  return db.post.update({
    data: input,
    where: { id },
  })
}

export const deletePost = ({ id }) => {
  return db.post.delete({
    where: { id },
  })
}
```

(Again, don't forget the change from `findUnique()` to `findFirst()`.) And update `posts` to remove some of the functions that live in `adminPosts` now:

```javascript title="api/src/services/posts/posts.js"
import { db } from 'src/lib/db'

export const posts = () => {
  return db.post.findMany()
}

export const post = ({ id }) => {
  return db.post.findUnique({ where: { id } })
}

export const Post = {
  user: (_obj, { root }) =>
    db.post.findFirst({ where: { id: root.id } }).user(),
}
```

We've removed the `userId` lookup in the `posts` service so we're back to returning every post (for `posts`) or a single post (regardless of who owns it, in `post`).

Note that we kept the relation resolver here `Post.user`, and there's none in `adminPosts`: since the queries and mutations from both SDLs still return a `Post`, we'll want to keep that relation resolver with the service that matches that original SDL by name: `graphql/posts.sdl.js` => `services/posts/posts.js`.

### Update the GraphQL Queries

Finally, we'll need to update several of the scaffold components to use the new `adminPosts` and `adminPost` queries (we'll limit the code snippets below to just the changes to save some room, this page is getting long enough!):

```javascript title="web/src/components/Post/EditPostCell/EditPostCell.js"
export const QUERY = gql`
  query EditPostById($id: Int!) {
    // highlight-next-line
    post: adminPost(id: $id) {
      id
      title
      body
      createdAt
    }
  }
`
```

```jsx title="web/src/components/Post/PostCell/PostCell.js"
export const QUERY = gql`
  query FindPostById($id: Int!) {
    // highlight-next-line
    post: adminPost(id: $id) {
      id
      title
      body
      createdAt
    }
  }
`
```

```jsx title="web/src/components/Post/PostsCell/PostsCell.js"
export const QUERY = gql`
  query POSTS {
    // highlight-next-line
    posts: adminPosts {
      id
      title
      body
      createdAt
    }
  }
`
```

If we didn't use the `posts: adminPosts` syntax, we would need to rename the argument coming into the `Success` component below to `adminPosts`. This syntax renames the result of the query to `posts` and then nothing else below needs to change!

We don't need to make any changes to the "public" views (like `ArticleCell` and `ArticlesCell`) since those will continue to use the original `posts` and `post` queries, and their respective resolvers.

## Update and Delete

Okay, let's take care of `updatePost` and `deletePost` now. Why couldn't we just do this?

```javascript title="api/src/services/adminPosts/adminPosts.js"
export const updatePost = ({ id, input }) => {
  return db.post.update({
    data: input,
    // highlight-next-line
    where: { id, userId: context.currentUser.id },
  })
}
```

Because like `findUnique()`, Prisma only wants to update records based on fields with unique indexes, in this case that's just `id`. So we need to keep this to just an `id`. But how do we verify that the user is only updating/deleting a record that they own?

We could select the record first, make sure the user owns it, and only then let the `update()` commence:

```javascript title="api/src/services/adminPosts/adminPosts.js"
// highlight-next-line
import { ForbiddenError } from '@redwoodjs/graphql-server'

// highlight-start
export const updatePost = async ({ id, input }) => {
  if (await adminPost({ id })) {
    return db.post.update({
      data: input,
      where: { id },
    })
  } else {
    throw new ForbiddenError("You don't have access to this post")
  }
  // highlight-end
}
```

We're using the `adminPost()` service function, rather than making another call to the database (note that we had to async/await it to make sure we have the post before continuing). Composing services like this is something Redwood was designed to encourage: services' functions act as resolvers for GraphQL, but they're also just plain JS functions and can be called wherever you need. And the reasons why you'd want to do this are clearly demonstrated here: `adminPost()` already limits the found record to be only one owned by the logged in user, so that logic is already encapsulated here, and we can be sure that any time an admin wants to do something with a single post, it runs through this code and uses the same logic every time.

This works, but we'll need to do the same thing in `deletePost`. Let's extract that check for the post existence into a function:

```javascript title="api/src/services/adminPosts/adminPosts.js"
// highlight-start
const verifyOwnership = async ({ id }) => {
  if (await adminPost({ id })) {
    return true
  } else {
    throw new ForbiddenError("You don't have access to this post")
  }
}
// highlight-end

export const updatePost = async ({ id, input }) => {
  // highlight-next-line
  await verifyOwnership({ id })

  return db.post.update({
    data: input,
    where: { id },
  })
}
```

Simple! Our final `adminPosts` service ends up looking like:

```javascript title="api/src/services/adminPosts/adminPosts.js"
import { ForbiddenError } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

const verifyOwnership = async ({ id }) => {
  if (await adminPost({ id })) {
    return true
  } else {
    throw new ForbiddenError("You don't have access to this post")
  }
}

export const adminPosts = () => {
  return db.post.findMany({ where: { userId: context.currentUser.id } })
}

export const adminPost = ({ id }) => {
  return db.post.findFirst({
    where: { id, userId: context.currentUser.id },
  })
}

export const createPost = ({ input }) => {
  return db.post.create({
    data: { ...input, userId: context.currentUser.id },
  })
}

export const updatePost = async ({ id, input }) => {
  await verifyOwnership({ id })

  return db.post.update({
    data: input,
    where: { id },
  })
}

export const deletePost = async ({ id }) => {
  await verifyOwnership({ id })

  return db.post.delete({
    where: { id },
  })
}
```

## Wrapping Up

Whew! Let's try several different scenarios (this is the kind of thing that the QA team lives for), making sure everything is working as expected:

- A logged out user _should_ see all posts on the homepage
- A logged out user _should_ be able to see the detail for a single post
- A logged out user _should not_ be able to go to /admin/posts
- A logged out user _should not_ see moderation controls next to comments
- A logged in admin user _should_ see all articles on the homepage (not just their own)
- A logged in admin user _should_ be able to go to /admin/posts
- A logged in admin user _should_ be able to create a new post
- A logged in admin user _should not_ be able to see anyone else's posts in /admin/posts
- A logged in admin user _should not_ see moderation controls next to comments (unless you modified that behavior at the end of the last page)
- A logged in moderator user _should_ see moderation controls next to comments
- A logged in moderator user _should not_ be able to access /admin/posts

In fact, you could write some new tests to make sure this functionality doesn't mistakenly change in the future. The quickest would probably be to create `adminPosts.scenarios.js` and `adminPosts.test.js` files to go with the new service and verify that you are only returned the posts owned by a given user. You can [mock currentUser](/docs/testing#mockcurrentuser-on-the-api-side) to simulate someone being logged in or not, with different roles. You could add tests for the Cells we modified above, but the data they get is dependent on what's returned from the service, so as long as you have the service itself covered you should be okay. The 100% coverage folks would argue otherwise, but while they're still busy writing tests we're out cruising in our new yacht thanks to all the revenue from our newly launched (with _reasonable_ test coverage) features!

Did it work? Great! Did something go wrong? Can someone see too much, or too little? Double check that all of your GraphQL queries are updated and you've saved changes in all the opened files.
