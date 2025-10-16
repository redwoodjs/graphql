---
description: Toast notifications with react-hot-toast
---

# Toast Notifications

Did you know that those little popup notifications that you sometimes see at the top of a page after you've performed an action are affectionately known as "toast" notifications?
Because they pop up like a piece of toast from a toaster!

![Example toast animation](https://user-images.githubusercontent.com/300/110032806-71024680-7ced-11eb-8d69-7f462929815e.gif)

Redwood supports these notifications out of the box thanks to the [react-hot-toast](https://react-hot-toast.com/) package.
We'll refer you to their [docs](https://react-hot-toast.com/docs) since they're very thorough, but here's enough to get you going.

### Add the `Toaster` Component

To render toast notifications, start by adding the `Toaster` component.
It's usually better to add it at the App or Layout-level than the Page:

```jsx title="web/src/layouts/MainLayout/MainLayout.js"
// highlight-next-line
import { Toaster } from '@redwoodjs/web/toast'

const MainLayout = ({ children }) => {
  return (
    <>
      // highlight-next-line
      <Toaster />
      <main>{children}</main>
    </>
  )
}

export default MainLayout
```

### Call the `toast` function

To render a basic toast notification with default styles, call the `toast` function:

```jsx title="web/src/layouts/MainLayout/MainLayout.js"
import { toast } from '@redwoodjs/web/toast'

// ...

const PostForm = () => {
  const [create, { loading, error }] = useMutation(CREATE_POST_MUTATION)

  const onSubmit = async (data) => {
    try {
      await create({ variables: { input: data }})
      // highlight-next-line
      toast('Post created')
    }
    catch (e) {
      // highlight-next-line
      toast('Error creating post')
    }
  }

  return (
    // <Form onSubmit={onSubmit}> ... </Form>
  )
})

export default PostForm
```

### Call the `toast` variants

To render a toast notification with default icons and default styles, call the `toast` variants:

```jsx title="web/src/components/PostForm/PostForm.js"
import { toast } from '@redwoodjs/web/toast'

// ...

const PostForm = () => {
  const [create, { loading, error }] = useMutation(CREATE_POST_MUTATION, {
    onCompleted: () => {
      // highlight-next-line
      toast.success('Post created')
    }
    onError: () => {
      // highlight-next-line
      toast.error('Error creating post')
    }
  })

  const onSubmit = (data) => {
    create({ variables: { input: data }})
  }

  return (
    // <Form onSubmit={onSubmit}> ... </Form>
  )
})

export default PostForm
```

or render an async toast by calling the `toast.promise` function:

```jsx title="web/src/components/PostForm/PostForm.js"
import { toast } from '@redwoodjs/web/toast'

// ...

const PostForm = () => {
  const [create, { loading, error }] = useMutation(CREATE_POST_MUTATION)

  const onSubmit = (data) => {
    // highlight-next-line
    toast.promise(create({ variables: { input: data }}), {
      loading: 'Creating post...',
      success: 'Post created',
      error: 'Error creating post',
    })
  }

  return (
    // <Form onSubmit={onSubmit}> ... </Form>
  )
})

export default PostForm
```

:::warning

You can't use the [onError](https://www.apollographql.com/docs/react/api/react/hooks/#onerror) callback in combination with the `toast.promise` function.

:::
