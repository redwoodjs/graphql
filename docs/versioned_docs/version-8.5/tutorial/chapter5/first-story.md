# Our First Story

Let's say that on our homepage we only want to show the first couple of sentences in our blog post as a short summary, and then you'll have to click through to see the full post.

First let's update the `Article` component to contain that functionality:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
import { Link, routes } from '@redwoodjs/router'

// highlight-start
const truncate = (text, length) => {
  return text.substring(0, length) + '...'
}
// highlight-end

// highlight-next-line
const Article = ({ article, summary = false }) => {
  return (
    <article className="mt-10">
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div className="mt-2 text-gray-900 font-light">
        // highlight-next-line
        {summary ? truncate(article.body, 100) : article.body}
      </div>
    </article>
  )
}

export default Article
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.tsx"
import { Link, routes } from '@redwoodjs/router'

import type { Post } from 'types/graphql'

// highlight-start
const truncate = (text: string, length: number) => {
  return text.substring(0, length) + '...'
}
// highlight-end

interface Props {
  // highlight-start
  article: Omit<Post, 'createdAt'>
  summary?: boolean
  // highlight-end
}

// highlight-next-line
const Article = ({ article, summary = false }: Props) => {
  return (
    <article className="mt-10">
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div className="mt-2 text-gray-900 font-light">
        // highlight-next-line
        {summary ? truncate(article.body, 100) : article.body}
      </div>
    </article>
  )
}

export default Article
```

</TabItem>
</Tabs>

We'll pass an additional `summary` prop to the component to let it know if it should show just the summary or the whole thing. We default it to `false` to preserve the existing behavior—always showing the full body.

Now in the Storybook story let's create a `summary` story that uses the `Article` component the same way that `generated` does, but adds the new `summary` prop. We'll take the content of the sample post and put that in a constant that both stories will use. We'll also rename `generated` to `full` to make it clear what's different between the two:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/components/Article/Article.stories.jsx"
import Article from './Article'

// highlight-start
const ARTICLE = {
  id: 1,
  title: 'First Post',
  body: `Neutra tacos hot chicken prism raw denim, put a bird on it enamel pin post-ironic vape cred DIY. Street art next level umami squid. Hammock hexagon glossier 8-bit banjo. Neutra la croix mixtape echo park four loko semiotics kitsch forage chambray. Semiotics salvia selfies jianbing hella shaman. Letterpress helvetica vaporware cronut, shaman butcher YOLO poke fixie hoodie gentrify woke heirloom.`,
}
// highlight-end

// highlight-start
export const full = () => {
  return <Article article={ARTICLE} />
}
// highlight-end

// highlight-start
export const summary = () => {
  return <Article article={ARTICLE} summary={true} />
}
// highlight-end

export default { title: 'Components/Article' }
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/components/Article/Article.stories.tsx"
import Article from './Article'

// highlight-start
const ARTICLE = {
  id: 1,
  title: 'First Post',
  body: `Neutra tacos hot chicken prism raw denim, put a bird on it enamel pin post-ironic vape cred DIY. Street art next level umami squid. Hammock hexagon glossier 8-bit banjo. Neutra la croix mixtape echo park four loko semiotics kitsch forage chambray. Semiotics salvia selfies jianbing hella shaman. Letterpress helvetica vaporware cronut, shaman butcher YOLO poke fixie hoodie gentrify woke heirloom.`,
}
// highlight-end

// highlight-start
export const full = () => {
  return <Article article={ARTICLE} />
}
// highlight-end

// highlight-start
export const summary = () => {
  return <Article article={ARTICLE} summary={true} />
}
// highlight-end

export default { title: 'Components/Article' }
```

</TabItem>
</Tabs>

As soon as you save the change the stories Storybook should refresh and may show an error: there's no longer a "Generated" story to show! In the tree on the left, expand "Article" and the "Full" version should show right away. Click on "Summary" to see the difference:

![image](https://user-images.githubusercontent.com/300/153311838-595b8b38-d899-4d7b-891b-a492f0c8f2e2.png)

### Displaying the Summary

Great! Now to complete the picture let's use the summary in our home page display of blog posts. The actual Home page isn't what references the `Article` component though, that's in the `ArticlesCell`. We'll add the `summary` prop and then check the result in Storybook:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/ArticlesCell/ArticlesCell.jsx"
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

export const Failure = ({ error }) => <div>Error: {error.message}</div>

export const Success = ({ articles }) => {
  return (
    <div className="space-y-10">
      {articles.map((article) => (
        // highlight-next-line
        <Article article={article} key={article.id} summary={true} />
      ))}
    </div>
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
  TypeDocumentNode,
} from '@redwoodjs/web'

import Article from 'src/components/Article'

export const QUERY: TypeDocumentNode<ArticlesQuery, ArticlesQueryVariables> =
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
  <div>Error: {error.message}</div>
)

export const Success = ({
  articles,
}: CellSuccessProps<ArticlesQuery, ArticlesQueryVariables>) => {
  return (
    <div className="space-y-10">
      {articles.map((article) => (
        // highlight-next-line
        <Article article={article} key={article.id} summary={true} />
      ))}
    </div>
  )
}
```

</TabItem>
</Tabs>

Check out the story to see the new summary view:

![image](https://user-images.githubusercontent.com/300/153312022-1cfbf696-b2cb-4fca-b640-4111643fb396.png)

And if you head to the real site you'll see the summary there as well:

![image](https://user-images.githubusercontent.com/300/101545160-b2d45880-395b-11eb-9a32-f8cb8106de7f.png)

We can double check that our original usage of `Article` (the one without the `summary` prop) in `ArticleCell` still renders the entire post, not just the truncated version:

![image](https://user-images.githubusercontent.com/300/153312180-2a80df75-ea95-4e7b-9eb5-45fa900333e9.png)

Storybook makes it easy to create and modify your components in isolation and actually helps enforce a general best practice when building React applications: components should be self-contained and reusable by just changing the props that are sent in.
