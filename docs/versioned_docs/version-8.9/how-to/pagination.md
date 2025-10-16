# Pagination

This tutorial will show you one way to implement pagination in an app built using RedwoodJS. It builds on top of [the tutorial](../tutorial/foreword.md) and I'll assume you have a folder with the code from the tutorial that you can continue working on. (If you don't, you can clone this repo: https://github.com/thedavidprice/redwood-tutorial-test)

![redwoodjs-pagination](https://user-images.githubusercontent.com/30793/94778130-ec6d6e00-03c4-11eb-9fd0-97cbcdf68ec2.png)

The screenshot above shows what we're building. See the pagination at the bottom? The styling is up to you to fix.

So you have a blog, and probably only a few short posts. But as the blog grows bigger you'll soon need to paginate all your posts. So, go ahead and create a bunch of posts to make this pagination worthwhile. We'll display five posts per page, so begin with creating at least six posts, to get two pages.

We'll begin by updating the SDL. To our `Query` type a new query is added to get just a single page of posts. We'll pass in the page we want, and when returning the result we'll also include the total number of posts as that'll be needed when building our pagination component.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/graphql/posts.sdl.js"
export const schema = gql`
  # ...

  type PostPage {
    posts: [Post!]!
    count: Int!
  }

  type Query {
    postPage(page: Int): PostPage
    posts: [Post!]!
    post(id: Int!): Post!
  }

  # ...
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```typescript title="api/src/graphql/posts.sdl.ts"
export const schema = gql`
  # ...

  type PostPage {
    posts: [Post!]!
    count: Int!
  }

  type Query {
    postPage(page: Int): PostPage
    posts: [Post!]!
    post(id: Int!): Post!
  }

  # ...
`
```

</TabItem>
</Tabs>

You might have noticed that we made the page optional. That's because we want to be able to default to the first page if no page is provided.

Now we need to add a resolver for this new query to our posts service.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/posts/posts.js"
const POSTS_PER_PAGE = 5

export const postPage = ({ page = 1 }) => {
  const offset = (page - 1) * POSTS_PER_PAGE

  return {
    posts: db.post.findMany({
      take: POSTS_PER_PAGE,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    count: db.post.count(),
  }
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```typescript title="api/src/services/posts/posts.ts"
const POSTS_PER_PAGE = 5

export const postPage = ({ page = 1 }) => {
  const offset = (page - 1) * POSTS_PER_PAGE

  return {
    posts: db.post.findMany({
      take: POSTS_PER_PAGE,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    count: db.post.count(),
  }
}
```

</TabItem>
</Tabs>

So now we can make a GraphQL request (using [Apollo](https://www.apollographql.com/)) for a specific page of our blog posts. And the resolver we just updated will use [Prisma](https://www.prisma.io/) to fetch the correct posts from our database.

With these updates to the API side of things done, it's time to move over to the web side. It's the BlogPostsCell component that makes the gql query to display the list of blog posts on the HomePage of the blog, so let's update that query.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/BlogPostsCell/BlogPostsCell.jsx"
export const QUERY = gql`
  query BlogPostsQuery($page: Int) {
    postPage(page: $page) {
      posts {
        id
        title
        body
        createdAt
      }
      count
    }
  }
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/BlogPostsCell/BlogPostsCell.tsx"
import type { BlogPostsQuery, BlogPostsQueryVariables } from 'types/graphql'

import type { TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<BlogPostsQuery, BlogPostsQueryVariables> =
  gql`
    query BlogPostsQuery($page: Int) {
      postPage(page: $page) {
        posts {
          id
          title
          body
          createdAt
        }
        count
      }
    }
  `
```

</TabItem>
</Tabs>

The `Success` component in the same file also needs a bit of an update to handle the new gql query result structure.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">
  
```jsx title="web/src/components/BlogPostsCell/BlogPostsCell.jsx"
export const Success = ({ postPage }) => {
  return postPage.posts.map((post) => <BlogPost key={post.id} post={post} />)
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/BlogPostsCell/BlogPostsCell.tsx"
export const Success = ({
  postPage,
}: CellSuccessProps<BlogPostsQuery, BlogPostsQueryVariables>) => {
  return postPage.posts.map((post) => <BlogPost key={post.id} post={post} />)
}
```

</TabItem>
</Tabs>

Now we need a way to pass a value for the `page` parameter to the query. To do that we'll take advantage of a little RedwoodJS magic. Remember from the tutorial how you made the post id part of the route path `(<Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />)` and that id was then sent as a prop to the BlogPostPage component? We'll do something similar here for the page number, but instead of making it a part of the url path, we'll make it a url query string. These, too, are magically passed as a prop to the relevant page component. And you don't even have to update the route to make it work! Let's update `HomePage.js` to handle the prop.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">
  
```jsx title="web/src/pages/HomePage/HomePage.jsx"
const HomePage = ({ page = 1 }) => {
  return (
    <BlogLayout>
      <BlogPostsCell page={page} />
    </BlogLayout>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/HomePage/HomePage.tsx"
const HomePage = ({ page = 1 }) => {
  return (
    <BlogLayout>
      <BlogPostsCell page={page} />
    </BlogLayout>
  )
}
```

</TabItem>
</Tabs>

So now if someone navigates to https://awesomeredwoodjsblog.com?page=2 (and the blog was actually hosted on awesomeredwoodjsblog.com), then `HomePage` would have its `page` prop set to `"2"`, and we then pass that value along to `BlogPostsCell`. If no `?page=` query parameter is provided `page` will default to `1`

Going back to `BlogPostsCell` there is one me thing to add before the query parameter work.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">
  
```jsx title="web/src/components/BlogPostsCell/BlogPostsCell.jsx"
export const beforeQuery = ({ page }) => {
  page = page ? parseInt(page, 10) : 1

  return { variables: { page } }
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/BlogPostsCell/BlogPostsCell.tsx"
export const beforeQuery = ({
  page,
}: FindBlogPostQueryVariables): GraphQLQueryHookOptions<
  FindBlogPostQuery,
  FindBlogPostQueryVariables
> => {
  page = page ? parseInt(page, 10) : 1

  return { variables: { page } }
}
```

</TabItem>
</Tabs>

The query parameter is passed to the component as a string, so we need to parse it into a number.

If you run the project with `yarn rw dev` on the default port 8910 you can now go to http://localhost:8910 and you should only see the first five posts. Change the URL to http://localhost:8910?page=2 and you should see the next five posts (if you have that many, if you only have six posts total you should now see just one post).

The final thing to add is a page selector, or pagination component, to the end of the list of posts to be able to click and jump between the different pages.

Generate a new component with`yarn rw g component Pagination`

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">
  
```jsx title="web/src/components/Pagination/Pagination.jsx"
import { Link, routes } from '@redwoodjs/router'

const POSTS_PER_PAGE = 5

const Pagination = ({ count }) => {
  const items = []

  for (let i = 0; i < Math.ceil(count / POSTS_PER_PAGE); i++) {
    items.push(
      <li key={i}>
        <Link to={routes.home({ page: i + 1 })}>{i + 1}</Link>
      </li>
    )
  }

  return (
    <>
      <h2>Pagination</h2>
      <ul>{items}</ul>
    </>
  )
}

export default Pagination
```


</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Pagination/Pagination.tsx"
import { Link, routes } from '@redwoodjs/router'

const POSTS_PER_PAGE = 5

const Pagination = ({ count }: { count: number }) => {
  const items = []

  for (let i = 0; i < Math.ceil(count / POSTS_PER_PAGE); i++) {
    items.push(
      <li key={i}>
        <Link to={routes.home({ page: i + 1 })}>{i + 1}</Link>
      </li>
    )
  }

  return (
    <>
      <h2>Pagination</h2>
      <ul>{items}</ul>
    </>
  )
}

export default Pagination
```

</TabItem>
</Tabs>

Keeping with the theme of the official RedwoodJS tutorial we're not adding any css, but if you wanted the pagination to look a little nicer it'd be easy to remove the bullets from that list, and make it horizontal instead of vertical.

Finally let's add this new component to the end of `BlogPostsCell`. Don't forget to `import` it at the top as well.


<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/BlogPostsCell/BlogPostsCell.jsx"
import Pagination from 'src/components/Pagination'

// ...

export const Success = ({ postPage }) => {
  return (
    <>
      {postPage.posts.map((post) => (
        <BlogPost key={post.id} post={post} />
      ))}

      <Pagination count={postPage.count} />
    </>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/BlogPostsCell/BlogPostsCell.tsx"
import Pagination from 'src/components/Pagination'

// ...

export const Success = ({
  postPage,
}: CellSuccessProps<BlogPostsQuery, BlogPostsQueryVariables>) => {
  return (
    <>
      {postPage.posts.map((post) => (
        <BlogPost key={post.id} post={post} />
      ))}

      <Pagination count={postPage.count} />
    </>
  )
}
```

</TabItem>
</Tabs>

And there you have it! You have now added pagination to your redwood blog. One technical limitation to the current implementation is that it doesn't handle too many pages very gracefully. Just imagine what that list of pages would look like if you had 100 pages! It's left as an exercise to the reader to build a more fully featured Pagination component.

Most of the code in this tutorial was copy/pasted from the ["Hammer Blog" RedwoodJS example](https://github.com/redwoodjs/example-blog)

If you want to learn more about [pagination with Prisma](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/pagination) and [pagination with Apollo](https://www.apollographql.com/docs/react/data/pagination/) they both have excellent docs on the topic.
