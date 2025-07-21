# Building a Form

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/b0x8an_UZ98?rel=0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; modestbranding; showinfo=0; fullscreen"></iframe>
</div>

Wait, don't close your browser! You had to know this was coming eventually, didn't you? And you've probably realized by now we wouldn't even have this section in the tutorial unless Redwood had figured out a way to make forms less soul-sucking than usual. In fact, Redwood might even make you _love_ building forms.

Well, love is a strong word. _Like_ building forms?

_Tolerate_ building them?

We already have a form or two in our app; remember our posts scaffold? And those work pretty well! How hard can it be? (Hopefully you haven't sneaked a peek at that code—what's coming next will be much more impressive if you haven't.)

Let's build the simplest form that still makes sense for our blog, a "Contact Us" form.

### The Page

```bash
yarn rw g page contact
```

We can put a link to Contact in our layout's header:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/layouts/BlogLayout/BlogLayout.jsx"
import { Link, routes } from '@redwoodjs/router'

const BlogLayout = ({ children }) => {
  return (
    <>
      <header>
        <h1>
          <Link to={routes.home()}>Redwood Blog</Link>
        </h1>
        <nav>
          <ul>
            <li>
              <Link to={routes.home()}>Home</Link>
            </li>
            <li>
              <Link to={routes.about()}>About</Link>
            </li>
            // highlight-start
            <li>
              <Link to={routes.contact()}>Contact</Link>
            </li>
            // highlight-end
          </ul>
        </nav>
      </header>
      <main>{children}</main>
    </>
  )
}

export default BlogLayout
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/layouts/BlogLayout/BlogLayout.tsx"
import { Link, routes } from '@redwoodjs/router'

type BlogLayoutProps = {
  children?: React.ReactNode
}

const BlogLayout = ({ children }: BlogLayoutProps) => {
  return (
    <>
      <header>
        <h1>
          <Link to={routes.home()}>Redwood Blog</Link>
        </h1>
        <nav>
          <ul>
            <li>
              <Link to={routes.home()}>Home</Link>
            </li>
            <li>
              <Link to={routes.about()}>About</Link>
            </li>
            // highlight-start
            <li>
              <Link to={routes.contact()}>Contact</Link>
            </li>
            // highlight-end
          </ul>
        </nav>
      </header>
      <main>{children}</main>
    </>
  )
}

export default BlogLayout
```

</TabItem>
</Tabs>

And then use the `BlogLayout` for the `ContactPage` by making sure its wrapped by the same `<Set>` as the other pages in the routes file:

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
        <Route path="/article/{id:Int}" page={ArticlePage} name="article" />
        // highlight-next-line
        <Route path="/contact" page={ContactPage} name="contact" />
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

```tsx title="web/src/Routes.tsx"
import { Router, Route, Set } from '@redwoodjs/router'
import ScaffoldLayout from 'src/layouts/ScaffoldLayout'
import BlogLayout from 'src/layouts/BlogLayout'

const Routes = () => {
  return (
    <Router>
      <Set
        wrap={ScaffoldLayout}
        title="Posts"
        titleTo="posts"
        buttonLabel="New Post"
        buttonTo="newPost"
      >
        <Route path="/posts/new" page={PostNewPostPage} name="newPost" />
        <Route
          path="/posts/{id:Int}/edit"
          page={PostEditPostPage}
          name="editPost"
        />
        <Route path="/posts/{id:Int}" page={PostPostPage} name="post" />
        <Route path="/posts" page={PostPostsPage} name="posts" />
      </Set>
      <Set wrap={BlogLayout}>
        <Route path="/article/{id:Int}" page={ArticlePage} name="article" />
        // highlight-next-line
        <Route path="/contact" page={ContactPage} name="contact" />
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

Double check that everything looks good and then let's get to the good stuff.

### Introducing Form Helpers

Forms in React are infamously annoying to work with. There are [Controlled Components](https://reactjs.org/docs/forms.html#controlled-components) and [Uncontrolled Components](https://reactjs.org/docs/uncontrolled-components.html) and [third party libraries](https://jaredpalmer.com/formik/) and many more workarounds to try and make forms in React as simple as they were originally intended to be in the HTML spec: an `<input>` field with a `name` attribute that gets submitted somewhere when you click a button.

We think Redwood is a step or two in the right direction by not only freeing you from writing controlled component plumbing, but also dealing with validation and errors automatically. Let's see how it works.

We won't be pulling any data from the database on our Contact page so we won't create a cell. Let's create the form right in the page. Redwood forms start with the...wait for it...`<Form>` tag:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form } from '@redwoodjs/forms'

const ContactPage = () => {
  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      // highlight-next-line
      <Form></Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form } from '@redwoodjs/forms'

const ContactPage = () => {
  return (
    <>
      <Metadata title="Contact" description="Contact page" />
      // highlight-next-line
      <Form></Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

Well that was anticlimactic. You can't even see it in the browser. Let's add a form field so we can at least see something. Redwood ships with several inputs and a plain text input box is the `<TextField>`. We'll also give the field a `name` attribute so that once there are multiple inputs on this page we'll know which contains which data:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form, TextField } from '@redwoodjs/forms'

const ContactPage = () => {
  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form>
        // highlight-next-line
        <TextField name="input" />
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form, TextField } from '@redwoodjs/forms'

const ContactPage = () => {
  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form>
        // highlight-next-line
        <TextField name="input" />
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146102866-a1adaad2-b0b3-4bd8-b42d-4ed918bd3c82.png" />

Something is showing! Still, pretty boring. How about adding a submit button?

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form, TextField, Submit } from '@redwoodjs/forms'

const ContactPage = () => {
  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form>
        <TextField name="input" />
        // highlight-next-line
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form, TextField, Submit } from '@redwoodjs/forms'

const ContactPage = () => {
  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form>
        <TextField name="input" />
        // highlight-next-line
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146102817-e2f6c020-ef64-45bb-bdbb-48a484218678.png" />

We have what might actually be considered a real, bonafide form here. Try typing something in and clicking "Save". Nothing blew up on the page but we have no indication that the form submitted or what happened to the data. Next we'll get the data from our fields.

### onSubmit

Similar to a plain HTML form we'll give `<Form>` an `onSubmit` handler. That handler will be called with a single argument—an object containing all of the submitted form fields:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import { Form, TextField, Submit } from '@redwoodjs/forms'

const ContactPage = () => {
  // highlight-start
  const onSubmit = (data) => {
    console.log(data)
  }
  // highlight-end

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      // highlight-next-line
      <Form onSubmit={onSubmit}>
        <TextField name="input" />
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form, TextField, Submit, SubmitHandler } from '@redwoodjs/forms'

// highlight-start
interface FormValues {
  input: string
}
// highlight-end

const ContactPage = () => {
  // highlight-start
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }
  // highlight-end

  return (
    <>
      <Metadata title="Contact" description="Contact page" />
      // highlight-next-line
      <Form onSubmit={onSubmit}>
        <TextField name="input" />
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

Now try filling in some data and submitting, then checking out the console in Web Inspector:

<img src="https://user-images.githubusercontent.com/300/146102943-dd0155e5-3bcb-45c5-b27f-65bfacb65c91.png" />

Great! Let's turn this into a more useful form by adding a couple fields. We'll rename the existing one to "name" and add "email" and "message":

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
// highlight-next-line
import { Form, TextField, TextAreaField, Submit } from '@redwoodjs/forms'

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        // highlight-start
        <TextField name="name" />
        <TextField name="email" />
        <TextAreaField name="message" />
        // highlight-end
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
// highlight-start
import {
  Form,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'
// highlight-end

interface FormValues {
  // highlight-start
  name: string
  email: string
  message: string
  // highlight-end
}

const ContactPage = () => {
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        // highlight-start
        <TextField name="name" />
        <TextField name="email" />
        <TextAreaField name="message" />
        // highlight-end
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

See the new `<TextAreaField>` component here which generates an HTML `<textarea>` but that contains Redwood's form goodness:

<img src="https://user-images.githubusercontent.com/300/146103219-c8dc958d-ea2b-4bea-8cb8-62dcd0be6783.png" />

Let's add some labels:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import { Form, TextField, TextAreaField, Submit } from '@redwoodjs/forms'

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        // highlight-next-line
        <label htmlFor="name">Name</label>
        <TextField name="name" />

        // highlight-next-line
        <label htmlFor="email">Email</label>
        <TextField name="email" />

        // highlight-next-line
        <label htmlFor="message">Message</label>
        <TextAreaField name="message" />

        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
import {
  Form,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        // highlight-next-line
        <label htmlFor="name">Name</label>
        <TextField name="name" />
        // highlight-next-line
        <label htmlFor="email">Email</label>
        <TextField name="email" />
        // highlight-next-line
        <label htmlFor="message">Message</label>
        <TextAreaField name="message" />
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146103401-b3d84a6c-091c-4ebc-a28c-f82c57561057.png" />

Try filling out the form and submitting and you should get a console message with all three fields now.

### Validation

"Okay, Redwood tutorial author," you're saying, "what's the big deal? You built up Redwood's form helpers as The Next Big Thing but there are plenty of libraries that will let me skip creating controlled inputs manually. So what?" And you're right! Anyone can fill out a form _correctly_ (although there are plenty of QA folks who would challenge that statement), but what happens when someone leaves something out, or makes a mistake, or tries to haxorz our form? Now who's going to be there to help? Redwood, that's who!

All three of these fields should be required in order for someone to send a message to us. Let's enforce that with the standard HTML `required` attribute:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
return (
  <Form onSubmit={onSubmit}>
    <label htmlFor="name">Name</label>
    // highlight-next-line
    <TextField name="name" required />

    <label htmlFor="email">Email</label>
    // highlight-next-line
    <TextField name="email" required />

    <label htmlFor="message">Message</label>
    // highlight-next-line
    <TextAreaField name="message" required />

    <Submit>Save</Submit>
  </Form>
)
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
return (
  <Form onSubmit={onSubmit}>
    <label htmlFor="name">Name</label>
    // highlight-next-line
    <TextField name="name" required />
    <label htmlFor="email">Email</label>
    // highlight-next-line
    <TextField name="email" required />
    <label htmlFor="message">Message</label>
    // highlight-next-line
    <TextAreaField name="message" required />
    <Submit>Save</Submit>
  </Form>
)
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146103473-ad762364-c456-49ae-8de7-3b26b10b38ff.png" />

Now when trying to submit there'll be message from the browser noting that a field must be filled in. This is better than nothing, but these messages can't be styled. Can we do better?

Yes! Let's update that `required` call to instead be an object we pass to a custom attribute on Redwood form helpers called `validation`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
return (
  <Form onSubmit={onSubmit}>
    <label htmlFor="name">Name</label>
    // highlight-next-line
    <TextField name="name" validation={{ required: true }} />

    <label htmlFor="email">Email</label>
    // highlight-next-line
    <TextField name="email" validation={{ required: true }} />

    <label htmlFor="message">Message</label>
    // highlight-next-line
    <TextAreaField name="message" validation={{ required: true }} />

    <Submit>Save</Submit>
  </Form>
)
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
return (
  <Form onSubmit={onSubmit}>
    <label htmlFor="name">Name</label>
    // highlight-next-line
    <TextField name="name" validation={{ required: true }} />
    <label htmlFor="email">Email</label>
    // highlight-next-line
    <TextField name="email" validation={{ required: true }} />
    <label htmlFor="message">Message</label>
    // highlight-next-line
    <TextAreaField name="message" validation={{ required: true }} />
    <Submit>Save</Submit>
  </Form>
)
```

</TabItem>
</Tabs>

And now when we submit the form with blank fields...the Name field gets focus. Boring. But this is just a stepping stone to our amazing reveal! We have one more form helper component to add—the one that displays errors on a field. Oh, it just so happens that it's plain HTML so we can style it however we want!

### `<FieldError>`

Introducing `<FieldError>` (don't forget to include it in the `import` statement at the top):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import {
  // highlight-next-line
  FieldError,
  Form,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <TextField name="name" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="name" />

        <label htmlFor="email">Email</label>
        <TextField name="email" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="email" />

        <label htmlFor="message">Message</label>
        <TextAreaField name="message" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="message" />

        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
import {
  // highlight-next-line
  FieldError,
  Form,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <TextField name="name" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="name" />
        <label htmlFor="email">Email</label>
        <TextField name="email" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="email" />
        <label htmlFor="message">Message</label>
        <TextAreaField name="message" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="message" />
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

Note that the `name` attribute matches the `name` of the input field above it. That's so it knows which field to display errors for. Try submitting that form now.

<img src="https://user-images.githubusercontent.com/300/146103580-1ebff2bb-d51d-4087-95de-3230b304e65e.png" />

But this is just the beginning. Let's make sure folks realize this is an error message. Remember the basic styles we added to `index.css` back at the start? There's an `.error` class in there that we can use. Set the `className` attribute on `<FieldError>`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <TextField name="name" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="name" className="error" />

        <label htmlFor="email">Email</label>
        <TextField name="email" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="email" className="error" />

        <label htmlFor="message">Message</label>
        <TextAreaField name="message" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="message" className="error" />

        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <TextField name="name" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="name" className="error" />
        <label htmlFor="email">Email</label>
        <TextField name="email" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="email" className="error" />
        <label htmlFor="message">Message</label>
        <TextAreaField name="message" validation={{ required: true }} />
        // highlight-next-line
        <FieldError name="message" className="error" />
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146104378-1066882c-1fe7-49e1-9547-44437338155d.png" />

You know what would be nice? If the input itself somehow displayed the fact that there was an error. Check out the `errorClassName` attributes on the inputs:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <TextField
          name="name"
          validation={{ required: true }}
          // highlight-next-line
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <label htmlFor="email">Email</label>
        <TextField
          name="email"
          validation={{ required: true }}
          // highlight-next-line
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <label htmlFor="message">Message</label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          // highlight-next-line
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <TextField
          name="name"
          validation={{ required: true }}
          // highlight-next-line
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <label htmlFor="email">Email</label>
        <TextField
          name="email"
          validation={{ required: true }}
          // highlight-next-line
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <label htmlFor="message">Message</label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          // highlight-next-line
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146104498-8b24ef5c-66e7-48a2-b4ad-0432fff181dd.png" />

Oooo, what if the _label_ could change as well? It can, but we'll need Redwood's custom `<Label>` component for that. Note that the `htmlFor` attribute of `<label>` becomes the `name` prop on `<Label>`, just like with the other Redwood form components. And don't forget the import:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  // highlight-next-line
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        // highlight-start
        <Label name="name" errorClassName="error">
          Name
        </Label>
        // highlight-end
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        // highlight-start
        <Label name="email" errorClassName="error">
          Email
        </Label>
        // highlight-end
        <TextField
          name="email"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        // highlight-start
        <Label name="message" errorClassName="error">
          Message
        </Label>
        // highlight-end
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  // highlight-next-line
  Label,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit}>
        // highlight-start
        <Label name="name" errorClassName="error">
          Name
        </Label>
        // highlight-end
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />
        // highlight-start
        <Label name="email" errorClassName="error">
          Email
        </Label>
        // highlight-end
        <TextField
          name="email"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />
        // highlight-start
        <Label name="message" errorClassName="error">
          Message
        </Label>
        // highlight-end
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />
        <Submit>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146104647-25f1b2cf-a3cd-4737-aa2d-9aa984c08e39.png" />

:::info Error styling

In addition to `className` and `errorClassName` you can also use `style` and `errorStyle`. Check out the [Form docs](../../forms.md) for more details on error styling.

:::

And notice that if you fill in something in a field that's marked as an error, the error instantly goes away! This is great feedback for our users that they're doing what we want, and they don't have to wait to click the "Save" button again just to see if what they changed is now correct.

### Validating Input Format

We should make sure the email field actually contains an email, by providing a `pattern`.
This is definitely not the end-all-be-all for email address validation, but for now let us pretend it's bulletproof.
Let's also change the message on the email validation to be a little more friendly:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
<TextField
  name="email"
  validation={{
    required: true,
    // highlight-start
    pattern: {
      value: /^[^@]+@[^.]+\..+$/,
      message: 'Please enter a valid email address',
    },
    // highlight-end
  }}
  errorClassName="error"
/>
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
<TextField
  name="email"
  validation={{
    required: true,
    // highlight-start
    pattern: {
      value: /^[^@]+@[^.]+\..+$/,
      message: 'Please enter a valid email address',
    },
    // highlight-end
  }}
  errorClassName="error"
/>
```

</TabItem>
</Tabs>

<img src="https://user-images.githubusercontent.com/300/146105001-96b76f12-e011-46c3-a490-7dd51b872498.png" />

:::info

When a validation error appears it will _disappear_ as soon as you fix the content of the field. You don't have to click "Submit" again to remove the error messages. This is great feedback for users (and eagle-eyed QA testers) since they receive instant feedback what they changed is now correct.

:::

Finally, you know what would _really_ be nice? If the fields were validated as soon as the user leaves each one so they don't fill out the whole thing and submit just to see multiple errors appear. Let's do that:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
<Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
<Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
```

</TabItem>
</Tabs>

Well, what do you think? Was it worth the hype? A couple of new components and you've got forms that handle validation and wrap up submitted values in a nice data object, all for free.

:::info

Redwood's forms are built on top of [React Hook Form](https://react-hook-form.com/) so there is even more functionality available than we've documented here. Visit the [Form docs](../../forms.md) to learn more about all form functionalities.

:::

Redwood has one more trick up its sleeve when it comes to forms but we'll save that for when we're actually submitting one to the server.

Having a contact form is great, but only if you actually get the contact somehow. Let's create a database table to hold the submitted data and create our first GraphQL mutation.
