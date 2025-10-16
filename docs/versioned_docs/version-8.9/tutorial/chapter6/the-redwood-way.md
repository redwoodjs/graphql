# Building a Component the Redwood Way

What's our blog missing? Comments. Let's add a simple comment engine so people can leave
their completely rational, well-reasoned comments on our blog posts. It's the internet,
what could go wrong?

There are two main features we need to build:

1. Comment form and creation
2. Comment retrieval and display

Which order we build them in is up to us. To ease into things, let's start with the fetching and displaying comments first and then we'll move on to more complex work of adding a form and service to create a new comment. Of course, this is Redwood, so even forms and services aren't _that_ complex!

### Storybook

Let's create a component for the display of a single comment. First up, the generator:

```bash
yarn rw g component Comment
```

Storybook should refresh and our "Generated" Comment story will be ready to go:

![image](https://user-images.githubusercontent.com/300/153475744-2e3151f9-b39c-4823-b2ef-539513cd4005.png)

Let's think about what we want to ask users for and then display in a comment. How about just their name and the content of the comment itself? And we'll throw in the date/time it was created. Let's update the **Comment** component to accept a `comment` object with those three properties:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.jsx"
// highlight-next-line
const Comment = ({ comment }) => {
  return (
    <div>
      // highlight-start
      <h2>{comment.name}</h2>
      <time dateTime={comment.createdAt}>{comment.createdAt}</time>
      <p>{comment.body}</p>
      // highlight-end
    </div>
  )
}

export default Comment
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.tsx"
// highlight-start
// Just a temporary type. We'll replace this later
interface Props {
  comment: {
    name: string
    createdAt: string
    body: string
  }
}
// highlight-end

// highlight-next-line
const Comment = ({ comment }: Props) => {
  return (
    <div>
      // highlight-start
      <h2>{comment.name}</h2>
      <time dateTime={comment.createdAt}>{comment.createdAt}</time>
      <p>{comment.body}</p>
      // highlight-end
    </div>
  )
}

export default Comment
```

</TabItem>
</Tabs>

Once you save that file and Storybook reloads you'll see it blow up:

![image](https://user-images.githubusercontent.com/300/153475904-8f53cb09-3798-4e5a-9b6a-1ff1df98f93f.png)

We need to update the story to include that comment object and pass it as a prop:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.stories.jsx"
import Comment from './Comment'

export const generated = () => {
  // highlight-start
  return (
    <Comment
      comment={{
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z'
      }}
    />
  )
  // highlight-end
}

export default {
  title: 'Components/Comment',
  component: Comment,
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.stories.tsx"
import Comment from './Comment'

export const generated = () => {
  // highlight-start
  return (
    <Comment
      comment={{
        name: 'Rob Cameron',
        body: 'This is the first comment!',
        createdAt: '2020-01-01T12:34:56Z',
      }}
    />
  )
  // highlight-end
}

export default {
  title: 'Components/Comment',
  component: Comment,
}
```

</TabItem>
</Tabs>

:::info

Datetimes will come from GraphQL in [ISO8601 format](https://en.wikipedia.org/wiki/ISO_8601#Times) so we need to return one in that format here.

:::

Storybook will reload and be much happier:

![image](https://user-images.githubusercontent.com/300/153476049-8ac31858-3014-47b5-807c-02b32d5a3ab0.png)

Let's add a little bit of styling and date conversion to get this **Comment** component looking like a nice, completed design element:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment/Comment.jsx"
// highlight-start
const formattedDate = (datetime) => {
  const parsedDate = new Date(datetime)
  const month = parsedDate.toLocaleString('default', { month: 'long' })
  return `${parsedDate.getDate()} ${month} ${parsedDate.getFullYear()}`
}
// highlight-end

const Comment = ({ comment }) => {
  return (
    // highlight-start
    <div className="bg-gray-200 p-8 rounded-lg">
      <header className="flex justify-between">
        <h2 className="font-semibold text-gray-700">{comment.name}</h2>
        <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
          {formattedDate(comment.createdAt)}
        </time>
      </header>
      <p className="text-sm mt-2">{comment.body}</p>
    </div>
    // highlight-end
  )
}

export default Comment
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment/Comment.tsx"
// highlight-start
const formattedDate = (datetime: ConstructorParameters<typeof Date>[0]) => {
  const parsedDate = new Date(datetime)
  const month = parsedDate.toLocaleString('default', { month: 'long' })
  return `${parsedDate.getDate()} ${month} ${parsedDate.getFullYear()}`
}
// highlight-end

// Just a temporary type. We'll replace this later
interface Props {
  comment: {
    name: string
    createdAt: string
    body: string
  }
}

const Comment = ({ comment }: Props) => {
  return (
    // highlight-start
    <div className="bg-gray-200 p-8 rounded-lg">
      <header className="flex justify-between">
        <h2 className="font-semibold text-gray-700">{comment.name}</h2>
        <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
          {formattedDate(comment.createdAt)}
        </time>
      </header>
      <p className="text-sm mt-2">{comment.body}</p>
    </div>
    // highlight-end
  )
}

export default Comment
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/153476305-017c6cf8-a2dd-4da0-a6ef-487d91a562df.png)

Our component looks great! Now let's verify that it does what we want it to do with a test.

### Testing

We don't want Santa to skip our house so let's test our **Comment** component. We could test that the author's name and the body of the comment appear, as well as the date it was posted.

The default test that comes with a generated component just makes sure that no errors are thrown, which is the least we could ask of our components!

Let's add a sample comment to the test and check that the various parts are being rendered:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Comment.test.jsx"
// highlight-next-line
import { render, screen } from '@redwoodjs/testing'

import Comment from './Comment'

describe('Comment', () => {
  it('renders successfully', () => {
    // highlight-start
    const comment = {
      name: 'John Doe',
      body: 'This is my comment',
      createdAt: '2020-01-02T12:34:56Z',
    }
    render(<Comment comment={comment} />)

    expect(screen.getByText(comment.name)).toBeInTheDocument()
    expect(screen.getByText(comment.body)).toBeInTheDocument()
    const dateExpect = screen.getByText('2 January 2020')
    expect(dateExpect).toBeInTheDocument()
    expect(dateExpect.nodeName).toEqual('TIME')
    expect(dateExpect).toHaveAttribute('datetime', comment.createdAt)
    // highlight-end
  })
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Comment.test.tsx"
// highlight-next-line
import { render, screen } from '@redwoodjs/testing'

import Comment from './Comment'

describe('Comment', () => {
  it('renders successfully', () => {
    // highlight-start
    const comment = {
      name: 'John Doe',
      body: 'This is my comment',
      createdAt: '2020-01-02T12:34:56Z',
    }
    render(<Comment comment={comment} />)

    expect(screen.getByText(comment.name)).toBeInTheDocument()
    expect(screen.getByText(comment.body)).toBeInTheDocument()
    const dateExpect = screen.getByText('2 January 2020')
    expect(dateExpect).toBeInTheDocument()
    expect(dateExpect.nodeName).toEqual('TIME')
    expect(dateExpect).toHaveAttribute('datetime', comment.createdAt)
    // highlight-end
  })
})
```

</TabItem>
</Tabs>

Here we're testing for both elements of the output `createdAt` timestamp: the actual text that's output (similar to how we tested for an article's truncated body) but also that the element that wraps that text is a `<time>` tag and that it contains a `datetime` attribute with the raw value of `comment.createdAt`. This might seem like overkill but the point of the `datetime` attribute is to provide a machine-readable timestamp that the browser could (theoretically) hook into and do stuff with. This makes sure that we preserve that ability.

If your tests aren't already running in another terminal window, you can start them now:

```bash
yarn rw test
```

:::info What happens if we change the formatted output of the timestamp? Wouldn't we have to change the test?

Yes, just like we'd have to change the truncation text if we changed the length of the truncation. One alternative approach to testing for the formatted output could be to move the date formatting formula into a function that you can export from the `Comment` component. Then you can import that in your test and use it to check the formatted output. Now if you change the formula the test keeps passing because it's sharing the function with `Comment`.

:::
