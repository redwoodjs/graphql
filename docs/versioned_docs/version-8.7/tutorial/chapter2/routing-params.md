# Routing Params

Now that we have our homepage listing all the posts, let's build the "detail" page—a canonical URL that displays a single post. First we'll generate the page and route:

```bash
yarn rw g page Article
```

Now let's link the title of the post on the homepage to the detail page (and include the `import` for `Link` and `routes`):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/ArticlesCell/ArticlesCell.jsx"
// highlight-next-line
import { Link, routes } from '@redwoodjs/router'

// QUERY, Loading, Empty and Failure definitions...

export const Success = ({ articles }) => {
  return (
    <>
      {articles.map((article) => (
        <article key={article.id}>
          <header>
            <h2>
              // highlight-next-line
              <Link to={routes.article()}>{article.title}</Link>
            </h2>
          </header>
          <p>{article.body}</p>
          <div>Posted at: {article.createdAt}</div>
        </article>
      ))}
    </>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/components/ArticlesCell/ArticlesCell.tsx"
// highlight-next-line
import { Link, routes } from '@redwoodjs/router'

// QUERY, Loading, Empty and Failure definitions...

export const Success = ({
  articles,
}: CellSuccessProps<ArticlesQuery, ArticlesQueryVariables>) => {
  return (
    <>
      {articles.map((article) => (
        <article key={article.id}>
          <header>
            <h2>
              // highlight-next-line
              <Link to={routes.article()}>{article.title}</Link>
            </h2>
          </header>
          <p>{article.body}</p>
          <div>Posted at: {article.createdAt}</div>
        </article>
      ))}
    </>
  )
}
```

</TabItem>
</Tabs>

If you click the link on the title of the blog post you should see the boilerplate text on `ArticlePage`:

![Article page](https://user-images.githubusercontent.com/300/146100107-895a37af-7549-46fe-8802-2628fe6b49ed.png)

But what we really need is to specify _which_ post we want to view on this page. It would be nice to be able to specify the ID of the post in the URL with something like `/article/1`. Let's tell the `<Route>` to expect another part of the URL, and when it does, give that part a name that we can reference later:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/Routes.jsx"
<Route path="/article/{id}" page={ArticlePage} name="article" />
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/Routes.tsx"
<Route path="/article/{id}" page={ArticlePage} name="article" />
```

</TabItem>
</Tabs>

Notice the `{id}`. Redwood calls these _route parameters_. They say "whatever value is in this position in the path, let me reference it by the name inside the curly braces". And while we're in the routes file, lets move the route inside the `Set` with the `BlogLayout`.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/Routes.jsx"
import { Router, Route, Set } from '@redwoodjs/router'
import ScaffoldLayout from 'src/layouts/ScaffoldLayout'
import BlogLayout from 'src/layouts/BlogLayout'

const Routes = () => {
  return (
    <Router>
      <Set wrap={ScaffoldLayout} title="Posts" titleTo="posts" buttonLabel="New Post" buttonTo="newPost">
        <Route path="/posts/new" page={PostNewPostPage} name="newPost" />
        <Route path="/posts/{id:Int}/edit" page={PostEditPostPage} name="editPost" />
        <Route path="/posts/{id:Int}" page={PostPostPage} name="post" />
        <Route path="/posts" page={PostPostsPage} name="posts" />
      </Set>
      <Set wrap={BlogLayout}>
        // highlight-next-line
        <Route path="/article/{id}" page={ArticlePage} name="article" />
        <Route path="/about" page={AboutPage} name="about" />
        <Route path="/" page={HomePage} name="home" />
      </Set>
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/Routes.tsx"
import { Router, Route, Set } from '@redwoodjs/router'
import ScaffoldLayout from 'src/layouts/ScaffoldLayout'
import BlogLayout from 'src/layouts/BlogLayout'

const Routes = () => {
  return (
    <Router>
      <Set wrap={ScaffoldLayout} title="Posts" titleTo="posts" buttonLabel="New Post" buttonTo="newPost">
        <Route path="/posts/new" page={PostNewPostPage} name="newPost" />
        <Route path="/posts/{id:Int}/edit" page={PostEditPostPage} name="editPost" />
        <Route path="/posts/{id:Int}" page={PostPostPage} name="post" />
        <Route path="/posts" page={PostPostsPage} name="posts" />
      </Set>
      <Set wrap={BlogLayout}>
        // highlight-next-line
        <Route path="/article/{id}" page={ArticlePage} name="article" />
        <Route path="/about" page={AboutPage} name="about" />
        <Route path="/" page={HomePage} name="home" />
      </Set>
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
```

</TabItem>
</Tabs>

Cool, cool, cool. Now we need to construct a link that has the ID of a post in it:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/ArticlesCell/ArticlesCell.jsx"
<h2>
  <Link to={routes.article({ id: article.id })}>{article.title}</Link>
</h2>
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/components/ArticlesCell/ArticlesCell.tsx"
<h2>
  <Link to={routes.article({ id: article.id })}>{article.title}</Link>
</h2>
```

</TabItem>
</Tabs>

<ShowForTs>

:::info Wait... why am I getting a TypeScript error?

When you have your dev server running, the Redwood CLI will watch your project and generate types. You can regenerate these types manually too, by running `yarn rw g types`.

In this case, the path `/article/{id}` doesn't specify the type of `id` - so it defaults to `string` - where as our article id is actually a `number`. We'll tackle this in the next few sections - so you can ignore the red squiggle for now, and power through!
:::

</ShowForTs>

For routes with route parameters, the named route function expects an object where you specify a value for each parameter. If you click on the link now, it will indeed take you to `/article/1` (or `/article/2`, etc, depending on the ID of the post).

You may have noticed that when trying to view the new single-article page that you're getting an error. This is because the boilerplate code included with the page when it was generated includes a link to the page itself—a link which now requires an `id`. Remove the link and your page should be working again:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```diff title="web/src/pages/ArticlePage.js"
- import { Link, routes } from '@redwoodjs/router'
  import { Metadata } from '@redwoodjs/web'

  const ArticlePage = () => {
    return (
      <>
        <Metadata title="Article" description="Article page" />

        <h1>ArticlePage</h1>
        <p>
          Find me in <code>./web/src/pages/ArticlePage/ArticlePage.js</code>
        </p>
        {/*
          My default route is named <code>article</code>, link to me with `
          <Link to={routes.article()}>Article</Link>`
        */}
      </>
    )
  }

  export default ArticlePage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```diff title="web/src/pages/ArticlePage.tsx"
- import { Link, routes } from '@redwoodjs/router'
  import { Metadata } from '@redwoodjs/web'

  const ArticlePage = () => {
    return (
      <>
        <Metadata title="Article" description="Article page" />

        <h1>ArticlePage</h1>
        <p>
          Find me in <code>./web/src/pages/ArticlePage/ArticlePage.tsx</code>
        </p>
        {/*
          My default route is named <code>article</code>, link to me with `
          <Link to={routes.article()}>Article</Link>`
        */}
      </>
    )
  }

  export default ArticlePage
```

</TabItem>
</Tabs>

### Using the Param

Ok, so the ID is in the URL. What do we need next in order to display a specific post? It sounds like we'll be doing some data retrieval from the database, which means we want a cell. Note the singular `Article` here since we're only displaying one:

```bash
yarn rw g cell Article
```

And then we'll use that cell in `ArticlePage`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ArticlePage/ArticlePage.jsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import ArticleCell from 'src/components/ArticleCell'

const ArticlePage = () => {
  return (
    <>
      <Metadata title="Article" description="Article page" />

      // highlight-next-line
      <ArticleCell />
    </>
  )
}

export default ArticlePage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/pages/ArticlePage/ArticlePage.tsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import ArticleCell from 'src/components/ArticleCell'

const ArticlePage = () => {
  return (
    <>
      <Metadata title="Article" description="Article page" />

      // highlight-next-line
      <ArticleCell />
    </>
  )
}

export default ArticlePage
```

</TabItem>
</Tabs>

Now over to the cell, we need access to that `{id}` route param so we can look up the ID of the post in the database. Let's alias the real query name `post` to `article` and retrieve some more fields:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/ArticleCell/ArticleCell.jsx"
export const QUERY = gql`
  query FindArticleQuery($id: Int!) {
    // highlight-next-line
    article: post(id: $id) {
      id
      // highlight-start
      title
      body
      createdAt
      // highlight-end
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({ article }) => {
  return <div>{JSON.stringify(article)}</div>
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/ArticleCell/ArticleCell.tsx"
import type { FindArticleQuery, FindArticleQueryVariables } from 'types/graphql'

import type {
  CellFailureProps,
  CellSuccessProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<
  FindArticleQuery,
  FindArticleQueryVariables
> = gql`
  query FindArticleQuery($id: Int!) {
    // highlight-next-line
    article: post(id: $id) {
      id
      // highlight-start
      title
      body
      createdAt
      // highlight-end
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({
  error,
}: CellFailureProps<FindArticleQueryVariables>) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({
  article,
}: CellSuccessProps<FindArticleQuery, FindArticleQueryVariables>) => {
  return <div>{JSON.stringify(article)}</div>
}
```

</TabItem>
</Tabs>

Okay, we're getting closer. Still, where will that `$id` come from? Redwood has another trick up its sleeve. Whenever you put a route param in a route, that param is automatically made available to the page that route renders. Which means we can update `ArticlePage` to look like this:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ArticlePage/ArticlePage.jsx"
import { Metadata } from '@redwoodjs/web'
import ArticleCell from 'src/components/ArticleCell'

// highlight-next-line
const ArticlePage = ({ id }) => {
  return (
    <>
      <Metadata title="Article" description="Article page" />

      // highlight-next-line
      <ArticleCell id={id} />
    </>
  )
}

export default ArticlePage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ArticlePage/ArticlePage.tsx"
import { Metadata } from '@redwoodjs/web'
import ArticleCell from 'src/components/ArticleCell'

// highlight-start
interface Props {
  id: number
}
// highlight-end

// highlight-next-line
const ArticlePage = ({ id }: Props) => {
  return (
    <>
      <Metadata title="Article" description="Article page" />

      // highlight-next-line
      <ArticleCell id={id} />
    </>
  )
}

export default ArticlePage
```

</TabItem>
</Tabs>

`id` already exists since we named our route param `{id}`. Thanks Redwood! But how does that `id` end up as the `$id` GraphQL parameter? If you've learned anything about Redwood by now, you should know it's going to take care of that for you. By default, any props you give to a cell will automatically be turned into variables and given to the query. "No way," you're saying. Way.

We can prove it! Try going to the detail page for a post in the browser and—uh oh. Hmm:

![Article error message](https://user-images.githubusercontent.com/300/146100555-cea8806a-70aa-43e5-b2b4-d49d84014c4e.png)

:::tip

This error message you're seeing is thanks to the `Failure` section of our Cell!

:::

```
Error: Variable "$id" got invalid value "1"; Int cannot represent non-integer value: "1"
```

It turns out that route params are extracted as strings from the URL, but GraphQL wants an integer for the `id`. We could use `parseInt()` to convert it to a number before passing it into `ArticleCell`, but we can do better than that.

### Route Param Types

What if you could request the conversion right in the route's path? Introducing **route param types**. It's as easy as adding `:Int` to our existing route param:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/Routes.jsx"
<Route path="/article/{id:Int}" page={ArticlePage} name="article" />
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/Routes.tsx"
<Route path="/article/{id:Int}" page={ArticlePage} name="article" />
```

</TabItem>
</Tabs>

Voilà! Not only will this convert the `id` param to a number before passing it to your Page, it will prevent the route from matching unless the `id` path segment consists entirely of digits. If any non-digits are found, the router will keep trying other routes, eventually showing the `NotFoundPage` if no routes match.

:::info What if I want to pass some other prop to the cell that I don't need in the query, but do need in the Success/Loader/etc. components?

All of the props you give to the cell will be automatically available as props in the render components. Only the ones that match the GraphQL variables list will be given to the query. You get the best of both worlds! In our post display above, if you wanted to display some random number along with the post (for some contrived, tutorial-like reason), just pass that prop:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx
<ArticleCell id={id} rand={Math.random()} />
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx
<ArticleCell id={id} rand={Math.random()} />
```

</TabItem>
</Tabs>

And get it, along with the query result (and even the original `id` if you want) in the component:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript
export const Success = ({ article, id, rand }) => {
  // ...
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx
interface Props
  extends CellSuccessProps<FindArticleQuery, FindArticleQueryVariables> {
  rand: number
}

export const Success = ({ article, id, rand }: Props) => {
  // ...
}
```

</TabItem>
</Tabs>

Thanks again, Redwood!

:::

### Displaying a Blog Post

Now let's display the actual post instead of just dumping the query result. We could copy the display from the articles on the homepage, but that's not very reusable! This is the perfect place for a good old fashioned component—define the display once and then reuse the component on the homepage and the article display page. Both `ArticlesCell` and `ArticleCell` will display our new component. Let's Redwood-up a component (I just invented that phrase):

```bash
yarn rw g component Article
```

Which creates `web/src/components/Article/Article.{jsx,tsx}` (and corresponding test and more!) as a super simple React component:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
const Article = () => {
  return (
    <div>
      <h2>{'Article'}</h2>
      <p>{'Find me in ./web/src/components/Article/Article.jsx'}</p>
    </div>
  )
}

export default Article
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.tsx"
const Article = () => {
  return (
    <div>
      <h2>{'Article'}</h2>
      <p>{'Find me in ./web/src/components/Article/Article.tsx'}</p>
    </div>
  )
}

export default Article
```

</TabItem>
</Tabs>

:::info

You may notice we don't have any explicit `import` statements for `React` itself. We (the Redwood dev team) got tired of constantly importing it over and over again in every file so we automatically import it for you!

:::

Let's copy the `<article>` section from `ArticlesCell` and put it here instead, taking the `article` itself in as a prop:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
// highlight-next-line
import { Link, routes } from '@redwoodjs/router'

// highlight-next-line
const Article = ({ article }) => {
  return (
    // highlight-start
    <article>
      <header>
        <h2>
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div>{article.body}</div>
      <div>Posted at: {article.createdAt}</div>
    </article>
    // highlight-end
  )
}

export default Article
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.tsx"
// highlight-next-line
import { Link, routes } from '@redwoodjs/router'

// highlight-next-line
import type { Post } from 'types/graphql'

// highlight-start
interface Props {
  article: Post
}
// highlight-end

// highlight-next-line
const Article = ({ article }: Props) => {
  return (
    // highlight-start
    <article>
      <header>
        <h2>
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div>{article.body}</div>
      <div>Posted at: {article.createdAt}</div>
    </article>
    // highlight-end
  )
}

export default Article
```

</TabItem>
</Tabs>

And update `ArticlesCell` to use this new component instead:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/ArticlesCell/ArticlesCell.jsx"
// highlight-next-line
import Article from 'src/components/Article'

export const QUERY = gql`
  query ArticlesQuery {
    articles: posts {
      id
      title
      body
      createdAt
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({ articles }) => {
  return (
    <>
      {articles.map((article) => (
        // highlight-next-line
        <Article key={article.id} article={article} />
      ))}
    </>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/ArticlesCell/ArticlesCell.tsx"
import type { ArticlesQuery, ArticlesQueryVariables } from 'types/graphql'

import type {
  CellFailureProps,
  CellSuccessProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

// highlight-next-line
import Article from 'src/components/Article'

export const QUERY: TypedDocumentNode<ArticlesQuery, ArticlesQueryVariables> =
  gql`
    query ArticlesQuery {
      articles: posts {
        id
        title
        body
        createdAt
      }
    }
  `

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({
  error,
}: CellFailureProps<ArticlesQueryVariables>) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({
  articles,
}: CellSuccessProps<ArticlesQuery, ArticlesQueryVariables>) => {
  return (
    <>
      {articles.map((article) => (
        // highlight-next-line
        <Article key={article.id} article={article} />
      ))}
    </>
  )
}
```

</TabItem>
</Tabs>

Last but not least we can update the `ArticleCell` to properly display our blog posts as well:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/ArticleCell/ArticleCell.jsx"
// highlight-next-line
import Article from 'src/components/Article'

export const QUERY = gql`
  query FindArticleQuery($id: Int!) {
    article: post(id: $id) {
      id
      title
      body
      createdAt
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({ article }) => {
  // highlight-next-line
  return <Article article={article} />
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/ArticleCell/ArticleCell.tsx"
import type { FindArticleQuery, FindArticleQueryVariables } from 'types/graphql'

import type {
  CellFailureProps,
  CellSuccessProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

// highlight-next-line
import Article from 'src/components/Article'

export const QUERY: TypedDocumentNode<
  FindArticleQuery,
  FindArticleQueryVariables
> = gql`
  query FindArticleQuery($id: Int!) {
    article: post(id: $id) {
      id
      title
      body
      createdAt
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({
  error,
}: CellFailureProps<FindArticleQueryVariables>) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({
  article,
}: CellSuccessProps<FindArticleQuery, FindArticleQueryVariables>) => {
  // highlight-next-line
  return <Article article={article} />
}
```

</TabItem>
</Tabs>

And there we go! We should be able to move back and forth between the homepage and the detail page. If you've only got one blog post then the homepage and single-article page will be identical! Head to the posts admin and create a couple more, won't you?

![Article page showing an article](https://user-images.githubusercontent.com/300/146101296-f1d43812-45df-4f1e-a3da-4f6a085bfc08.png)

:::info

If you like what you've been seeing from the router, you can dive deeper into the [Redwood Router](../../router.md) guide.

:::

### Summary

To recap:

1. We created a new page to show a single post (the "detail" page).
2. We added a route to handle the `id` of the post and turn it into a route param, even coercing it into an integer.
3. We created a cell to fetch and display the post.
4. Redwood made the world a better place by making that `id` available to us at several key junctions in our code and even turning it into a number automatically.
5. We turned the actual post display into a standard React component and used it in both the homepage and new detail page.
