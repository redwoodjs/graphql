# Role-Based Access Control (RBAC)

Imagine a few weeks in the future of our blog when every post hits the front page of the New York Times and we're getting hundreds of comments a day. We can't be expected to come up with quality content each day _and_ moderate the endless stream of (mostly well-meaning) comments! We're going to need help. Let's hire a comment moderator to remove obvious spam and any comments that don't heap praise on our writing ability. You know, to help make the internet a better place.

We already have a login system for our blog, but right now it's all-or-nothing: you either get access to create blog posts, or you don't. In this case our comment moderator(s) will need logins so that we know who they are, but we're not going to let them create new blog posts. We need some kind of role that we can give to our two kinds of users so we can distinguish them from one another.

Enter **role-based access control**, thankfully shortened to the common phrase **RBAC**. Authentication says who the person is, authorization says what they can do. "Access control" is another way to say authorization. Currently the blog has the lowest common denominator of authorization: if they are logged in, they can do everything. Let's add a "less than everything, but more than nothing" level.

### Defining Roles

We've got a User model so let's add a `roles` property to that:

```javascript title="api/db/schema.prisma"
model User {
  id                  Int @id @default(autoincrement())
  name                String?
  email               String @unique
  hashedPassword      String
  salt                String
  resetToken          String?
  resetTokenExpiresAt DateTime?
  // highlight-next-line
  roles               String
}
```

Next we'll (try) to migrate the database:

```bash
yarn rw prisma migrate dev
```

But that will fail with an error:

```
• Step 0 Added the required column `role` to the `User` table without a default value. There are 1 rows in this table, it is not possible to execute this step.
```

What does this mean? We made `roles` a required field. But, we have a user in the database already (`1 rows in this table`). If we add that column to the database, it would have to be `null` for existing users since we didn't define a default. Let's create a default value so that not only can we apply this migration, but we're sure that any new users being created have some minimal level of permissions and we don't have to add even more code to check whether they have a role at all, let alone what it is.

For now let's have two roles, `admin` and `moderator`. `admin` can create/edit/delete blog posts and `moderator` can only remove comments. Of those two `moderator` is the safer default since it's more restrictive:

```javascript title="api/db/schema.prisma"
model User {
  id                  Int @id @default(autoincrement())
  name                String?
  email               String @unique
  hashedPassword      String
  salt                String
  resetToken          String?
  resetTokenExpiresAt DateTime?
  // highlight-next-line
  roles               String @default("moderator")
}
```

Now the migration should be able to be applied:

```bash
yarn rw prisma migrate dev
```

And you can name it something like "add roles to user".

If we log in and try to go the posts admin page at [http://localhost:8910/admin/posts](http://localhost:8910/admin/posts) everything works the same as it used to: we're not actually checking for the existence of any roles yet so that makes sense. In reality we'd only want users with the `admin` role to have access to the admin pages, but our existing user just became a `moderator` because of our default role. This is a great opportunity to actually setup a role check and see if we lose access to the admin!

Before we do that, we'll need to make sure that the web side has access to the roles on `currentUser`. Take a look at `api/src/lib/auth.js`. Remember when we had to add `email` to the list of fields being included? We need to add `roles` as well:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/lib/auth.js"
export const getCurrentUser = async (session) => {
  if (!session || typeof session.id !== 'number') {
    throw new Error('Invalid session')
  }

  return await db.user.findUnique({
    where: { id: session.id },
    // highlight-next-line
    select: { id: true, email: true, roles: true },
  })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```typescript title="api/src/lib/auth.ts"
export const getCurrentUser = async (session) => {
  return await db.user.findUnique({
    where: { id: session.id },
    // highlight-next-line
    select: { id: true, email: true, roles: true },
  })
}
```

</TabItem>
</Tabs>

<ShowForTs>

### Fixing the hasRole function

At this point, you might notice an error in your `api/src/lib/auth.ts` file, in the `hasRole` function. TypeScript is trying to help you here, by highlighting that roles can never be an array of strings:

```ts title="api/src/lib/auth.ts"
export const hasRole = (roles: AllowedRoles): boolean => {

  // ...

    } else if (Array.isArray(currentUserRoles)) {
      // 👇 TypeScript will now be telling you 'some' doesn't exist on type never:
      // highlight-next-line
      return currentUserRoles?.some((allowedRole) => roles === allowedRole)
    }
  }
```

This is because we now know that the type of `currentUser.roles` is a `string` based on the type being returned from Prisma. So you can safely remove the block of code where it's checking if roles is an array:

```diff title="api/src/lib/auth.ts"
export const hasRole = (roles: AllowedRoles): boolean => {
  if (!isAuthenticated()) {
    return false
  }

  const currentUserRoles = context.currentUser?.roles

  if (typeof roles === 'string') {
    if (typeof currentUserRoles === 'string') {
      // roles to check is a string, currentUser.roles is a string
      return currentUserRoles === roles
-    } else if (Array.isArray(currentUserRoles)) {
-      // roles to check is a string, currentUser.roles is an array
-      return currentUserRoles?.some((allowedRole) => roles === allowedRole)
    }
  }

  if (Array.isArray(roles)) {
    if (Array.isArray(currentUserRoles)) {
      // roles to check is an array, currentUser.roles is an array
      return currentUserRoles?.some((allowedRole) =>
        roles.includes(allowedRole)
      )
    } else if (typeof currentUserRoles === 'string') {
      // roles to check is an array, currentUser.roles is a string
      return roles.some((allowedRole) => currentUserRoles === allowedRole)
    }
  }

  // roles not found
  return false
}
```

</ShowForTs>

### Restricting Access via Routes

The easiest way to prevent access to an entire URL is via the Router. The `<PrivateSet>` component takes a prop `roles` in which you can give a list of only those role(s) that should have access:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/Routes.jsx"
// highlight-next-line
<PrivateSet unauthenticated="home" roles="admin">
  <Set wrap={ScaffoldLayout} title="Posts" titleTo="posts" buttonLabel="New Post" buttonTo="newPost">
    <Route path="/admin/posts/new" page={PostNewPostPage} name="newPost" />
    <Route path="/admin/posts/{id:Int}/edit" page={PostEditPostPage} name="editPost" />
    <Route path="/admin/posts/{id:Int}" page={PostPostPage} name="post" />
    <Route path="/admin/posts" page={PostPostsPage} name="posts" />
  </Set>
</PrivateSet>
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/Routes.tsx"
// highlight-next-line
<PrivateSet unauthenticated="home" roles="admin">
  <Set
    wrap={ScaffoldLayout}
    title="Posts"
    titleTo="posts"
    buttonLabel="New Post"
    buttonTo="newPost"
  >
    <Route path="/admin/posts/new" page={PostNewPostPage} name="newPost" />
    <Route
      path="/admin/posts/{id:Int}/edit"
      page={PostEditPostPage}
      name="editPost"
    />
    <Route path="/admin/posts/{id:Int}" page={PostPostPage} name="post" />
    <Route path="/admin/posts" page={PostPostsPage} name="posts" />
  </Set>
</PrivateSet>
```

</TabItem>
</Tabs>

Now if you browse to [http://localhost:8910/admin/posts](http://localhost:8910/admin/posts) you should get redirected to the homepage. So far so good.

### Changing Roles on a User

Let's use the Redwood console again to quickly update our admin user to actually have the `admin` role:

```bash
yarn rw c
```

:::tip

You can use the `c` shortcut instead of `console`

:::

Now we can update our user with a single command:

```bash
> db.user.update({ where: { id: 1 } , data: { roles: 'admin' } })
```

Which should return the new content of the user:

```bash
{
  id: 1,
  name: null,
  email: 'admin@admin.com',
  hashedPassword: 'a12f3975a3722953fd8e326dd108d5645ad9563042fe9f154419361eeeb775d8',
  salt: '9abf4665293211adce1c99de412b219e',
  resetToken: null,
  resetTokenExpiresAt: null,
  roles: 'admin'
}
```

:::warning

If you re-used the same console session from the previous section, you'll need to quit it and start it again for it to know about the new Prisma data structure. If you still can't get the update to work, maybe your user doesn't have an `id` of `1`! Run `db.user.findMany()` first and then get the `id` of the user you want to update.

:::

Now head back to [http://localhost:8910/admin/posts](http://localhost:8910/admin/posts) and we should have access again. As the British say: brilliant!

### Add a Moderator

Let's create a new user that will represent the comment moderator. Since this is in development you can just make up an email address, but if you needed to do this in a real system that verified email addresses you could use **The Plus Trick** to create a new, unique email address that is actually the same as your original email address!

:::tip The Plus Trick

The Plus Trick is a very handy feature of the email standard known as a "boxname", the idea being that you may have other incoming boxes besides one just named "Inbox" and by adding `+something` to your email address you can specify which box the mail should be sorted into. They don't appear to be in common use these days, but they are ridiculously helpful for us developers when we're constantly needing new email addresses for testing: it gives us an infinite number of _valid_ email addresses—they all come to your regular inbox!

Just append +something to your email address before the @:

- `jane.doe+testing@example.com` will go to `jane.doe@example.com`
- `dom+20210909@example.com` will go to `dom@example.com`

Note that not all providers support this plus-based syntax, but the major ones (Gmail, Yahoo, Microsoft, Apple) do. If you find that you're not receiving emails at your own domain, you may want to create a free account at one of these providers just to use for testing.

:::

In our case we're not sending emails anywhere, and don't require them to be verified, so you can just use a made-up email for now. `moderator@moderator.com` has a nice ring to it.

:::info

If you disabled the new user signup as suggested at the end of the first part of the tutorial then you'll have a slightly harder time creating a new user (the Signup page is still enabled in the example repo for convenience). You could create one with the Redwood console, but you'll need to be clever—remember that we don't store the original password, just the hashed result when combined with a salt. Here's the commands to enter at the console for creating a new user (replace 'password' with your password of choice):

```javascript
const CryptoJS = require('crypto-js')
const salt = CryptoJS.lib.WordArray.random(128 / 8).toString()
const hashedPassword = CryptoJS.PBKDF2('password', salt, {
  keySize: 256 / 32,
}).toString()
db.user.create({
  data: { email: 'moderator@moderator.com', hashedPassword, salt },
})
```

:::

Now if you log out as the admin and log in as the moderator you should _not_ have access to the posts admin.

### Restrict Access in a Component

Locking down a whole page is easy enough via the Router, but what about individual functionality within a page or component?

Redwood provides a `hasRole()` function you can get from the `useAuth()` hook (you may recall us using that to get `currentUser` and display their email address in Part 1) which returns `true` or `false` depending on whether the logged in user has the given role. Let's try it out by adding a `Delete` button when a moderator is viewing a blog post's comments:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.jsx"
// highlight-next-line
import { useAuth } from 'src/auth'

const formattedDate = (datetime) => {
  const parsedDate = new Date(datetime)
  const month = parsedDate.toLocaleString('default', { month: 'long' })
  return `${parsedDate.getDate()} ${month} ${parsedDate.getFullYear()}`
}

const Comment = ({ comment }) => {
  // highlight-start
  const { hasRole } = useAuth()
  const moderate = () => {
    if (confirm('Are you sure?')) {
      // TODO: delete comment
    }
  }
  // highlight-end

  return (
    // highlight-next-line
    <div className="bg-gray-200 p-8 rounded-lg relative">
      <header className="flex justify-between">
        <h2 className="font-semibold text-gray-700">{comment.name}</h2>
        <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
          {formattedDate(comment.createdAt)}
        </time>
      </header>
      <p className="text-sm mt-2">{comment.body}</p>
      // highlight-start
      {hasRole('moderator') && (
        <button
          type="button"
          onClick={moderate}
          className="absolute bottom-2 right-2 bg-red-500 text-xs rounded text-white px-2 py-1"
        >
          Delete
        </button>
      )}
      // highlight-end
    </div>
  )
}

export default Comment
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.tsx"
// highlight-next-line
import { useAuth } from 'src/auth'

const formattedDate = (datetime: ConstructorParameters<typeof Date>[0]) => {
  const parsedDate = new Date(datetime)
  const month = parsedDate.toLocaleString('default', { month: 'long' })
  return `${parsedDate.getDate()} ${month} ${parsedDate.getFullYear()}`
}

interface Props {
  comment: {
    name: string
    createdAt: string
    body: string
  }
}

const Comment = ({ comment }: Props) => {
  // highlight-start
  const { hasRole } = useAuth()
  const moderate = () => {
    if (confirm('Are you sure?')) {
      // TODO: delete comment
    }
  }
  // highlight-end

  return (
    // highlight-next-line
    <div className="bg-gray-200 p-8 rounded-lg relative">
      <header className="flex justify-between">
        <h2 className="font-semibold text-gray-700">{comment.name}</h2>
        <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
          {formattedDate(comment.createdAt)}
        </time>
      </header>
      <p className="text-sm mt-2">{comment.body}</p>
      // highlight-start
      {hasRole('moderator') && (
        <button
          type="button"
          onClick={moderate}
          className="absolute bottom-2 right-2 bg-red-500 text-xs rounded text-white px-2 py-1"
        >
          Delete
        </button>
      )}
      // highlight-end
    </div>
  )
}

export default Comment
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/101229168-c75edb00-3653-11eb-85f0-6eb61af7d4e6.png)

So if the user has the "moderator" role, render the delete button. If you log out and back in as the admin, or if you log out completely, you'll see the delete button go away. When logged out (that is, `currentUser === null`) `hasRole()` will always return `false`.

What should we put in place of the `// TODO` note we left ourselves? A GraphQL mutation that deletes a comment, of course. Thanks to our forward-thinking earlier we already have a `deleteComment()` service function and GraphQL mutation ready to go.

And due to the nice encapsulation of our **Comment** component we can make all the required web-site changes in this one component:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.jsx"
// highlight-next-line
import { useMutation } from '@redwoodjs/web'

import { useAuth } from 'src/auth'

// highlight-next-line
import { QUERY as CommentsQuery } from 'src/components/CommentsCell'

// highlight-start
const DELETE = gql`
  mutation DeleteCommentMutation($id: Int!) {
    deleteComment(id: $id) {
      postId
    }
  }
`
// highlight-end

const formattedDate = (datetime) => {
  const parsedDate = new Date(datetime)
  const month = parsedDate.toLocaleString('default', { month: 'long' })
  return `${parsedDate.getDate()} ${month} ${parsedDate.getFullYear()}`
}

const Comment = ({ comment }) => {
  const { hasRole } = useAuth()
  // highlight-start
  const [deleteComment] = useMutation(DELETE, {
    refetchQueries: [
      {
        query: CommentsQuery,
        variables: { postId: comment.postId },
      },
    ],
  })
  // highlight-end

  const moderate = () => {
    if (confirm('Are you sure?')) {
      // highlight-start
      deleteComment({
        variables: { id: comment.id },
      })
      // highlight-end
    }
  }

  return (
    <div className="bg-gray-200 p-8 rounded-lg relative">
      <header className="flex justify-between">
        <h2 className="font-semibold text-gray-700">{comment.name}</h2>
        <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
          {formattedDate(comment.createdAt)}
        </time>
      </header>
      <p className="text-sm mt-2">{comment.body}</p>
      {hasRole('moderator') && (
        <button
          type="button"
          onClick={moderate}
          className="absolute bottom-2 right-2 bg-red-500 text-xs rounded text-white px-2 py-1"
        >
          Delete
        </button>
      )}
    </div>
  )
}

export default Comment
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.tsx"
// highlight-start
import type {
  Comment as IComment,
  DeleteCommentMutation,
  DeleteCommentMutationVariables,
} from 'types/graphql'

import type { TypedDocumentNode } from '@redwoodjs/web'
import { useMutation } from '@redwoodjs/web'

import { QUERY as CommentsQuery } from 'src/components/CommentsCell'
// highlight-end
import { useAuth } from 'src/auth'

// highlight-start
const DELETE: TypedDocumentNode<
  DeleteCommentMutation,
  DeleteCommentMutationVariables
> = gql`
  mutation DeleteCommentMutation($id: Int!) {
    deleteComment(id: $id) {
      postId
    }
  }
`
// highlight-end

const formattedDate = (datetime: ConstructorParameters<typeof Date>[0]) => {
  const parsedDate = new Date(datetime)
  const month = parsedDate.toLocaleString('default', { month: 'long' })
  return `${parsedDate.getDate()} ${month} ${parsedDate.getFullYear()}`
}

interface Props {
  // highlight-next-line
  comment: Pick<IComment, 'postId' | 'id' | 'name' | 'createdAt' | 'body'>
}

const Comment = ({ comment }: Props) => {
  const { hasRole } = useAuth()
  // highlight-start
  const [deleteComment] = useMutation(DELETE, {
    refetchQueries: [
      {
        query: CommentsQuery,
        variables: { postId: comment.postId },
      },
    ],
  })
  // highlight-end

  const moderate = () => {
    if (confirm('Are you sure?')) {
      // highlight-start
      deleteComment({
        variables: { id: comment.id },
      })
      // highlight-end
    }
  }

  return (
    <div className="bg-gray-200 p-8 rounded-lg relative">
      <header className="flex justify-between">
        <h2 className="font-semibold text-gray-700">{comment.name}</h2>
        <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
          {formattedDate(comment.createdAt)}
        </time>
      </header>
      <p className="text-sm mt-2">{comment.body}</p>
      {hasRole('moderator') && (
        <button
          type="button"
          onClick={moderate}
          className="absolute bottom-2 right-2 bg-red-500 text-xs rounded text-white px-2 py-1"
        >
          Delete
        </button>
      )}
    </div>
  )
}

export default Comment
```

</TabItem>
</Tabs>

We'll also need to update the `CommentsQuery` we're importing from `CommentsCell` to include the `postId` field, since we are relying on it to perform the `refetchQuery` after a successful deletion:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.jsx"
export const QUERY = gql`
  query CommentsQuery($postId: Int!) {
    comments(postId: $postId) {
      id
      name
      body
      // highlight-next-line
      postId
      createdAt
    }
  }
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.tsx"
//
export const QUERY: TypedDocumentNode<CommentsQuery, CommentsQueryVariables> =
  gql`
    query CommentsQuery($postId: Int!) {
      comments(postId: $postId) {
        id
        name
        body
        // highlight-next-line
        postId
        createdAt
      }
    }
  `
```

</TabItem>
</Tabs>

Click **Delete** (as a moderator) and the comment should be removed!

Ideally we'd have both versions of this component (with and without the "Delete" button) present in Storybook so we can iterate on the design. But there's no such thing as "logging in" in Storybook and our code depends on being logged in so we can check our roles...how will that work?

### Mocking currentUser for Storybook

Similar to how we can mock GraphQL calls in Storybook, we can mock user authentication and authorization functionality in a story.

In `Comment.stories.{jsx,tsx}` let's add a second story for the moderator view of the component (and rename the existing one for clarity):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.stories.jsx"
import Comment from './Comment'

// highlight-next-line
export const defaultView = () => {
  return (
    <Comment
      comment={{
        id: 1,
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
        // highlight-next-line
        postId: 1
      }}
    />
  )
}

// highlight-start
export const moderatorView = () => {
  return (
    <Comment
      comment={{
        id: 1,
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
        postId: 1,
      }}
    />
  )
}
// highlight-end

export default { title: 'Components/Comment' }
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.stories.ts"
import Comment from './Comment'

// highlight-next-line
export const defaultView = () => {
  return (
    <Comment
      comment={{
        id: 1,
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
        // highlight-next-line
        postId: 1,
      }}
    />
  )
}

// highlight-start
export const moderatorView = () => {
  return (
    <Comment
      comment={{
        id: 1,
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
        postId: 1,
      }}
    />
  )
}
// highlight-end

export default { title: 'Components/Comment' }
```

</TabItem>
</Tabs>

The **moderatorView** story needs to have a user available that has the moderator role. We can do that with the `mockCurrentUser` function:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.stories.jsx"
export const moderatorView = () => {
  // highlight-start
  mockCurrentUser({
    id: 1,
    email: 'moderator@moderator.com',
    roles: 'moderator',
  })
  // highlight-end

  return (
    <Comment
      comment={{
        id: 1,
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
        postId: 1,
      }}
    />
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.stories.tsx"
export const moderatorView = () => {
  // highlight-start
  mockCurrentUser({
    id: 1,
    email: 'moderator@moderator.com',
    roles: 'moderator',
  })
  // highlight-end

  return (
    <Comment
      comment={{
        id: 1,
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
        postId: 1,
      }}
    />
  )
}
```

</TabItem>
</Tabs>

:::info Where did `mockCurrentUser()` come from?

Similar to `mockGraphQLQuery()` and `mockGraphQLMutation()`, `mockCurrentUser()` is a global available in Storybook automatically, no need to import.

:::

`mockCurrentUser()` accepts an object and you can put whatever you want in there (it should be similar to what you return in `getCurrentUser()` in `api/src/lib/auth.{js,ts}`). But since we want `hasRole()` to work properly then the object must have a `roles` key that is a string or an array of strings.

Check out **Comment** in Storybook and you should see two stories for Comment, one with a "Delete" button and one without!

![image](https://user-images.githubusercontent.com/300/153970232-0224a6ab-fb86-4438-ae75-2e74e32aabc1.png)

### Mocking currentUser for Jest

We can use the same `mockCurrentUser()` function in our Jest tests as well. Let's check that the word "Delete" is present in the component's output when the user is a moderator, and that it's not present if the user has any other role (or no role):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.test.jsx"
// highlight-next-line
import { render, screen, waitFor } from '@redwoodjs/testing'

import Comment from './Comment'

// highlight-start
const COMMENT = {
  name: 'John Doe',
  body: 'This is my comment',
  createdAt: '2020-01-02T12:34:56Z',
}
// highlight-end

describe('Comment', () => {
  it('renders successfully', () => {
    // highlight-next-line
    render(<Comment comment={COMMENT} />)

    // highlight-start
    expect(screen.getByText(COMMENT.name)).toBeInTheDocument()
    expect(screen.getByText(COMMENT.body)).toBeInTheDocument()
    // highlight-end
    const dateExpect = screen.getByText('2 January 2020')
    expect(dateExpect).toBeInTheDocument()
    expect(dateExpect.nodeName).toEqual('TIME')
    // highlight-next-line
    expect(dateExpect).toHaveAttribute('datetime', COMMENT.createdAt)
  })

  // highlight-start
  it('does not render a delete button if user is logged out', async () => {
    render(<Comment comment={COMMENT} />)

    await waitFor(() =>
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    )
  })

  it('renders a delete button if the user is a moderator', async () => {
    mockCurrentUser({
      id: 1,
      email: 'moderator@moderator.com',
      roles: 'moderator',
    })
    render(<Comment comment={COMMENT} />)

    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument())
  })
  // highlight-end
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.test.tsx"
// highlight-next-line
import { render, screen, waitFor } from '@redwoodjs/testing'

import Comment from './Comment'

// highlight-start
const COMMENT = {
  id: 1,
  name: 'John Doe',
  body: 'This is my comment',
  createdAt: '2020-01-02T12:34:56Z',
  postId: 1,
}
// highlight-end

describe('Comment', () => {
  it('renders successfully', () => {
    // highlight-next-line
    render(<Comment comment={COMMENT} />)

    // highlight-start
    expect(screen.getByText(COMMENT.name)).toBeInTheDocument()
    expect(screen.getByText(COMMENT.body)).toBeInTheDocument()
    // highlight-end
    const dateExpect = screen.getByText('2 January 2020')
    expect(dateExpect).toBeInTheDocument()
    expect(dateExpect.nodeName).toEqual('TIME')
    // highlight-next-line
    expect(dateExpect).toHaveAttribute('datetime', COMMENT.createdAt)
  })

  // highlight-start
  it('does not render a delete button if user is logged out', async () => {
    render(<Comment comment={COMMENT} />)

    await waitFor(() =>
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    )
  })

  it('renders a delete button if the user is a moderator', async () => {
    mockCurrentUser({
      id: 1,
      email: 'moderator@moderator.com',
      roles: 'moderator',
    })

    render(<Comment comment={COMMENT} />)

    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument())
  })
  // highlight-end
})
```

</TabItem>
</Tabs>

We moved the default `comment` object to a constant `COMMENT` and then used that in all tests. We also needed to add `waitFor()` since the `hasRole()` check in the Comment itself actually executes some GraphQL calls behind the scenes to figure out who the user is. The test suite makes mocked GraphQL calls, but they're still asynchronous and need to be waited for. If you don't wait, then `currentUser` will be `null` when the test starts, and Jest will be happy with that result. But we won't—we need to wait for the actual value from the GraphQL call.

:::warning Seeing errors in your test suite?

We added fields to the database and sometimes the test runner doesn't realize this. You may need to restart it to get the test database migrated to match what's in `schema.prisma`. Press `q` or `Ctrl-C` in your test runner if it's still running, then:

```bash
yarn rw test
```

The suite should automatically run the tests for `Comment` and `CommentCell` at the very least, and maybe a few more if you haven't committed your code to git in a while.

:::

:::info

This isn't the most robust test that's ever been written: what if the sample text of the comment itself had the word "Delete" in it? Whoops! But you get the idea—find some meaningful difference in each possible render state of a component and write a test that verifies its presence (or lack of presence).

Think of each conditional in your component as another branch you need to have a test for. In the worst case, each conditional adds 2<sup>n</sup> possible render states. If you have three conditionals that's 2<sup>3</sup> (eight) possible combinations of output and to be safe you'll want to test them all. When you get yourself into this scenario it's a good sign that it's time to refactor and simplify your component. Maybe into subcomponents where each is responsible for just one of those conditional outputs? You'll still need the same number of total tests, but each component and its test is now operating in isolation and making sure it does one thing, and does it well. This has benefits for your mental model of the codebase as well.

It's like finally organizing that junk drawer in the kitchen—you still have the same number of things when you're done, but each thing is in its own space and therefore easier to remember where it lives and makes it easier to find next time.

:::

You may see the following message output during the test run:

```bash
console.error
  Missing field 'postId' while writing result {
    "id": 1,
    "name": "Rob Cameron",
    "body": "First comment",
    "createdAt": "2020-01-02T12:34:56Z"
  }
```

If you take a look at `CommentsCell.mock.{js,ts}` you'll see the mock data there used during the test. We're requesting `postId` in the `QUERY` in `CommentsCell` now, but this mock doesn't return it! We can fix that by simply adding that field to both mocks:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="web/src/components/CommentsCell/CommentsCell.mock.js"
export const standard = () => ({
  comments: [
    {
      id: 1,
      name: 'Rob Cameron',
      body: 'First comment',
      // highlight-next-line
      postId: 1,
      createdAt: '2020-01-02T12:34:56Z',
    },
    {
      id: 2,
      name: 'David Price',
      body: 'Second comment',
      // highlight-next-line
      postId: 2,
      createdAt: '2020-02-03T23:00:00Z',
    },
  ],
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```javascript title="web/src/components/CommentsCell/CommentsCell.mock.ts"
export const standard = () => ({
  comments: [
    {
      id: 1,
      name: 'Rob Cameron',
      body: 'First comment',
      // highlight-next-line
      postId: 1,
      createdAt: '2020-01-02T12:34:56Z',
    },
    {
      id: 2,
      name: 'David Price',
      body: 'Second comment',
      // highlight-next-line
      postId: 2,
      createdAt: '2020-02-03T23:00:00Z',
    },
  ],
})
```

</TabItem>
</Tabs>

We don't do anything with the actual post data in our tests, so there's no need to mock out the entire post, just a `postId` will suffice.

### Roles on the API Side

Remember: never trust the client! We need to lock down the backend to be sure that someone can't discover our `deleteComment` GraphQL resource and start deleing comments willy nilly.

Recall in Part 1 of the tutorial we used a [directive](../../directives.md) `@requireAuth` to be sure that someone was logged in before allowing them to access a given GraphQL query or mutation. It turns out that `@requireAuth` can take an optional `roles` argument:

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
    comments(postId: Int!): [Comment!]! @skipAuth
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

  type Mutation {
    createComment(input: CreateCommentInput!): Comment! @skipAuth
    // highlight-next-line
    deleteComment(id: Int!): Comment! @requireAuth(roles: "moderator")
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
    comments(postId: Int!): [Comment!]! @skipAuth
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

  type Mutation {
    createComment(input: CreateCommentInput!): Comment! @skipAuth
    // highlight-next-line
    deleteComment(id: Int!): Comment! @requireAuth(roles: "moderator")
  }
`
```

</TabItem>
</Tabs>

Now a raw GraphQL query to the `deleteComment` mutation will result in an error if the user isn't logged in as a moderator.

This check only prevents access to `deleteComment` via GraphQL. What if you're calling one service from another? If we wanted the same protection within the service itself, we could call `requireAuth` directly:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.js"
// highlight-next-line
import { requireAuth } from 'src/lib/auth'
import { db } from 'src/lib/db'

// ...

export const deleteComment = ({ id }) => {
  // highlight-next-line
  requireAuth({ roles: 'moderator' })
  return db.comment.delete({
    where: { id },
  })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.ts"
// highlight-next-line
import { requireAuth } from 'src/lib/auth'
import { db } from 'src/lib/db'

// ...

export const deleteComment = ({ id }) => {
  // highlight-next-line
  requireAuth({ roles: 'moderator' })
  return db.comment.delete({
    where: { id },
  })
}
```

</TabItem>
</Tabs>

We'll need a test to go along with that functionality. How do we test `requireAuth()`? The api side also has a `mockCurrentUser()` function which behaves the same as the one on the web side:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.test.js"
// highlight-next-line
import { AuthenticationError, ForbiddenError } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

// highlight-next-line
import { comments, createComment, deleteComment } from './comments'

describe('comments', () => {
  scenario(
    'returns all comments for a single post from the database',
    async (scenario) => {
      const result = await comments({ postId: scenario.comment.jane.postId })
      const post = await db.post.findUnique({
        where: { id: scenario.comment.jane.postId },
        include: { comments: true },
      })
      expect(result.length).toEqual(post.comments.length)
    }
  )

  scenario('postOnly', 'creates a new comment', async (scenario) => {
    const comment = await createComment({
      input: {
        name: 'Billy Bob',
        body: 'What is your favorite tree bark?',
        postId: scenario.post.bark.id,
      },
    })

    expect(comment.name).toEqual('Billy Bob')
    expect(comment.body).toEqual('What is your favorite tree bark?')
    expect(comment.postId).toEqual(scenario.post.bark.id)
    expect(comment.createdAt).not.toEqual(null)
  })

  // highlight-start
  scenario('allows a moderator to delete a comment', async (scenario) => {
    mockCurrentUser({ roles: ['moderator'] })

    const comment = await deleteComment({
      id: scenario.comment.jane.id,
    })
    expect(comment.id).toEqual(scenario.comment.jane.id)

    const result = await comments({ postId: scenario.comment.jane.postId })
    expect(result.length).toEqual(0)
  })

  scenario(
    'does not allow a non-moderator to delete a comment',
    async (scenario) => {
      mockCurrentUser({ roles: 'user' })

      expect(() =>
        deleteComment({
          id: scenario.comment.jane.id,
        })
      ).toThrow(ForbiddenError)
    }
  )

  scenario(
    'does not allow a logged out user to delete a comment',
    async (scenario) => {
      mockCurrentUser(null)

      expect(() =>
        deleteComment({
          id: scenario.comment.jane.id,
        })
      ).toThrow(AuthenticationError)
    }
  )
  // highlight-end
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.test.ts"
// highlight-next-line
import { AuthenticationError, ForbiddenError } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

// highlight-next-line
import { comments, createComment, deleteComment } from './comments'

import type { PostOnlyScenario, StandardScenario } from './comments.scenarios'

describe('comments', () => {
  scenario(
    'returns all comments for a single post from the database',
    async (scenario) => {
      const result = await comments({ postId: scenario.comment.jane.postId })
      const post = await db.post.findUnique({
        where: { id: scenario.comment.jane.postId },
        include: { comments: true },
      })
      expect(result.length).toEqual(post.comments.length)
    }
  )

  scenario(
    'postOnly',
    'creates a new comment',
    async (scenario: PostOnlyScenario) => {
      const comment = await createComment({
        input: {
          name: 'Billy Bob',
          body: 'What is your favorite tree bark?',
          postId: scenario.post.bark.id,
        },
      })

      expect(comment.name).toEqual('Billy Bob')
      expect(comment.body).toEqual('What is your favorite tree bark?')
      expect(comment.postId).toEqual(scenario.post.bark.id)
      expect(comment.createdAt).not.toEqual(null)
    }
  )

  // highlight-start
  scenario(
    'allows a moderator to delete a comment',
    async (scenario: StandardScenario) => {
      mockCurrentUser({
        roles: 'moderator',
        id: 1,
        email: 'moderator@moderator.com',
      })

      const comment = await deleteComment({
        id: scenario.comment.jane.id,
      })
      expect(comment.id).toEqual(scenario.comment.jane.id)

      const result = await comments({ postId: scenario.comment.jane.postId })
      expect(result.length).toEqual(0)
    }
  )

  scenario(
    'does not allow a non-moderator to delete a comment',
    async (scenario: StandardScenario) => {
      mockCurrentUser({ roles: 'user', id: 1, email: 'user@user.com' })

      expect(() =>
        deleteComment({
          id: scenario.comment.jane.id,
        })
      ).toThrow(ForbiddenError)
    }
  )

  scenario(
    'does not allow a logged out user to delete a comment',
    async (scenario: StandardScenario) => {
      mockCurrentUser(null)

      expect(() =>
        deleteComment({
          id: scenario.comment.jane.id,
        })
      ).toThrow(AuthenticationError)
    }
  )
  // highlight-end
})
```

</TabItem>
</Tabs>

Our first scenario checks that we get the deleted comment back from a call to `deleteComment()`. The second expectation makes sure that the comment was actually removed from the database: trying to find a comment with that `id` now returns an empty array. If this was the only test we had it could lull us into a false sense of security—what if the user had a different role, or wasn't logged in at all?

We aren't testing those cases here, so we add two more tests: one for if the user has a role other than "moderator" and one if the user isn't logged in at all. These two cases also raise different errors, so it's nice to see that codified here.

### Last Word on Roles

Having a role like "admin" implies that they can do everything...shouldn't they be able to delete comments as well? Right you are! There are two things we can do here:

1. Add "admin" to the list of roles in the `hasRole()` checks in components, `@requireAuth` directive, and `requireAuth()` check in services
2. Don't make any changes in the code, just give the user in the database additional roles—so admins will also have the "moderator" role in addition to "admin"

By virtue of the name "admin" it really feels like someone should only have that one single role and be able to do everything. So in this case it might feel better to add "admin" to `hasRole()` and `requireAuth()`.

But, if you wanted to be more fine-grained with your roles then maybe the "admin" role should really be called "author". That way it makes it clear they only author posts, and if you want someone to be able to do both actions you can explicitly give them the "moderator" role in addition to "author."

Managing roles can be a tricky thing to get right. Spend a little time up front thinking about how they'll interact and how much duplication you're willing to accept in your role-based function calls on the site. If you see yourself constantly adding multiple roles to `hasRole()` and `requireAuth()` that may be an indication that it's time to add a single, new role that includes those abilities and remove that duplication in your code.
