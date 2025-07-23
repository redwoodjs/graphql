# Multiple Comments

Our amazing blog posts will obviously garner a huge and passionate fanbase and we will very rarely have only a single comment. Let's work on displaying a list of comments.

Let's think about where our comments are being displayed. Probably not on the homepage, since that only shows a summary of each post. A user would need to go to the full page to show the comments for that blog post. But that page is only fetching the data for the single blog post itself, nothing else. We'll need to get the comments and since we'll be fetching _and_ displaying them, that sounds like a job for a Cell.

:::info Couldn't the query for the blog post page also fetch the comments?

Yes, it could! But the idea behind Cells is to make components even more [composable](https://en.wikipedia.org/wiki/Composability) by having them be responsible for their own data fetching _and_ display. If we rely on a blog post to fetch the comments then the new Comments component we're about to create now requires something _else_ to fetch the comments and pass them in. If we re-use the Comments component somewhere, now we're fetching comments in two different places.

**But what about the Comment component we just made, why doesn't that fetch its own data?**

There aren't any instances I (the author) could think of where we would ever want to display only a single comment in isolation—it would always be a list of all comments on a post. If displaying a single comment was common for your use case then it could definitely be converted to a **CommentCell** and have it responsible for pulling the data for that single comment itself. But keep in mind that if you have 50 comments on a blog post, that's now 50 GraphQL calls that need to go out, one for each comment. There's always a trade-off!

**Then why make a standalone Comment component at all? Why not just do all the display in the CommentsCell?**

We're trying to start in small chunks to make the tutorial more digestible for a new audience so we're starting simple and getting more complex as we go. But it also just feels _nice_ to build up a UI from these smaller chunks that are easier to reason about and keep separate in your head.

**But what about—**

Look, we gotta end this sidebar and get back to building this thing. You can ask more questions later, promise!

:::

### Storybook

Let's generate a **CommentsCell**:

```bash
yarn rw g cell Comments
```

Storybook updates with a new **CommentsCell** under the **Cells** folder, and it's actually showing something:

![image](https://user-images.githubusercontent.com/300/153477642-0d5a15a5-f96f-485a-b8b0-dbc1c4515279.png)

Where did that come from? Check out `CommentsCell.mock.{js,ts}`: there's no Prisma model for a Comment yet, so Redwood took a guess that your model would at least contain an `id` field and just used that for the mock data.

Let's update the `Success` component to use the `Comment` component created earlier, and add all of the fields we'll need for the **Comment** to render to the `QUERY`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.jsx"
// highlight-next-line
import Comment from 'src/components/Comment'

export const QUERY = gql`
  query CommentsQuery {
    comments {
      id
      // highlight-start
      name
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

export const Success = ({ comments }) => {
  return (
  // highlight-start
    <>
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </>
  // highlight-end
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.tsx"
import type { CommentsQuery, CommentsQueryVariables } from 'types/graphql'

import type {
  CellFailureProps,
  CellSuccessProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

// highlight-next-line
import Comment from 'src/components/Comment'

export const QUERY: TypedDocumentNode<CommentsQuery, CommentsQueryVariables> =
  gql`
    query CommentsQuery {
      comments {
        id
        // highlight-start
        name
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
}: CellFailureProps<CommentsQueryVariables>) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const Success = ({
  comments,
}: CellSuccessProps<CommentsQuery, CommentsQueryVariables>) => {
  return (
    // highlight-start
    <>
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
    </>
    // highlight-end
  )
}
```

</TabItem>
</Tabs>

We're passing an additional `key` prop to make React happy when iterating over an array with `map`.

If you check Storybook, you'll see that we do indeed render the `Comment` component three times, but there's no data to display. Let's update the mock with some sample data:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="web/src/components/CommentsCell/CommentsCell.mock.js"
export const standard = () => ({
  // highlight-start
  comments: [
    {
      id: 1,
      name: 'Rob Cameron',
      body: 'First comment',
      createdAt: '2020-01-02T12:34:56Z',
    },
    {
      id: 2,
      name: 'David Price',
      body: 'Second comment',
      createdAt: '2020-02-03T23:00:00Z',
    },
  ],
  // highlight-end
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="web/src/components/CommentsCell/CommentsCell.mock.ts"
export const standard = () => ({
  // highlight-start
  comments: [
    {
      id: 1,
      name: 'Rob Cameron',
      body: 'First comment',
      createdAt: '2020-01-02T12:34:56Z',
    },
    {
      id: 2,
      name: 'David Price',
      body: 'Second comment',
      createdAt: '2020-02-03T23:00:00Z',
    },
  ],
  // highlight-end
})
```

</TabItem>
</Tabs>

:::info What's this `standard` thing?

Think of it as the standard, default mock if you don't do anything else. We would have loved to use the name "default" but that's already a reserved word in JavaScript!

:::

Storybook refreshes and we've got comments! It's a little hard to distinguish between the two separate comments because they're right next to each other:

![image](https://user-images.githubusercontent.com/300/153478670-14c32c29-6d1d-491b-bc2b-b033557a6d84.png)

Since `CommentsCell` is the one responsible for drawing multiple comments, it makes sense that it should be "in charge" of how they're displayed, including the gap between them. Let's add a style to do that in `CommentsCell`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.jsx"
export const Success = ({ comments }) => {
  return (
    // highlight-next-line
    <div className="space-y-8">
      {comments.map((comment) => (
        <Comment comment={comment} key={comment.id} />
      ))}
    // highlight-next-line
    </div>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.tsx"
export const Success = ({
  comments,
}: CellSuccessProps<CommentsQuery, CommentsQueryVariables>) => {
  return (
    // highlight-next-line
    <div className="space-y-8">
      {comments.map((comment) => (
        <Comment comment={comment} key={comment.id} />
      ))}
      // highlight-next-line
    </div>
  )
}
```

</TabItem>
</Tabs>

:::tip

`space-y-8` is a handy Tailwind class that puts a space _between_ elements, but not above or below the entire stack (which is what would happen if you gave each `<Comment>` its own top/bottom margin).

:::

Looking good! Let's add our CommentsCell to the actual blog post display page:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
import { Link, routes } from '@redwoodjs/router'
// highlight-next-line
import CommentsCell from 'src/components/CommentsCell'

const truncate = (text, length) => {
  return text.substring(0, length) + '...'
}

const Article = ({ article, summary = false }) => {
  return (
    <article>
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div className="mt-2 text-gray-900 font-light">
        {summary ? truncate(article.body, 100) : article.body}
      </div>
      // highlight-next-line
      {!summary && <CommentsCell />}
    </article>
  )
}

export default Article
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.tsx"
import { Link, routes } from '@redwoodjs/router'
// highlight-next-line
import CommentsCell from 'src/components/CommentsCell'

import type { Post } from 'types/graphql'

const truncate = (text: string, length: number) => {
  return text.substring(0, length) + '...'
}

interface Props {
  article: Omit<Post, 'createdAt'>
  summary?: boolean
}

const Article = ({ article, summary = false }: Props) => {
  return (
    <article>
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div className="mt-2 text-gray-900 font-light">
        {summary ? truncate(article.body, 100) : article.body}
      </div>
      // highlight-next-line
      {!summary && <CommentsCell />}
    </article>
  )
}

export default Article
```

</TabItem>
</Tabs>

If we are _not_ showing the summary, then we'll show the comments. Take a look at the **Full** and **Summary** stories in Storybook and you should see comments on one and not on the other.

:::info Shouldn't the `CommentsCell` cause an actual GraphQL request? How does this work?

Redwood has added some functionality around Storybook so that if you're testing a component that itself isn't a Cell (like the `Article` component) but that renders a cell (like `CommentsCell`), then it will mock the GraphQL and use the `standard` mock that goes along with that Cell. Pretty cool, huh?

:::

Adding the comments to the article display has exposed another design issue: the comments are sitting right up underneath the article text:

![image](https://user-images.githubusercontent.com/300/153480229-ea483d75-62bf-4b56-b248-10ca1597a7a8.png)

Let's add a gap between the two:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
const Article = ({ article, summary = false }) => {
  return (
    <article>
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div className="mt-2 text-gray-900 font-light">
        {summary ? truncate(article.body, 100) : article.body}
      </div>
      // highlight-start
      {!summary && (
        <div className="mt-12">
          <CommentsCell />
        </div>
      )}
      // highlight-end
    </article>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.tsx"
const Article = ({ article, summary = false }: Props) => {
  return (
    <article>
      <header>
        <h2 className="text-xl text-blue-700 font-semibold">
          <Link to={routes.article({ id: article.id })}>{article.title}</Link>
        </h2>
      </header>
      <div className="mt-2 text-gray-900 font-light">
        {summary ? truncate(article.body, 100) : article.body}
      </div>
      // highlight-start
      {!summary && (
        <div className="mt-12">
          <CommentsCell />
        </div>
      )}
      // highlight-end
    </article>
  )
}
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/153480489-a59f27e3-6d70-4548-9a1e-4036b6860444.png)

Okay, comment display is looking good! However, you may have noticed that if you tried going to the actual site there's an error where the comments should be:

![image](https://user-images.githubusercontent.com/300/153480635-58ada8e8-ed5b-41b6-875b-501a07a36d9a.png)

Why is that? Remember that we started with the `CommentsCell`, but never actually created a Comment model in `schema.prisma` or created an SDL and service! We'll be rectifying this soon. But this demonstrates another huge benefit of working with Storybook: you can build out UI functionality completely isolated from the api-side. In a team setting this is great because a web-side team can work on the UI while the api-side team can be building the backend end simultaneously and one doesn't have to wait for the other.

### Testing

We added a component, `CommentsCell`, and edited another, `Article`, so what do we test, and where?

#### Testing Comments

The actual `Comment` component does most of the work so there's no need to test all of that functionality again in `CommentsCell`: our `Comment` tests cover that just fine. What things does `CommentsCell` do that make it unique?

- Has a loading message
- Has an error message
- Has a failure message
- When it renders successfully, it outputs as many comments as were returned by the `QUERY` (_what_ is rendered we'll leave to the `Comment` tests)

The default `CommentsCell.test.{jsx,tsx}` actually tests every state for us, albeit at an absolute minimum level—it makes sure no errors are thrown:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.test.jsx"
import { render } from '@redwoodjs/testing/web'

import { Loading, Empty, Failure, Success } from './CommentsCell'
import { standard } from './CommentsCell.mock'

describe('CommentsCell', () => {
  it('renders Loading successfully', () => {
    expect(() => {
      render(<Loading />)
    }).not.toThrow()
  })

  it('renders Empty successfully', async () => {
    expect(() => {
      render(<Empty />)
    }).not.toThrow()
  })

  it('renders Failure successfully', async () => {
    expect(() => {
      render(<Failure error={new Error('Oh no')} />)
    }).not.toThrow()
  })

  it('renders Success successfully', async () => {
    expect(() => {
      render(<Success comments={standard().comments} />)
    }).not.toThrow()
  })
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.test.tsx"
import { render } from '@redwoodjs/testing/web'

import { Loading, Empty, Failure, Success } from './CommentsCell'
import { standard } from './CommentsCell.mock'

describe('CommentsCell', () => {
  it('renders Loading successfully', () => {
    expect(() => {
      render(<Loading />)
    }).not.toThrow()
  })

  it('renders Empty successfully', async () => {
    expect(() => {
      render(<Empty />)
    }).not.toThrow()
  })

  it('renders Failure successfully', async () => {
    expect(() => {
      render(<Failure error={new Error('Oh no')} />)
    }).not.toThrow()
  })

  it('renders Success successfully', async () => {
    expect(() => {
      render(<Success comments={standard().comments} />)
    }).not.toThrow()
  })
})
```

</TabItem>
</Tabs>

And that's nothing to scoff at! As you've probably experienced, a React component usually either works 100% or blows up spectacularly. If it works, great! If it fails then the test fails too, which is exactly what we want to happen.

But in this case we can do a little more to make sure `CommentsCell` is doing what we expect. Let's update the `Success` test in `CommentsCell.test.{js,ts}` to check that exactly the number of comments we passed in as a prop are rendered. How do we know a comment was rendered? How about if we check that each `comment.body` (the most important part of the comment) is present on the screen:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentsCell/CommentsCell.test.jsx"
// highlight-next-line
import { render, screen } from '@redwoodjs/testing/web'

import { Loading, Empty, Failure, Success } from './CommentsCell'
import { standard } from './CommentsCell.mock'

describe('CommentsCell', () => {
  it('renders Loading successfully', () => {
    expect(() => {
      render(<Loading />)
    }).not.toThrow()
  })

  it('renders Empty successfully', async () => {
    expect(() => {
      render(<Empty />)
    }).not.toThrow()
  })

  it('renders Failure successfully', async () => {
    expect(() => {
      render(<Failure error={new Error('Oh no')} />)
    }).not.toThrow()
  })

  it('renders Success successfully', async () => {
    // highlight-start
    const comments = standard().comments
    render(<Success comments={comments} />)

    comments.forEach((comment) => {
      expect(screen.getByText(comment.body)).toBeInTheDocument()
    })
    // highlight-end
  })
})

```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentsCell/CommentsCell.test.tsx"
// highlight-next-line
import { render, screen } from '@redwoodjs/testing/web'

import { Loading, Empty, Failure, Success } from './CommentsCell'
import { standard } from './CommentsCell.mock'

describe('CommentsCell', () => {
  it('renders Loading successfully', () => {
    expect(() => {
      render(<Loading />)
    }).not.toThrow()
  })

  it('renders Empty successfully', async () => {
    expect(() => {
      render(<Empty />)
    }).not.toThrow()
  })

  it('renders Failure successfully', async () => {
    expect(() => {
      render(<Failure error={new Error('Oh no')} />)
    }).not.toThrow()
  })

  it('renders Success successfully', async () => {
    // highlight-start
    const comments = standard().comments
    render(<Success comments={comments} />)

    comments.forEach((comment) => {
      expect(screen.getByText(comment.body)).toBeInTheDocument()
    })
    // highlight-end
  })
})
```

</TabItem>
</Tabs>

We're looping through each `comment` from the mock, the same mock used by Storybook, so that even if we add more later, we're covered. You may find yourself writing a test and saying "just test that there are two total comments," which will work today, but months from now when you add more comments to the mock to try some different iterations in Storybook, that test will start failing. Avoid hardcoding data like this, especially [magic numbers](<https://en.wikipedia.org/wiki/Magic_number_(programming)>), into your test when you can derive it from your mocked data!

#### Testing Article

The functionality we added to `Article` says to show the comments for the post if we are _not_ showing the summary. We've got a test for both the "full" and "summary" renders already. Generally you want a test to be testing "one thing," like whether the body of the article is present, and another test for whether the comments are displaying. If you find that you're using "and" in your test description (like "renders a blog post and its comments") that's a good sign that it should probably be split into two separate tests.

Let's add two additional tests for our new functionality:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.test.jsx"
// highlight-start
import { render, screen, waitFor } from '@redwoodjs/testing'

import { standard } from 'src/components/CommentsCell/CommentsCell.mock'
// highlight-end

import Article from './Article'

const ARTICLE = {
  id: 1,
  title: 'First post',
  body: `Neutra tacos hot chicken prism raw denim, put a bird on it enamel pin post-ironic vape cred DIY. Street art next level umami squid. Hammock hexagon glossier 8-bit banjo. Neutra la croix mixtape echo park four loko semiotics kitsch forage chambray. Semiotics salvia selfies jianbing hella shaman. Letterpress helvetica vaporware cronut, shaman butcher YOLO poke fixie hoodie gentrify woke heirloom.`,
  createdAt: new Date().toISOString(),
}

describe('Article', () => {
  it('renders a blog post', () => {
    render(<Article article={ARTICLE} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
    expect(screen.getByText(ARTICLE.body)).toBeInTheDocument()
  })

  // highlight-start
  it('renders comments when displaying a full blog post', async () => {
    const comment = standard().comments[0]
    render(<Article article={ARTICLE} />)

    await waitFor(() =>
      expect(screen.getByText(comment.body)).toBeInTheDocument()
    )
  })
  // highlight-end

  it('renders a summary of a blog post', () => {
    render(<Article article={ARTICLE} summary={true} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
    expect(
      screen.getByText(
        'Neutra tacos hot chicken prism raw denim, put a bird on it enamel pin post-ironic vape cred DIY. Str...'
      )
    ).toBeInTheDocument()
  })

  // highlight-start
  it('does not render comments when displaying a summary', async () => {
    const comment = standard().comments[0]
    render(<Article article={ARTICLE} summary={true} />)

    await waitFor(() =>
      expect(screen.queryByText(comment.body)).not.toBeInTheDocument()
    )
  })
  // highlight-end
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.test.tsx"
// highlight-start
import { render, screen, waitFor } from '@redwoodjs/testing'

import { standard } from 'src/components/CommentsCell/CommentsCell.mock'
// highlight-end

import Article from './Article'

const ARTICLE = {
  id: 1,
  title: 'First post',
  body: `Neutra tacos hot chicken prism raw denim, put a bird on it enamel pin post-ironic vape cred DIY. Street art next level umami squid. Hammock hexagon glossier 8-bit banjo. Neutra la croix mixtape echo park four loko semiotics kitsch forage chambray. Semiotics salvia selfies jianbing hella shaman. Letterpress helvetica vaporware cronut, shaman butcher YOLO poke fixie hoodie gentrify woke heirloom.`,
  createdAt: new Date().toISOString(),
}

describe('Article', () => {
  it('renders a blog post', () => {
    render(<Article article={ARTICLE} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
    expect(screen.getByText(ARTICLE.body)).toBeInTheDocument()
  })

  // highlight-start
  it('renders comments when displaying a full blog post', async () => {
    const comment = standard().comments[0]
    render(<Article article={ARTICLE} />)

    await waitFor(() =>
      expect(screen.getByText(comment.body)).toBeInTheDocument()
    )
  })
  // highlight-end

  it('renders a summary of a blog post', () => {
    render(<Article article={ARTICLE} summary={true} />)

    expect(screen.getByText(ARTICLE.title)).toBeInTheDocument()
    expect(
      screen.getByText(
        'Neutra tacos hot chicken prism raw denim, put a bird on it enamel pin post-ironic vape cred DIY. Str...'
      )
    ).toBeInTheDocument()
  })

  // highlight-start
  it('does not render comments when displaying a summary', async () => {
    const comment = standard().comments[0]
    render(<Article article={ARTICLE} summary={true} />)

    await waitFor(() =>
      expect(screen.queryByText(comment.body)).not.toBeInTheDocument()
    )
  })
  // highlight-end
})
```

</TabItem>
</Tabs>

Notice we're importing the mock from a completely different component—nothing wrong with that!

We're introducing a new test function here, `waitFor()`, which will wait for things like GraphQL queries to finish running before checking for what's been rendered. Since `Article` renders `CommentsCell` we need to wait for the `Success` component of `CommentsCell` to be rendered.

:::info

The summary version of `Article` does _not_ render the `CommentsCell`, but we should still wait. Why? If we did mistakenly start including `CommentsCell`, but didn't wait for the render, we would get a falsely passing test—indeed the text isn't on the page but that's because it's still showing the `Loading` component! If we had waited we would have seen the actual comment body get rendered, and the test would (correctly) fail.

:::

Okay we're finally ready to let users create their comments.
