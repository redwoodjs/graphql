# Creating a Comment Form

Let's generate a component to house our new comment form, build it out and integrate it via Storybook, then add some tests:

```bash
yarn rw g component CommentForm
```

And startup Storybook again if it isn't still running:

```bash
yarn rw storybook
```

You'll see that there's a **CommentForm** entry in Storybook now, ready for us to get started.

![image](https://user-images.githubusercontent.com/300/153927943-648c62d2-b0c3-40f2-9bad-3aa81170d7c2.png)

### Storybook

Let's build a simple form to take the user's name and their comment and add some styling to match it to the blog:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.jsx"
import {
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const CommentForm = () => {
  return (
    <div>
      <h3 className="font-light text-lg text-gray-600">Leave a Comment</h3>
      <Form className="mt-4 w-full">
        <Label name="name" className="block text-sm text-gray-600 uppercase">
          Name
        </Label>
        <TextField
          name="name"
          className="block w-full p-1 border rounded text-xs "
          validation={{ required: true }}
        />

        <Label
          name="body"
          className="block mt-4 text-sm text-gray-600 uppercase"
        >
          Comment
        </Label>
        <TextAreaField
          name="body"
          className="block w-full p-1 border rounded h-24 text-xs"
          validation={{ required: true }}
        />

        <Submit
          className="block mt-4 bg-blue-500 text-white text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 disabled:opacity-50"
        >
          Submit
        </Submit>
      </Form>
    </div>
  )
}

export default CommentForm
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentForm/CommentForm.tsx"
import { Form, Label, TextField, TextAreaField, Submit } from '@redwoodjs/forms'

const CommentForm = () => {
  return (
    <div>
      <h3 className="font-light text-lg text-gray-600">Leave a Comment</h3>
      <Form className="mt-4 w-full">
        <Label name="name" className="block text-sm text-gray-600 uppercase">
          Name
        </Label>
        <TextField
          name="name"
          className="block w-full p-1 border rounded text-xs"
          validation={{ required: true }}
        />

        <Label
          name="body"
          className="block mt-4 text-sm text-gray-600 uppercase"
        >
          Comment
        </Label>
        <TextAreaField
          name="body"
          className="block w-full p-1 border rounded h-24 text-xs"
          validation={{ required: true }}
        />

        <Submit className="block mt-4 bg-blue-500 text-white text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 disabled:opacity-50">
          Submit
        </Submit>
      </Form>
    </div>
  )
}

export default CommentForm
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/153928306-5e0979c6-2049-4039-87a2-284a4010283a.png)

Note that the form and its inputs are set to 100% width. Again, the form shouldn't be dictating anything about its layout that its parent should be responsible for, like how wide the inputs are. Those should be determined by whatever contains it so that it looks good with the rest of the content on the page. So the form will be 100% wide and the parent (whoever that ends up being) will decide how wide it really is on the page.

You can even try submitting the form right in Storybook! If you leave "name" or "comment" blank then they should get focus when you try to submit, indicating that they are required. If you fill them both in and click **Submit** nothing happens because we haven't hooked up the submit yet. Let's do that now.

### Submitting

Submitting the form should use the `createComment` function we added to our services and GraphQL. We'll need to add a mutation to the form component and an `onSubmit` handler to the form so that the create can be called with the data in the form. And since `createComment` could return an error we'll add the **FormError** component to display it:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.jsx"
import {
  Form,
  // highlight-next-line
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'
// highlight-next-line
import { useMutation } from '@redwoodjs/web'

// highlight-start
const CREATE = gql`
  mutation CreateCommentMutation($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      name
      body
      createdAt
    }
  }
`
// highlight-end

const CommentForm = () => {
  // highlight-next-line
  const [createComment, { loading, error }] = useMutation(CREATE)

  // highlight-start
  const onSubmit = (input) => {
    createComment({ variables: { input } })
  }
  // highlight-end

  return (
    <div>
      <h3 className="font-light text-lg text-gray-600">Leave a Comment</h3>
      // highlight-start
      <Form className="mt-4 w-full" onSubmit={onSubmit}>
        <FormError
          error={error}
          titleClassName="font-semibold"
          wrapperClassName="bg-red-100 text-red-900 text-sm p-3 rounded"
        />
        // highlight-end
        <Label
          name="name"
          className="block text-xs font-semibold text-gray-500 uppercase"
        >
          Name
        </Label>
        <TextField
          name="name"
          className="block w-full p-1 border rounded text-sm "
          validation={{ required: true }}
        />

        <Label
          name="body"
          className="block mt-4 text-xs font-semibold text-gray-500 uppercase"
        >
          Comment
        </Label>
        <TextAreaField
          name="body"
          className="block w-full p-1 border rounded h-24 text-sm"
          validation={{ required: true }}
        />

        <Submit
          // highlight-next-line
          disabled={loading}
          className="block mt-4 bg-blue-500 text-white text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 disabled:opacity-50"
        >
          Submit
        </Submit>
      </Form>
    </div>
  )
}

export default CommentForm
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentForm/CommentForm.tsx"
// highlight-start
import type {
  CreateCommentMutation,
  CreateCommentMutationVariables,
} from 'types/graphql'
// highlight-end

import {
  Form,
  // highlight-next-line
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
  // highlight-next-line
  SubmitHandler,
} from '@redwoodjs/forms'
// highlight-start
import type { TypedDocumentNode } from '@redwoodjs/web'
import { useMutation } from '@redwoodjs/web'
// highlight-end

// highlight-start
const CREATE: TypedDocumentNode<
  CreateCommentMutation,
  CreateCommentMutationVariables
> = gql`
  mutation CreateCommentMutation($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      name
      body
      createdAt
    }
  }
`
// highlight-end

// highlight-start
interface FormValues {
  name: string
  comment: string
}
// highlight-end

const CommentForm = () => {
  // highlight-next-line
  const [createComment, { loading, error }] = useMutation(CREATE)

  // highlight-start
  const onSubmit: SubmitHandler<FormValues> = (input) => {
    createComment({ variables: { input } })
  }
  // highlight-end

  return (
    <div>
      <h3 className="font-light text-lg text-gray-600">Leave a Comment</h3>
      // highlight-start
      <Form className="mt-4 w-full" onSubmit={onSubmit}>
        <FormError
          error={error}
          titleClassName="font-semibold"
          wrapperClassName="bg-red-100 text-red-900 text-sm p-3 rounded"
        />
        // highlight-end

        <Label
          name="name"
          className="block text-xs font-semibold text-gray-500 uppercase"
        >
          Name
        </Label>
        <TextField
          name="name"
          className="block w-full p-1 border rounded text-sm "
          validation={{ required: true }}
        />

        <Label
          name="body"
          className="block mt-4 text-xs font-semibold text-gray-500 uppercase"
        >
          Comment
        </Label>
        <TextAreaField
          name="body"
          className="block w-full p-1 border rounded h-24 text-sm"
          validation={{ required: true }}
        />

        <Submit
          // highlight-next-line
          disabled={loading}
          className="block mt-4 bg-blue-500 text-white text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 disabled:opacity-50"
        >
          Submit
        </Submit>
      </Form>
    </div>
  )
}

export default CommentForm
```

</TabItem>
</Tabs>

If you try to submit the form you'll get an error in the web console—Storybook will automatically mock GraphQL queries, but not mutations. But, we can mock the request in the story and handle the response manually:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.stories.jsx"
import CommentForm from './CommentForm'

export const generated = () => {
  // highlight-start
  mockGraphQLMutation('CreateCommentMutation', (variables, { ctx }) => {
    const id = Math.floor(Math.random() * 1000)
    ctx.delay(1000)

    return {
      createComment: {
        id,
        name: variables.input.name,
        body: variables.input.body,
        createdAt: new Date().toISOString(),
      },
    }
  })
  // highlight-end

  return <CommentForm />
}

export default { title: 'Components/CommentForm' }
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentForm/CommentForm.stories.tsx"
import CommentForm from './CommentForm'

// highlight-start
import type {
  CreateCommentMutation,
  CreateCommentMutationVariables,
} from 'types/graphql'
// highlight-end

export const generated = () => {
  // highlight-start
  mockGraphQLMutation<CreateCommentMutation, CreateCommentMutationVariables>(
    'CreateCommentMutation',
    (variables, { ctx }) => {
      const id = Math.floor(Math.random() * 1000)
      ctx.delay(1000)

      return {
        createComment: {
          id,
          name: variables.input.name,
          body: variables.input.body,
          createdAt: new Date().toISOString(),
        },
      }
    }
  )
  // highlight-end

  return <CommentForm />
}

export default { title: 'Components/CommentForm' }
```

</TabItem>
</Tabs>

:::info

If you still get an error, try reloading the Storybook tab in the browser.

:::

To use `mockGraphQLMutation` you call it with the name of the mutation you want to intercept and then the function that will handle the interception and return a response. The arguments passed to that function give us some flexibility in how we handle the response.

In our case we want the `variables` that were passed to the mutation (the `name` and `body`) as well as the context object (abbreviated as `ctx`) so that we can add a delay to simulate a round trip to the server. This will let us test that the **Submit** button is disabled for that one second and you can't submit a second comment while the first one is still being saved.

Try out the form now and the error should be gone. Also the **Submit** button should become visually disabled and clicking it during that one second delay does nothing.

### Adding the Form to the Blog Post

Right above the display of existing comments on a blog post is probably where our form should go. So should we add it to the `Article` component along with the `CommentsCell` component? If wherever we display a list of comments we'll also include the form to add a new one, that feels like it may as well just go into the `CommentsCell` component itself. However, this presents a problem:

If we put the `CommentForm` in the `Success` component of `CommentsCell` then what happens when there are no comments yet? The `Empty` component renders, which doesn't include the form! So it becomes impossible to add the first comment.

We could copy the `CommentForm` to the `Empty` component as well, but as soon as you find yourself duplicating code like this it can be a hint that you need to rethink something about your design.

Maybe `CommentsCell` should really only be responsible for retrieving and displaying comments. Having it also accept user input seems outside of its primary concern.

So let's use `Article` as the cleaning house for where all these disparate parts are combined—the actual blog post, the form to add a new comment, and the list of comments (and a little margin between them):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
import { Link, routes } from '@redwoodjs/router'

// highlight-next-line
import CommentForm from 'src/components/CommentForm'
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
      {!summary && (
        // highlight-start
        <div className="mt-12">
          <CommentForm />
          // highlight-end
          <div className="mt-12">
            <CommentsCell />
          </div>
        // highlight-next-line
        </div>
      )}
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
import CommentForm from 'src/components/CommentForm'
import CommentsCell from 'src/components/CommentsCell'

import type { Post } from 'types/graphql'

const truncate = (text: string, length: number) => {
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
      {!summary && (
        // highlight-start
        <div className="mt-12">
          <CommentForm />
          // highlight-end
          <div className="mt-12">
            <CommentsCell />
          </div>
          // highlight-next-line
        </div>
      )}
    </article>
  )
}

export default Article
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/153929564-59bcafd6-f3a3-437e-86d9-b92753b7fe9b.png)

Looks great in Storybook, how about on the real site?

![image](https://user-images.githubusercontent.com/300/153929680-a33e5332-2e02-423e-9ca5-4757ad8dbbb5.png)

Now comes the ultimate test: creating a comment! LET'S DO IT:

![image](https://user-images.githubusercontent.com/300/153929833-f2a3e38d-c70e-4f64-ade1-4327a7f47193.png)

What happened here? Notice towards the end of the error message: `Field "postId" of required type "Int!" was not provided`. When we created our data schema we said that a post belongs to a comment via the `postId` field. And that field is required, so the GraphQL server is rejecting the request because we're not including that field. We're only sending `name` and `body`. Luckily we have access to the ID of the post we're commenting on thanks to the `article` object that's being passed into `Article` itself!

:::info Why didn't the Storybook story we wrote earlier expose this problem?

We manually mocked the GraphQL response in the story, and our mock always returns a correct response, regardless of the input!

There's always a tradeoff when creating mock data—it greatly simplifies testing by not having to rely on the entire GraphQL stack, but that means if you want it to be as accurate as the real thing you basically need to _re-write the real thing in your mock_. In this case, leaving out the `postId` was a one-time fix so it's probably not worth going through the work of creating a story/mock/test that simulates what would happen if we left it off.

But, if `CommentForm` ended up being a component that was re-used throughout your application, or the code itself will go through a lot of churn because other developers will constantly be making changes to it, it might be worth investing the time to make sure the interface (the props passed to it and the expected return) are exactly what you want them to be.

:::

First let's pass the post's ID as a prop to `CommentForm`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/Article/Article.jsx"
import { Link, routes } from '@redwoodjs/router'
import CommentsCell from 'src/components/CommentsCell'
import CommentForm from 'src/components/CommentForm'

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
      {!summary && (
        <div className="mt-12">
          // highlight-next-line
          <CommentForm postId={article.id} />
          <div className="mt-12">
            <CommentsCell />
          </div>
        </div>
      )}
    </article>
  )
}

export default Article
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/components/Article/Article.tsx"
import { Link, routes } from '@redwoodjs/router'
import CommentsCell from 'src/components/CommentsCell'
import CommentForm from 'src/components/CommentForm'

const truncate = (text: string, length: number) => {
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
      {!summary && (
        <div className="mt-12">
          // highlight-next-line
          <CommentForm postId={article.id} />
          <div className="mt-12">
            <CommentsCell />
          </div>
        </div>
      )}
    </article>
  )
}

export default Article
```

</TabItem>
</Tabs>

And then we'll append that ID to the `input` object that's being passed to `createComment` in the `CommentForm`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.jsx"
// highlight-next-line
const CommentForm = ({ postId }) => {
  const [createComment, { loading, error }] = useMutation(CREATE)

  const onSubmit = (input) => {
    // highlight-next-line
    createComment({ variables: { input: { postId, ...input } } })
  }

  return (
    //...
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/components/CommentForm/CommentForm.tsx"
// highlight-start
interface Props {
  postId: number
}
// highlight-end

// highlight-next-line
const CommentForm = ({ postId }: Props) => {
  const [createComment, { loading, error }] = useMutation(CREATE)

  const onSubmit: SubmitHandler<FormValues> = (input) => {
    // highlight-next-line
    createComment({ variables: { input: { postId, ...input } } })
  }

  return (
    //...
  )
}
```

</TabItem>
</Tabs>

Now fill out the comment form and submit! And...nothing happened! Believe it or not that's actually an improvement in the situation—no more error! What if we reload the page?

![image](https://user-images.githubusercontent.com/300/153930645-c5233fb5-ad7f-4a03-8707-3cd6164bb277.png)

Yay! It would have been nicer if that comment appeared as soon as we submitted the comment, so maybe that's a half-yay? Also, the text boxes stayed filled with our name/messages (before we reloaded the page) which isn't ideal. But, we can fix both of those. One involves telling the GraphQL client (Apollo) that we created a new record and, if it would be so kind, to try the query again that gets the comments for this page, and we'll fix the other by just removing the form from the page completely when a new comment is submitted.

### GraphQL Query Caching

Much has been written about the [complexities](https://medium.com/swlh/how-i-met-apollo-cache-ee804e6485e9) of [Apollo](https://medium.com/@galen.corey/understanding-apollo-fetch-policies-705b5ad71980) [caching](https://levelup.gitconnected.com/basics-of-caching-data-in-graphql-7ce9489dac15), but for the sake of brevity (and sanity) we're going to do the easiest thing that works, and that's tell Apollo to just re-run the query that shows comments in the cell, known as "refetching."

Along with the variables you pass to a mutation function (`createComment` in our case) there's an option named `refetchQueries` where you pass an array of queries that should be re-run because, presumably, the data you just mutated is reflected in the result of those queries. In our case there's a single query, the `QUERY` export of `CommentsCell`. We'll import that at the top of `CommentForm` (and rename so it's clear what it is to the rest of our code) and then pass it along to the `refetchQueries` option:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.jsx"
import {
  Form,
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'
import { useMutation } from '@redwoodjs/web'

// highlight-next-line
import { QUERY as CommentsQuery } from 'src/components/CommentsCell'

// ...

const CommentForm = ({ postId }) => {
  // highlight-start
  const [createComment, { loading, error }] = useMutation(CREATE, {
    refetchQueries: [{ query: CommentsQuery }],
  })
  // highlight-end

  //...
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/components/CommentForm/CommentForm.tsx"
import {
  Form,
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'
import { useMutation } from '@redwoodjs/web'

// highlight-next-line
import { QUERY as CommentsQuery } from 'src/components/CommentsCell'

// ...

const CommentForm = ({ postId }: Props) => {
  // highlight-start
  const [createComment, { loading, error }] = useMutation(CREATE, {
    refetchQueries: [{ query: CommentsQuery }],
  })
  // highlight-end

  //...
}
```

</TabItem>
</Tabs>

Now when we create a comment it appears right away! It might be hard to tell because it's at the bottom of the comments list (which is a fine position if you want to read comments in chronological order, oldest to newest). Let's pop up a little notification that the comment was successful to let the user know their contribution was successful in case they don't realize it was added to the end of the page.

We'll make use of good old fashioned React state to keep track of whether a comment has been posted in the form yet or not. If so, let's remove the comment form completely and show a "Thanks for your comment" message. Redwood includes [react-hot-toast](https://react-hot-toast.com/) for showing popup notifications, so let's use that to thank the user for their comment. We'll remove the form with just a couple of CSS classes:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.jsx"
// highlight-next-line
import { useState } from 'react'

import {
  Form,
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'
import { useMutation } from '@redwoodjs/web'
// highlight-next-line
import { toast } from '@redwoodjs/web/toast'

import { QUERY as CommentsQuery } from 'src/components/CommentsCell'

const CREATE = gql`
  mutation CreateCommentMutation($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      name
      body
      createdAt
    }
  }
`

const CommentForm = ({ postId }) => {
  // highlight-next-line
  const [hasPosted, setHasPosted] = useState(false)
  const [createComment, { loading, error }] = useMutation(CREATE, {
    // highlight-start
    onCompleted: () => {
      setHasPosted(true)
      toast.success('Thank you for your comment!')
    },
    // highlight-end
    refetchQueries: [{ query: CommentsQuery }],
  })

  const onSubmit = (input) => {
    createComment({ variables: { input: { postId, ...input } } })
  }

  return (
    // highlight-next-line
    <div className={hasPosted ? 'hidden' : ''}>
      <h3 className="font-light text-lg text-gray-600">Leave a Comment</h3>
      <Form className="mt-4 w-full" onSubmit={onSubmit}>
        <FormError
          error={error}
          titleClassName="font-semibold"
          wrapperClassName="bg-red-100 text-red-900 text-sm p-3 rounded"
        />
        <Label
          name="name"
          className="block text-xs font-semibold text-gray-500 uppercase"
        >
          Name
        </Label>
        <TextField
          name="name"
          className="block w-full p-1 border rounded text-sm "
          validation={{ required: true }}
        />

        <Label
          name="body"
          className="block mt-4 text-xs font-semibold text-gray-500 uppercase"
        >
          Comment
        </Label>
        <TextAreaField
          name="body"
          className="block w-full p-1 border rounded h-24 text-sm"
          validation={{ required: true }}
        />

        <Submit
          disabled={loading}
          className="block mt-4 bg-blue-500 text-white text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 disabled:opacity-50"
        >
          Submit
        </Submit>
      </Form>
    </div>
  )
}

export default CommentForm
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/CommentForm/CommentForm.tsx"
// highlight-next-line
import { useState } from 'react'

import type {
  CreateCommentMutation,
  CreateCommentMutationVariables,
} from 'types/graphql'

import {
  Form,
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'
import type { TypedDocumentNode } from '@redwoodjs/web'
import { useMutation } from '@redwoodjs/web'
// highlight-next-line
import { toast } from '@redwoodjs/web/toast'

import { QUERY as CommentsQuery } from 'src/components/CommentsCell'

const CREATE: TypedDocumentNode<
  CreateCommentMutation,
  CreateCommentMutationVariables
> = gql`
  mutation CreateCommentMutation($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      name
      body
      createdAt
    }
  }
`

interface FormValues {
  name: string
  email: string
  message: string
}

interface Props {
  postId: number
}

const CommentForm = ({ postId }: Props) => {
  // highlight-next-line
  const [hasPosted, setHasPosted] = useState(false)
  const [createComment, { loading, error }] = useMutation(CREATE, {
    // highlight-start
    onCompleted: () => {
      setHasPosted(true)
      toast.success('Thank you for your comment!')
    },
    // highlight-end
    refetchQueries: [{ query: CommentsQuery }],
  })

  const onSubmit: SubmitHandler<FormValues> = (input) => {
    createComment({ variables: { input: { postId, ...input } } })
  }

  return (
    // highlight-next-line
    <div className={hasPosted ? 'hidden' : ''}>
      <h3 className="font-light text-lg text-gray-600">Leave a Comment</h3>
      <Form className="mt-4 w-full" onSubmit={onSubmit}>
        <FormError
          error={error}
          titleClassName="font-semibold"
          wrapperClassName="bg-red-100 text-red-900 text-sm p-3 rounded"
        />
        <Label
          name="name"
          className="block text-xs font-semibold text-gray-500 uppercase"
        >
          Name
        </Label>
        <TextField
          name="name"
          className="block w-full p-1 border rounded text-sm "
          validation={{ required: true }}
        />

        <Label
          name="body"
          className="block mt-4 text-xs font-semibold text-gray-500 uppercase"
        >
          Comment
        </Label>
        <TextAreaField
          name="body"
          className="block w-full p-1 border rounded h-24 text-sm"
          validation={{ required: true }}
        />

        <Submit
          disabled={loading}
          className="block mt-4 bg-blue-500 text-white text-xs font-semibold uppercase tracking-wide rounded px-3 py-2 disabled:opacity-50"
        >
          Submit
        </Submit>
      </Form>
    </div>
  )
}

export default CommentForm
```

</TabItem>
</Tabs>

![image](https://user-images.githubusercontent.com/300/153932278-6e504b6b-9e8e-400e-98fb-8bfeefbe3812.png)

We used `hidden` to just hide the form and "Leave a comment" title completely from the page, but keeps the component itself mounted. But where's our "Thank you for your comment" notification? We still need to add the `Toaster` component (from react-hot-toast) somewhere in our app so that the message can actually be displayed. We could just add it here, in `CommentForm`, but what if we want other code to be able to post notifications, even when `CommentForm` isn't mounted? Where's the one place we put UI elements that should be visible everywhere? The `BlogLayout`!

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/layouts/BlogLayout/BlogLayout.jsx"
import { Link, routes } from '@redwoodjs/router'
// highlight-next-line
import { Toaster } from '@redwoodjs/web/toast'

import { useAuth } from 'src/auth'

const BlogLayout = ({ children }) => {
  const { logOut, isAuthenticated, currentUser } = useAuth()

  return (
    <>
      // highlight-next-line
      <Toaster />
      <header className="relative flex justify-between items-center py-4 px-8 bg-blue-700 text-white">
        <h1 className="text-5xl font-semibold tracking-tight">
          <Link
            className="text-blue-400 hover:text-blue-100 transition duration-100"
            to={routes.home()}
          >
            Redwood Blog
          </Link>
        </h1>
        <nav>
          <ul className="relative flex items-center font-light">
            <li>
              <Link
                className="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded"
                to={routes.about()}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                className="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded"
                to={routes.contact()}
              >
                Contact
              </Link>
            </li>
            <li>
              {isAuthenticated ? (
                <div>
                  <button type="button" onClick={logOut} className="py-2 px-4">
                    Logout
                  </button>
                </div>
              ) : (
                <Link to={routes.login()} className="py-2 px-4">
                  Login
                </Link>
              )}
            </li>
          </ul>
          {isAuthenticated && (
            <div className="absolute bottom-1 right-0 mr-12 text-xs text-blue-300">
              {currentUser.email}
            </div>
          )}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto p-12 bg-white shadow rounded-b">
        {children}
      </main>
    </>
  )
}

export default BlogLayout
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/layouts/BlogLayout/BlogLayout.tsx"
import { Link, routes } from '@redwoodjs/router'
// highlight-next-line
import { Toaster } from '@redwoodjs/web/toast'

import { useAuth } from 'src/auth'

type BlogLayoutProps = {
  children?: React.ReactNode
}

const BlogLayout = ({ children }: BlogLayoutProps) => {
  const { logOut, isAuthenticated, currentUser } = useAuth()

  return (
    <>
      // highlight-next-line
      <Toaster />
      <header className="relative flex justify-between items-center py-4 px-8 bg-blue-700 text-white">
        <h1 className="text-5xl font-semibold tracking-tight">
          <Link
            className="text-blue-400 hover:text-blue-100 transition duration-100"
            to={routes.home()}
          >
            Redwood Blog
          </Link>
        </h1>
        <nav>
          <ul className="relative flex items-center font-light">
            <li>
              <Link
                className="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded"
                to={routes.about()}
              >
                About
              </Link>
            </li>
            <li>
              <Link
                className="py-2 px-4 hover:bg-blue-600 transition duration-100 rounded"
                to={routes.contact()}
              >
                Contact
              </Link>
            </li>
            <li>
              {isAuthenticated ? (
                <div>
                  <button type="button" onClick={logOut} className="py-2 px-4">
                    Logout
                  </button>
                </div>
              ) : (
                <Link to={routes.login()} className="py-2 px-4">
                  Login
                </Link>
              )}
            </li>
          </ul>
          {isAuthenticated && (
            <div className="absolute bottom-1 right-0 mr-12 text-xs text-blue-300">
              {currentUser.email}
            </div>
          )}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto p-12 bg-white shadow rounded-b">
        {children}
      </main>
    </>
  )
}

export default BlogLayout
```

</TabItem>
</Tabs>

Now add a comment:

![image](https://user-images.githubusercontent.com/300/153933162-079ac322-acde-4ea0-b43e-58b53fb85d98.png)

### Almost Done?

So it looks like we're just about done here! Try going back to the homepage and go to another blog post. Let's bask in the glory of our amazing coding abilities and—OH NO:

![image](https://user-images.githubusercontent.com/300/153933665-83158870-8422-4da9-9809-7d3b51444a14.png)

All posts have the same comments! **WHAT HAVE WE DONE??**

Remember our foreshadowing callout a few pages back, wondering if our `comments()` service which only returns _all_ comments could come back to bite us? It finally has: when we get the comments for a post we're not actually getting them for only that post. We're ignoring the `postId` completely and just returning _all_ comments in the database! Turns out the old axiom is true: computers only do exactly what you tell them to do.

Let's fix it!

### Returning Only Some Comments

We'll need to make both frontend and backend changes to get only some comments to show. Let's start with the backend and do a little test-driven development to make this change.

#### Introducing the Redwood Console

It would be nice if we could try out sending some arguments to our Prisma calls and be sure that we can request a single post's comments without having to write the whole stack into the app (component/cell, GraphQL, service) just to see if it works.

That's where the Redwood Console comes in! In a new terminal instance, try this:

```bash
yarn rw console
```

You'll see a standard Node console but with most of Redwood's internals already imported and ready to go! Most importantly, that includes the database. Try it out:

```bash
> db.comment.findMany()
[
  {
    id: 1,
    name: 'Rob',
    body: 'The first real comment!',
    postId: 1,
    createdAt: 2020-12-08T23:45:10.641Z
  },
  {
    id: 2,
    name: 'Tom',
    body: 'Here is another comment',
    postId: 1,
    createdAt: 2020-12-08T23:46:10.641Z
  }
]
```

(Output will be slightly different, of course, depending on what comments you already have in your database.)

Let's try the syntax that will allow us to only get comments for a given `postId`:

```bash
> db.comment.findMany({ where: { postId: 1 }})
[
  {
    id: 1,
    name: 'Rob',
    body: 'The first real comment!',
    postId: 1,
    createdAt: 2020-12-08T23:45:10.641Z
  },
  {
    id: 2,
    name: 'Tom',
    body: 'Here is another comment',
    postId: 1,
    createdAt: 2020-12-08T23:46:10.641Z
  }
]
```

Well it worked, but the list is exactly the same. That's because we've only added comments for a single post! Let's create a comment for a second post and make sure that only those comments for a specific `postId` are returned.

We'll need the `id` of another post. Make sure you have at least two (create one through the admin if you need to). We can get a list of all the existing posts and copy the `id`:

```bash
> db.post.findMany({ select: { id: true } })
[ { id: 1 }, { id: 2 }, { id: 3 } ]
```

Okay, now let's create a comment for that second post via the console:

```bash
> db.comment.create({ data: { name: 'Peter', body: 'I also like leaving comments', postId: 2 } })
{
  id: 3,
  name: 'Peter',
  body: 'I also like leaving comments',
  postId: 2,
  createdAt: 2020-12-08T23:47:10.641Z
}
```

Now we'll try our comment query again, once with each `postId`:

```bash
> db.comment.findMany({ where: { postId: 1 }})
[
  {
    id: 1,
    name: 'Rob',
    body: 'The first real comment!',
    postId: 1,
    createdAt: 2020-12-08T23:45:10.641Z
  },
  {
    id: 2,
    name: 'Tom',
    body: 'Here is another comment',
    postId: 1,
    createdAt: 2020-12-08T23:46:10.641Z
  }
]

> db.comment.findMany({ where: { postId: 2 }})
[
  {
    id: 3,
    name: 'Peter',
    body: 'I also like leaving comments',
    postId: 2,
    createdAt: 2020-12-08T23:45:10.641Z
  },

```

Great! Now that we've tested out the syntax let's use that in the service. You can exit the console by pressing Ctrl-C twice or typing `.exit`

:::info Where's the `await`?

Calls to `db` return a Promise, which you would normally need to add an `await` to in order to get the results right away. Having to add `await` every time is pretty annoying though, so the Redwood console does it for you—Redwood `await`s so you don't have to!

:::

#### Updating the Service

Try running the test suite (or if it's already running take a peek at that terminal window) and make sure all of our tests still pass. The "lowest level" of the api-side is the services, so let's start there.

:::tip

One way to think about your codebase is a "top to bottom" view where the top is what's "closest" to the user and what they interact with (React components) and the bottom is the "farthest" thing from them, in the case of a web application that would usually be a database or other data store (behind a third party API, perhaps). One level above the database are the services, which directly communicate to the database:

```
   Browser
      |
    React    ─┐
      |       │
   Graph QL   ├─ Redwood
      |       │
   Services  ─┘
      |
   Database
```

There are no hard and fast rules here, but generally the farther down you put your business logic (the code that deals with moving and manipulating data) the easier it will be to build and maintain your application. Redwood encourages you to put your business logic in services since they're "closest" to the data and behind the GraphQL interface.

:::

Open up the **comments** service test and let's update it to pass the `postId` argument to the `comments()` function like we tested out in the console:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.test.js"
scenario('returns all comments', async (scenario) => {
  // highlight-next-line
  const result = await comments({ postId: scenario.comment.jane.postId })
  expect(result.length).toEqual(Object.keys(scenario.comment).length)
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.test.ts"
scenario('returns all comments', async (scenario: StandardScenario) => {
  // highlight-next-line
  const result = await comments({ postId: scenario.comment.jane.postId })
  expect(result.length).toEqual(Object.keys(scenario.comment).length)
})
```

</TabItem>
</Tabs>

When the test suite runs everything will still pass. JavaScript won't care if you're passing an argument all of a sudden (although if you were using Typescript you will actually get an error at this point!). In TDD you generally want to get your test to fail before adding code to the thing you're testing which will then cause the test to pass. What's something in this test that will be different once we're only returning _some_ comments? How about the number of comments expected to be returned?

Let's take a look at the scenario we're using (remember, it's `standard()` by default):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.scenarios.js"
export const standard = defineScenario({
  comment: {
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
  },
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```javascript title="api/src/services/comments/comments.scenarios.ts"
export const standard = defineScenario({
  comment: {
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
  },
})
```

</TabItem>
</Tabs>

Each scenario here is associated with its own post, so rather than counting all the comments in the database (like the test does now) let's only count the number of comments attached to the single post we're getting comments for (we're passing the postId into the `comments()` call now). Let's see what it looks like in test form:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="api/src/services/comments/comments.test.jsx"
import { comments, createComment } from './comments'
// highlight-next-line
import { db } from 'src/lib/db'

describe('comments', () => {
  scenario('returns all comments', async (scenario) => {
    const result = await comments({ postId: scenario.comment.jane.postId })
    // highlight-start
    const post = await db.post.findUnique({
      where: { id: scenario.comment.jane.postId },
      include: { comments: true },
    })
    expect(result.length).toEqual(post.comments.length)
    // highlight-end
  })

  // ...
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="api/src/services/comments/comments.test.ts"
import { comments, createComment } from './comments'
// highlight-next-line
import { db } from 'src/lib/db'

import type { StandardScenario } from './comments.scenarios'

describe('comments', () => {
  scenario('returns all comments', async (scenario) => {
    const result = await comments({ postId: scenario.comment.jane.postId })
    // highlight-start
    const post = await db.post.findUnique({
      where: { id: scenario.comment.jane.postId },
      include: { comments: true },
    })
    expect(result.length).toEqual(post.comments.length)
    // highlight-end
  })

  // ...
})
```

</TabItem>
</Tabs>

So we're first getting the result from the services, all the comments for a given `postId`. Then we pull the _actual_ post from the database and include its comments. Then we expect that the number of comments returned from the service is the same as the number of comments actually attached to the post in the database. Now the test fails and you can see why in the output:

```bash
 FAIL   api  api/src/services/comments/comments.test.js
  • comments › returns all comments

    expect(received).toEqual(expected) // deep equality

    Expected: 1
    Received: 2
```

So we expected to receive 1 (from `post.comments.length`), but we actually got 2 (from `result.length`).

Before we get it passing again, let's also change the name of the test to reflect what it's actually testing:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.test.js"
// highlight-start
scenario(
  'returns all comments for a single post from the database',
  // highlight-end
  async (scenario) => {
    const result = await comments({ postId: scenario.comment.jane.postId })
    const post = await db.post.findUnique({
      where: { id: scenario.comment.jane.postId },
      include: { comments: true },
    })
    expect(result.length).toEqual(post.comments.length)
  }
)
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```javascript title="api/src/services/comments/comments.test.ts"
// highlight-start
scenario(
  'returns all comments for a single post from the database',
  // highlight-end
  async (scenario: StandardScenario) => {
    const result = await comments({ postId: scenario.comment.jane.postId })
    const post = await db.post.findUnique({
      where: { id: scenario.comment.jane.postId },
      include: { comments: true },
    })
    expect(result.length).toEqual(post.comments.length)
  }
)
```

</TabItem>
</Tabs>

Okay, open up the actual `comments.js` service and we'll update it to accept the `postId` argument and use it as an option to `findMany()` (be sure to update the `comments()` function [with an "s"] and not the unused `comment()` function):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```javascript title="api/src/services/comments/comments.js"
export const comments = ({ postId }) => {
  return db.comment.findMany({ where: { postId } })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/comments/comments.ts"
export const comments = ({
  postId,
}: Required<Pick<Prisma.CommentWhereInput, 'postId'>>) => {
  return db.comment.findMany({ where: { postId } })
}
```

</TabItem>
</Tabs>

Save that and the test should pass again!

#### Updating GraphQL

Next we need to let GraphQL know that it should expect a `postId` to be passed for the `comments` query, and it's required (we don't currently have any view that allows you see all comments everywhere so we can ask that it always be present). Open up the `comments.sdl.{js,ts}` file:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="api/src/graphql/comments.sdl.js"
type Query {
  // highlight-next-line
  comments(postId: Int!): [Comment!]! @skipAuth
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="api/src/graphql/comments.sdl.ts"
type Query {
  // highlight-next-line
  comments(postId: Int!): [Comment!]! @skipAuth
}
```

</TabItem>
</Tabs>

Now if you try refreshing the real site in dev mode you'll see an error where the comments should be displayed:

![image](https://user-images.githubusercontent.com/300/198095941-bbd07ede-2006-422a-8635-ea8fe57dd403.png)

For security reasons we don't show the internal error message here, but if you check the terminal window where `yarn rw dev` is running you'll see the real message:

```text
Field "comments" argument "postId" of type "Int!" is required, but it was not provided.
```

And yep, it's complaining about `postId` not being present—exactly what we want!

That completes the backend updates, now we just need to tell `CommentsCell` to pass through the `postId` to the GraphQL query it makes.

#### Updating the Cell

First we'll need to get the `postId` to the cell itself. Remember when we added a `postId` prop to the `CommentForm` component so it knew which post to attach the new comment to? Let's do the same for `CommentsCell`.

Open up `Article`:

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
      {!summary && (
        <div className="mt-12">
          <CommentForm postId={article.id} />
          <div className="mt-12">
            // highlight-next-line
            <CommentsCell postId={article.id} />
          </div>
        </div>
      )}
    </article>
  )
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/components/Article/Article.tsx"
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
      {!summary && (
        <div className="mt-12">
          <CommentForm postId={article.id} />
          <div className="mt-12">
            // highlight-next-line
            <CommentsCell postId={article.id} />
          </div>
        </div>
      )}
    </article>
  )
}
```

</TabItem>
</Tabs>

And finally, we need to take that `postId` and pass it on to the `QUERY` in the cell:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="web/src/components/CommentsCell/CommentsCell.jsx"
export const QUERY = gql`
  // highlight-start
  query CommentsQuery($postId: Int!) {
    comments(postId: $postId) {
    // highlight-end
      id
      name
      body
      createdAt
    }
  }
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="web/src/components/CommentsCell/CommentsCell.tsx"
export const QUERY: TypedDocumentNode<CommentsQuery, CommentsQueryVariables> =
  gql`
    // highlight-start
    query CommentsQuery($postId: Int!) {
      comments(postId: $postId) {
      // highlight-end
        id
        name
        body
        createdAt
      }
    }
  `
```

</TabItem>
</Tabs>

Where does this magical `$postId` come from? Redwood is nice enough to automatically provide it to you since you passed it in as a prop when you called the component!

Try going to a couple of different blog posts and you should see only comments associated to the proper posts (including the one we created in the console). You can add a comment to each blog post individually and they'll stick to their proper owners:

![image](https://user-images.githubusercontent.com/300/100954162-de24f680-34c8-11eb-817b-0a7ad802f28b.png)

However, you may have noticed that now when you post a comment it no longer appears right away! ARGH! Okay, turns out there's one more thing we need to do. Remember when we told the comment creation logic to `refetchQueries`? We need to include any variables that were present the first time so that it can refetch the proper ones.

#### Updating the Form Refetch

Okay this is the last fix, promise!

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/components/CommentForm/CommentForm.jsx"
const [createComment, { loading, error }] = useMutation(CREATE, {
  onCompleted: () => {
    setHasPosted(true)
    toast.success('Thank you for your comment!')
  },
  // highlight-next-line
  refetchQueries: [{ query: CommentsQuery, variables: { postId } }],
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/components/CommentForm/CommentForm.tsx"
const [createComment, { loading, error }] = useMutation(CREATE, {
  onCompleted: () => {
    setHasPosted(true)
    toast.success('Thank you for your comment!')
  },
  // highlight-next-line
  refetchQueries: [{ query: CommentsQuery, variables: { postId } }],
})
```

</TabItem>
</Tabs>

There we go, comment engine complete! Our blog is totally perfect and there's absolutely nothing we could do to make it better.

Or is there?
