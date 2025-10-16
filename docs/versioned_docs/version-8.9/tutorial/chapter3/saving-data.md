# Saving Data

### Add a Contact Model

Let's add a new database table. Open up `api/db/schema.prisma` and add a Contact model after the Post model that's there now:

```js title="api/db/schema.prisma"
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  createdAt DateTime @default(now())
}

// highlight-start
model Contact {
  id        Int      @id @default(autoincrement())
  name      String
  email     String
  message   String
  createdAt DateTime @default(now())
}
// highlight-end
```

:::tip

To mark a field as optional (that is, allowing `NULL` as a value) you can suffix the datatype with a question mark, e.g. `name String?`. This will allow `name`'s value to be either a `String` or `NULL`.

:::

Next we create and apply a migration:

```bash
yarn rw prisma migrate dev
```

We can name this one something like "create contact".

### Create an SDL & Service

Now we'll create the GraphQL interface to access this table. We haven't used this `generate` command yet (although the `scaffold` command did use it behind the scenes):

```bash
yarn rw g sdl Contact
```

Just like the `scaffold` command, this will create a few new files under the `api` directory:

1. `api/src/graphql/contacts.sdl.{js,ts}`: defines the GraphQL schema in GraphQL's schema definition language
2. `api/src/services/contacts/contacts.{js,ts}`: contains your app's business logic (also creates associated test files)

If you remember our discussion in [how Redwood works with data](../chapter2/side-quest.md) you'll recall that queries and mutations in an SDL file are automatically mapped to resolvers defined in a service, so when you generate an SDL file you'll get a service file as well, since one requires the other.

Open up `api/src/graphql/contacts.sdl.{js,ts}` and you'll see the same Query and Mutation types defined for Contact that were created for the Post scaffold. `Contact`, `CreateContactInput` and `UpdateContactInput` types, as well as a `Query` type with `contacts` and `contact`, and a `Mutation` type with `createContact`, `updateContact` and `deleteContact`.

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="api/src/graphql/contacts.sdl.js"
export const schema = gql`
  type Contact {
    id: Int!
    name: String!
    email: String!
    message: String!
    createdAt: DateTime!
  }

  type Query {
    contacts: [Contact!]! @requireAuth
    contact(id: Int!): Contact @requireAuth
  }

  input CreateContactInput {
    name: String!
    email: String!
    message: String!
  }

  input UpdateContactInput {
    name: String
    email: String
    message: String
  }

  type Mutation {
    createContact(input: CreateContactInput!): Contact! @requireAuth
    updateContact(id: Int!, input: UpdateContactInput!): Contact! @requireAuth
    deleteContact(id: Int!): Contact! @requireAuth
  }
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="api/src/graphql/contacts.sdl.ts"
export const schema = gql`
  type Contact {
    id: Int!
    name: String!
    email: String!
    message: String!
    createdAt: DateTime!
  }

  type Query {
    contacts: [Contact!]! @requireAuth
    contact(id: Int!): Contact @requireAuth
  }

  input CreateContactInput {
    name: String!
    email: String!
    message: String!
  }

  input UpdateContactInput {
    name: String
    email: String
    message: String
  }

  type Mutation {
    createContact(input: CreateContactInput!): Contact! @requireAuth
    updateContact(id: Int!, input: UpdateContactInput!): Contact! @requireAuth
    deleteContact(id: Int!): Contact! @requireAuth
  }
`
```

</TabItem>
</Tabs>

The `@requireAuth` string you see after the `Query` and `Mutation` types is a [schema directive](https://www.graphql-tools.com/docs/schema-directives) which says that in order to access this GraphQL query the user is required to be authenticated. We haven't added authentication yet, so this won't have any effect—anyone will be able to query it, logged in or not, because until you add authentication the function behind `@requireAuth` always returns `true`.

What's `CreateContactInput` and `UpdateContactInput`? Redwood follows the GraphQL recommendation of using [Input Types](https://graphql.org/graphql-js/mutations-and-input-types/) in mutations rather than listing out each and every field that can be set. Any fields required in `schema.prisma` are also required in `CreateContactInput` (you can't create a valid record without them) but nothing is explicitly required in `UpdateContactInput`. This is because you could want to update only a single field, or two fields, or all fields. The alternative would be to create separate Input types for every permutation of fields you would want to update. We felt that only having one update input type was a good compromise for optimal developer experience.

:::info

Redwood assumes your code won't try to set a value on any field named `id` or `createdAt` so it left those out of the Input types, but if your database allowed either of those to be set manually you can update `CreateContactInput` or `UpdateContactInput` and add them.

:::

Since all of the DB columns were required in the `schema.prisma` file they are marked as required in the GraphQL Types with the `!` suffix on the datatype (e.g. `name: String!`).

:::tip

GraphQL's SDL syntax requires an extra `!` when a field _is_ required. Remember: `schema.prisma` syntax requires an extra `?` character when a field is _not_ required.

:::

As described in [Side Quest: How Redwood Deals with Data](../chapter2/side-quest.md), there are no explicit resolvers defined in the SDL file. Redwood follows a simple naming convention: each field listed in the `Query` and `Mutation` types in the `sdl` file (`api/src/graphql/contacts.sdl.{js,ts}`) maps to a function with the same name in the `services` file (`api/src/services/contacts/contacts.{js,ts}`).

:::tip

_Psssstttt_ I'll let you in on a little secret: if you just need a simple read-only SDL, you can skip creating the create/update/delete mutations by passing a flag to the SDL generator like so:

`yarn rw g sdl Contact --no-crud`

You'd only get a single `contacts` type to return them all.

:::

We'll only need `createContact` for our contact page. It accepts a single variable, `input`, that is an object that conforms to what we expect for a `CreateContactInput`, namely `{ name, email, message }`. This mutation should be able to be accessed by anyone, so we'll need to change `@requireAuth` to `@skipAuth`. This one says that authentication is _not_ required and will allow anyone to anonymously send us a message. Note that having at least one schema directive is required for each `Query` and `Mutation` or you'll get an error: Redwood embraces the idea of "secure by default" meaning that we try and keep your application safe, even if you do nothing special to prevent access. In this case it's much safer to throw an error than to accidentally expose all of your users' data to the internet!

:::info

Serendipitously, the default schema directive of `@requireAuth` is exactly what we want for the `contacts` query that returns ALL contacts—only we, the owners of the blog, should have access to read them all.

:::

We're not going to let anyone update or delete a message, so we can remove those fields completely. Here's what the SDL file looks like after the changes:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```graphql title="api/src/graphql/contacts.sdl.js"
export const schema = gql`
  type Contact {
    id: Int!
    name: String!
    email: String!
    message: String!
    createdAt: DateTime!
  }

  type Query {
    contacts: [Contact!]! @requireAuth
    contact(id: Int!): Contact @requireAuth
  }

  input CreateContactInput {
    name: String!
    email: String!
    message: String!
  }

  // highlight-start
  type Mutation {
    createContact(input: CreateContactInput!): Contact! @skipAuth
  }
  // highlight-end
`
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```graphql title="api/src/graphql/contacts.sdl.ts"
export const schema = gql`
  type Contact {
    id: Int!
    name: String!
    email: String!
    message: String!
    createdAt: DateTime!
  }

  type Query {
    contacts: [Contact!]! @requireAuth
    contact(id: Int!): Contact @requireAuth
  }

  input CreateContactInput {
    name: String!
    email: String!
    message: String!
  }

  // highlight-start
  type Mutation {
    createContact(input: CreateContactInput!): Contact! @skipAuth
  }
  // highlight-end
`
```

</TabItem>
</Tabs>

That's it for the SDL file, let's take a look at the service:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js title="api/src/services/contacts/contacts.js"
import { db } from 'src/lib/db'

export const contacts = () => {
  return db.contact.findMany()
}

export const contact = ({ id }) => {
  return db.contact.findUnique({
    where: { id },
  })
}

export const createContact = ({ input }) => {
  return db.contact.create({
    data: input,
  })
}

export const updateContact = ({ id, input }) => {
  return db.contact.update({
    data: input,
    where: { id },
  })
}

export const deleteContact = ({ id }) => {
  return db.contact.delete({
    where: { id },
  })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```js title="api/src/services/contacts/contacts.ts"
import type { QueryResolvers, MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const contacts: QueryResolvers['contacts'] = () => {
  return db.contact.findMany()
}

export const contact: QueryResolvers['contact'] = ({ id }) => {
  return db.contact.findUnique({
    where: { id },
  })
}

export const createContact: MutationResolvers['createContact'] = ({ input }) => {
  return db.contact.create({
    data: input,
  })
}

export const updateContact: MutationResolvers['updateContact'] = ({ id, input }) => {
  return db.contact.update({
    data: input,
    where: { id },
  })
}

export const deleteContact: MutationResolvers['deleteContact'] = ({ id }) => {
  return db.contact.delete({
    where: { id },
  })
}
```

</TabItem>
</Tabs>

Pretty simple. You can see here how the `createContact()` function expects the `input` argument and just passes that on to Prisma in the `create()` call.

You can delete `updateContact` and `deleteContact` here if you want, but since there's no longer an accessible GraphQL field for them they can't be used by the client anyway.

Before we plug this into the UI, let's take a look at a nifty GUI you get just by running `yarn redwood dev`.

### GraphQL Playground

Often it's nice to experiment and call your API in a more "raw" form before you get too far down the path of implementation only to find out something is missing. Is there a typo in the API layer or the web layer? Let's find out by accessing just the API layer.

When you started development with `yarn redwood dev` (or `yarn rw dev`) you actually started a second process running at the same time. Open a new browser tab and head to [http://localhost:8911/graphql](http://localhost:8911/graphql) This is GraphQL Yoga's [GraphiQL](https://www.graphql-yoga.com/docs/features/graphiql), a web-based GUI for GraphQL APIs:

<img width="1410" alt="image" src="https://user-images.githubusercontent.com/22184161/226866579-896e8edc-4ac0-48bd-80f0-2ba28da677b5.png" />

Not very exciting yet, but select the "Docs" tab on the top left and click on `query: Query`.

<img width="1410" alt="image" src="https://user-images.githubusercontent.com/22184161/226866573-41697d10-a056-4e3a-add3-b940147de802.png" />

It's the complete schema as defined by our SDL files! The Playground will ingest these definitions and give you autocomplete hints on the left to help you build queries from scratch. Try getting the IDs of all the posts in the database; type the query at the left and then click the "Play" button to execute:

<img width="1410" alt="image" src="https://user-images.githubusercontent.com/22184161/226866554-3daefe7f-7b4d-4503-aaa0-9895ee5bd38e.png" />

The GraphQL Playground is a great way to experiment with your API or troubleshoot when you come across a query or mutation that isn't behaving in the way you expect.

### Creating a Contact

Our GraphQL mutation is ready to go on the backend so all that's left is to invoke it on the frontend. Everything related to our form is in `ContactPage` so that's where we'll put the mutation call. First we define the mutation as a constant that we call later (this can be defined outside of the component itself, right after the `import` statements):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

// highlight-start
const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`
// highlight-end

const ContactPage = () => {
  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
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
  Label,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

// highlight-start
const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`
// highlight-end

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

      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
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

We reference the `createContact` mutation we defined in the Contacts SDL passing it an `input` object which will contain the actual name, email and message values.

Next we'll call the `useMutation` hook provided by Redwood which will allow us to execute the mutation when we're ready (don't forget to `import` it):

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
// highlight-next-line
import { Metadata, useMutation } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

const ContactPage = () => {
  // highlight-next-line
  const [create] = useMutation(CREATE_CONTACT)

  const onSubmit = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
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
// highlight-next-line
import { Metadata, useMutation } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

// highlight-start
import {
  CreateContactMutation,
  CreateContactMutationVariables,
} from 'types/graphql'
// highlight-end

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  // highlight-start
  const [create] = useMutation<
    CreateContactMutation,
    CreateContactMutationVariables
  >(CREATE_CONTACT)
  // highlight-end

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data)
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
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

<ShowForTs>

:::tip Reminder about generated types

Just a quick reminder that Redwood will automatically generate types for your GraphQL queries and mutations if you have the dev server running (or if you run `yarn rw generate types`).

Once you define the `CreateContactMutation` (the GraphQL one), Redwood will generate the `CreateContactMutation` and `CreateContactMutationVariables` types from it for you.

Take a look at our [Generated Types](typescript/generated-types.md) docs for a deeper dive!

:::

</ShowForTs>

`create` is a function that invokes the mutation and takes an object with a `variables` key, containing another object with an `input` key. As an example, we could call it like:

```js
create({
  variables: {
    input: {
      name: 'Rob',
      email: 'rob@redwoodjs.com',
      message: 'I love Redwood!',
    },
  },
})
```

If you'll recall `<Form>` gives us all of the fields in a nice object where the key is the name of the field, which means the `data` object we're receiving in `onSubmit` is already in the proper format that we need for the `input`!

That means we can update the `onSubmit` function to invoke the mutation with the data it receives:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata, useMutation } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

const ContactPage = () => {
  const [create] = useMutation(CREATE_CONTACT)

  const onSubmit = (data) => {
    // highlight-next-line
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
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
import { Metadata, useMutation } from '@redwoodjs/web'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

import {
  CreateContactMutation,
  CreateContactMutationVariables,
} from 'types/graphql'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const [create] = useMutation<
    CreateContactMutation,
    CreateContactMutationVariables
  >(CREATE_CONTACT)

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    // highlight-next-line
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
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

Try filling out the form and submitting—you should have a new Contact in the database! You can verify that with [Prisma Studio](/docs/tutorial/chapter2/getting-dynamic#prisma-studio) or [GraphQL Playground](#graphql-playground) if you were so inclined:

<img width="1410" alt="image" src="https://user-images.githubusercontent.com/32992335/161488540-a7ad1a57-7432-4171-bd75-500eeaa17bcb.png" />

:::info Wait, I thought you said this was secure by default and someone couldn't view all contacts without being logged in?

Remember: we haven't added authentication yet, so the concept of someone being logged in is meaningless right now. In order to prevent frustrating errors in a new application, the `@requireAuth` directive simply returns `true` until you setup an authentication system. At that point the directive will use real logic for determining if the user is logged in or not and behave accordingly.

:::

### Improving the Contact Form

Our contact form works but it has a couple of issues at the moment:

- Clicking the submit button multiple times will result in multiple submits
- The user has no idea if their submission was successful
- If an error was to occur on the server, we have no way of notifying the user

Let's address these issues.

#### Disable Save on Loading

The `useMutation` hook returns a couple more elements along with the function to invoke it. We can destructure these as the second element in the array that's returned. The two we care about are `loading` and `error`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
// ...

const ContactPage = () => {
  // highlight-next-line
  const [create, { loading, error }] = useMutation(CREATE_CONTACT)

  const onSubmit = (data) => {
    create({ variables: { input: data } })
  }

  return (...)
}

// ...
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
// ...

const ContactPage = () => {
  // highlight-next-line
  const [create, { loading, error }] = useMutation<
    CreateContactMutation,
    CreateContactMutationVariables
  >(CREATE_CONTACT)

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    create({ variables: { input: data } })
  }

  return (...)
}

// ...
```

</TabItem>
</Tabs>

Now we know if the database call is still in progress by looking at `loading`. An easy fix for our multiple submit issue would be to disable the submit button if the response is still in progress. We can set the `disabled` attribute on the "Save" button to the value of `loading`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
return (
  // ...
  // highlight-next-line
  <Submit disabled={loading}>Save</Submit>
  // ...
)
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
return (
  // ...
  // highlight-next-line
  <Submit disabled={loading}>Save</Submit>
  // ...
)
```

</TabItem>
</Tabs>

It may be hard to see a difference in development because the submit is so fast, but you could enable network throttling via the Network tab Chrome's Web Inspector to simulate a slow connection:

<img src="https://user-images.githubusercontent.com/300/71037869-6dc56f80-20d5-11ea-8b26-3dadb8a1ed86.png" />

You'll see that the "Save" button become disabled for a second or two while waiting for the response.

#### Notification on Save

Next, let's show a notification to let the user know their submission was successful. Redwood includes [react-hot-toast](https://react-hot-toast.com/) to quickly show a popup notification on a page.

`useMutation` accepts an options object as a second argument. One of the options is a callback function, `onCompleted`, that will be invoked when the mutation successfully completes. We'll use that callback to invoke a `toast()` function which will add a message to be displayed in a **&lt;Toaster&gt;** component.

Add the `onCompleted` callback to `useMutation` and include the **&lt;Toaster&gt;** component in our `return`, just before the **&lt;Form&gt;**:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata, useMutation } from '@redwoodjs/web'
// highlight-next-line
import { toast, Toaster } from '@redwoodjs/web/toast'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

const ContactPage = () => {
  // highlight-start
  const [create, { loading, error }] = useMutation(CREATE_CONTACT, {
    onCompleted: () => {
      toast.success('Thank you for your submission!')
    },
  })
  // highlight-end

  const onSubmit = (data) => {
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      // highlight-next-line
      <Toaster />
      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit disabled={loading}>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata, useMutation } from '@redwoodjs/web'
// highlight-next-line
import { toast, Toaster } from '@redwoodjs/web/toast'
import {
  FieldError,
  Form,
  Label,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

import {
  CreateContactMutation,
  CreateContactMutationVariables,
} from 'types/graphql'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  // highlight-start
  const [create, { loading, error }] = useMutation<
    CreateContactMutation,
    CreateContactMutationVariables
  >(CREATE_CONTACT, {
    onCompleted: () => {
      toast.success('Thank you for your submission!')
    },
  })
  // highlight-end

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />
      // highlight-next-line
      <Toaster />
      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }}>
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit disabled={loading}>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

![Toast notification on successful submission](https://user-images.githubusercontent.com/300/146271487-f6b77e76-99c1-43e8-bcda-5ba3c9b03137.png)

You can read the full documentation for Toast [here](../../toast-notifications.md).

### Displaying Server Errors

Next we'll inform the user of any server errors. So far we've only notified the user of _client_ errors: a field was missing or formatted incorrectly. But if we have server-side constraints in place `<Form>` can't know about those, but we still need to let the user know something went wrong.

We have email validation on the client, but any developer worth their silicon knows [never trust the client](https://www.codebyamir.com/blog/never-trust-data-from-the-browser). Let's add the email validation into the api side as well to be sure no bad data gets into our database, even if someone somehow bypassed our client-side validation (l33t hackers do this all the time).

:::info No server-side validation for some fields?

Why don't we need server-side validation for the existence of name, email and message? Because GraphQL is already doing that for us! You may remember the `String!` declaration in our SDL file for the `Contact` type: that adds a constraint that those fields cannot be `null` as soon as it arrives on the api side. If it is, GraphQL would reject the request and throw an error back to us on the client.

However, if you start using one service from within another, there would be no validation! GraphQL is only involved if an "outside" party is making a request (like a browser). If you really want to make sure that a field is present or formatted correctly, you'll need to add validation inside the Service itself. Then, no matter who is calling that service function (GraphQL or another Service) your data is guaranteed to be checked.

We do have an additional layer of validation for free: because name, email and message were set as required in our `schema.prisma` file, the database itself will prevent any `null`s from being recorded. It's usually recommended to not rely solely on the database for input validation: what format your data should be in is a concern of your business logic, and in a Redwood app the business logic lives in the Services!

:::

We talked about business logic belonging in our services files and this is a perfect example. And since validating inputs is such a common requirement, Redwood once again makes our lives easier with [Service Validations](../../services.md#service-validations).

We'll make a call to a new `validate` function to our `contacts` service, which will do the work of making sure that the `email` field is actually formatted like an email address:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js title="api/src/services/contacts/contacts.js"
// highlight-next-line
import { validate } from '@redwoodjs/api'

// ...

export const createContact = ({ input }) => {
  // highlight-next-line
  validate(input.email, 'email', { email: true })
  return db.contact.create({ data: input })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts title="api/src/services/contacts/contacts.ts"
import type { QueryResolvers, MutationResolvers } from 'types/graphql'

// highlight-next-line
import { validate } from '@redwoodjs/api'

// ...

export const createContact: MutationResolvers['createContact'] = ({
  input,
}) => {
  // highlight-next-line
  validate(input.email, 'email', { email: true })
  return db.contact.create({ data: input })
}
```

</TabItem>
</Tabs>

That's a lot of references to `email` so let's break them down:

1. The first argument is the value that we want to check. In this case `input` contains all our contact data and the value of `email` is the one we want to check
2. The second argument is the `name` prop from the `<TextField>`, so that we know which input field on the page has an error
3. The third argument is an object containing the **validation directives** we want to invoke. In this case it's just one, and `email: true` means we want to use the built-in email validator

So when `createContact` is called it will first validate the inputs and only if no errors are thrown will it continue to actually create the record in the database.

Right now we won't even be able to test our validation on the server because we're already checking that the input is formatted like an email address with the `validation` prop in `<TextField>`. Let's temporarily remove it so that the bad data will be sent up to the server:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```diff title="web/src/pages/ContactPage/ContactPage.jsx"
 <TextField
   name="email"
   validation={{
     required: true,
-    pattern: {
-      value: /^[^@]+@[^.]+\..+$/,
-      message: 'Please enter a valid email address',
-    },
   }}
   errorClassName="error"
 />
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```diff title="web/src/pages/ContactPage/ContactPage.tsx"
 <TextField
   name="email"
   validation={{
     required: true,
-    pattern: {
-      value: /^[^@]+@[^.]+\..+$/,
-      message: 'Please enter a valid email address',
-    },
   }}
   errorClassName="error"
 />
```

</TabItem>
</Tabs>

Remember when we said that `<Form>` had one more trick up its sleeve? Here it comes!

Add a `<FormError>` component, passing the `error` constant we got from `useMutation` and a little bit of styling to `wrapperStyle` (don't forget the `import`). We'll also pass `error` to `<Form>` so it can setup a context:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata, useMutation } from '@redwoodjs/web'
import { toast, Toaster } from '@redwoodjs/web/toast'
import {
  FieldError,
  Form,
  // highlight-next-line
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
} from '@redwoodjs/forms'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

const ContactPage = () => {
  const [create, { loading, error }] = useMutation(CREATE_CONTACT, {
    onCompleted: () => {
      toast.success('Thank you for your submission!')
    },
  })

  const onSubmit = (data) => {
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Toaster />
      // highlight-start
      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }} error={error}>
        <FormError error={error} wrapperClassName="form-error" />
        // highlight-end

        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit disabled={loading}>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata, useMutation } from '@redwoodjs/web'
import { toast, Toaster } from '@redwoodjs/web/toast'
import {
  FieldError,
  Form,
  // highlight-next-line
  FormError,
  Label,
  TextField,
  TextAreaField,
  Submit,
  SubmitHandler,
} from '@redwoodjs/forms'

import {
  CreateContactMutation,
  CreateContactMutationVariables,
} from 'types/graphql'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const [create, { loading, error }] = useMutation<
    CreateContactMutation,
    CreateContactMutationVariables
  >(CREATE_CONTACT, {
    onCompleted: () => {
      toast.success('Thank you for your submission!')
    },
  })

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />
      <Toaster />
      // highlight-start
      <Form onSubmit={onSubmit} config={{ mode: 'onBlur' }} error={error}>
        <FormError error={error} wrapperClassName="form-error" />
        // highlight-end
        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />
        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />
        <Label name="message" errorClassName="error">
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />
        <Submit disabled={loading}>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

Now submit a message with an invalid email address:

![Email error from the server side](https://user-images.githubusercontent.com/300/158897801-8a3f7ae8-6e67-4fc0-b828-3095c264507e.png)

We get that error message at the top saying something went wrong in plain English _and_ the actual field is highlighted for us, just like the inline validation! The message at the top may be overkill for such a short form, but it can be key if a form is multiple screens long; the user gets a summary of what went wrong all in one place and they don't have to resort to hunting through a long form looking for red boxes. You don't _have_ to use that message box at the top, though; just remove `<FormError>` and the field will still be highlighted as expected.

:::info

`<FormError>` has several styling options which are attached to different parts of the message:

- `wrapperStyle` / `wrapperClassName`: the container for the entire message
- `titleStyle` / `titleClassName`: the "Errors prevented this form..." title
- `listStyle` / `listClassName`: the `<ul>` that contains the list of errors
- `listItemStyle` / `listItemClassName`: each individual `<li>` around each error

:::

This just scratches the surface of what Service Validations can do. You can perform more complex validations, including combining multiple directives in a single call. What if we had a model representing a `Car`, and users could submit them to us for sale on our exclusive car shopping site. How do we make sure we only get the cream of the crop of motorized vehicles? Service validations would allow us to be very particular about the values someone would be allowed to submit, all without any custom checks, just built-in `validate()` calls:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js
export const createCar = ({ input }) => {
  validate(input.make, 'make', {
    inclusion: ['Audi', 'BMW', 'Ferrari', 'Lexus', 'Tesla'],
  })
  validate(input.color, 'color', {
    exclusion: { in: ['Beige', 'Mauve'], message: 'No one wants that color' },
  })
  validate(input.hasDamage, 'hasDamage', {
    absence: true,
  })
  validate(input.vin, 'vin', {
    format: /[A-Z0-9]+/,
    length: { equal: 17 },
  })
  validate(input.odometer, 'odometer', {
    numericality: { positive: true, lessThanOrEqual: 10000 },
  })

  return db.car.create({ data: input })
}
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```ts
export const createCar = ({ input }: Car) => {
  validate(input.make, 'make', {
    inclusion: ['Audi', 'BMW', 'Ferrari', 'Lexus', 'Tesla'],
  })
  validate(input.color, 'color', {
    exclusion: { in: ['Beige', 'Mauve'], message: 'No one wants that color' },
  })
  validate(input.hasDamage, 'hasDamage', {
    absence: true,
  })
  validate(input.vin, 'vin', {
    format: /[A-Z0-9]+/,
    length: { equal: 17 },
  })
  validate(input.odometer, 'odometer', {
    numericality: { positive: true, lessThanOrEqual: 10000 },
  })

  return db.car.create({ data: input })
}
```

</TabItem>
</Tabs>

You can still include your own custom validation logic and have the errors handled in the same manner as the built-in validations:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```js
validateWith(() => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  if (input.lastCarWashDate < oneWeekAgo) {
    throw new Error("We don't accept dirty cars")
  }
})
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```js
validateWith(() => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  if (input.lastCarWashDate < oneWeekAgo) {
    throw new Error("We don't accept dirty cars")
  }
})
```

</TabItem>
</Tabs>

Now you can be sure you won't be getting some old jalopy!

### One more thing...

Since we're not redirecting after the form submits, we should at least clear out the form fields. This requires we get access to a `reset()` function that's part of [React Hook Form](https://react-hook-form.com/), but we don't have access to it with the basic usage of `<Form>` (like we're currently using).

Redwood includes a hook called `useForm()` (from React Hook Form) which is normally called for us within `<Form>`. In order to reset the form we need to invoke that hook ourselves. But the functionality that `useForm()` provides still needs to be used in `Form`. Here's how we do that.

First we'll import `useForm`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import {
  FieldError,
  Form,
  FormError,
  Label,
  Submit,
  TextAreaField,
  TextField,
  // highlight-next-line
  useForm,
} from '@redwoodjs/forms'
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import {
  FieldError,
  Form,
  FormError,
  Label,
  Submit,
  TextAreaField,
  TextField,
  // highlight-next-line
  useForm,
} from '@redwoodjs/forms'
```

</TabItem>
</Tabs>

And now call it inside of our component:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
const ContactPage = () => {
  // highlight-next-line
  const formMethods = useForm()
  //...
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```jsx title="web/src/pages/ContactPage/ContactPage.tsx"
const ContactPage = () => {
  // highlight-next-line
  const formMethods = useForm()
  //...
```

</TabItem>
</Tabs>

Finally we'll tell `<Form>` to use the `formMethods` we just got from `useForm()` instead of doing it itself:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
return (
  <>
    <Toaster />
    <Form
      onSubmit={onSubmit}
      config={{ mode: 'onBlur' }}
      error={error}
      // highlight-next-line
      formMethods={formMethods}
    >
    // ...
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
return (
  <>
    <Toaster />
    <Form
      onSubmit={onSubmit}
      config={{ mode: 'onBlur' }}
      error={error}
      // highlight-next-line
      formMethods={formMethods}
    >
    // ...
```

</TabItem>
</Tabs>

Now we can call `reset()` on `formMethods` after we call `toast()`:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
// ...

const [create, { loading, error }] = useMutation(CREATE_CONTACT, {
  onCompleted: () => {
    toast.success('Thank you for your submission!')
    // highlight-next-line
    formMethods.reset()
  },
})

// ...
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
// ...

const [create, { loading, error }] = useMutation<
  CreateContactMutation,
  CreateContactMutationVariables
>(CREATE_CONTACT, {
  onCompleted: () => {
    toast.success('Thank you for your submission!')
    // highlight-next-line
    formMethods.reset()
  },
})

// ...
```

</TabItem>
</Tabs>

:::warning

You can put the email validation back into the `<TextField>` now, but you should leave the server validation in place, just in case.

:::

Here's the entire page:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
import { Metadata, useMutation } from '@redwoodjs/web'
import { toast, Toaster } from '@redwoodjs/web/toast'
import {
  FieldError,
  Form,
  FormError,
  Label,
  Submit,
  TextAreaField,
  TextField,
  useForm,
} from '@redwoodjs/forms'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

const ContactPage = () => {
  const formMethods = useForm()

  const [create, { loading, error }] = useMutation(CREATE_CONTACT, {
    onCompleted: () => {
      toast.success('Thank you for your submission!')
      formMethods.reset()
    },
  })

  const onSubmit = (data) => {
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Toaster />
      <Form
        onSubmit={onSubmit}
        config={{ mode: 'onBlur' }}
        error={error}
        formMethods={formMethods}
      >
        <FormError error={error} wrapperClassName="form-error" />

        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit disabled={loading}>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
import { Metadata, useMutation } from '@redwoodjs/web'
import { toast, Toaster } from '@redwoodjs/web/toast'
import {
  FieldError,
  Form,
  FormError,
  Label,
  Submit,
  SubmitHandler,
  TextAreaField,
  TextField,
  useForm,
} from '@redwoodjs/forms'

import {
  CreateContactMutation,
  CreateContactMutationVariables,
} from 'types/graphql'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: CreateContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

interface FormValues {
  name: string
  email: string
  message: string
}

const ContactPage = () => {
  const formMethods = useForm()

  const [create, { loading, error }] = useMutation<
    CreateContactMutation,
    CreateContactMutationVariables
  >(CREATE_CONTACT, {
    onCompleted: () => {
      toast.success('Thank you for your submission!')
      formMethods.reset()
    },
  })

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    create({ variables: { input: data } })
  }

  return (
    <>
      <Metadata title="Contact" description="Contact page" />

      <Toaster />
      <Form
        onSubmit={onSubmit}
        config={{ mode: 'onBlur' }}
        error={error}
        formMethods={formMethods}
      >
        <FormError error={error} wrapperClassName="form-error" />

        <Label name="name" errorClassName="error">
          Name
        </Label>
        <TextField
          name="name"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="name" className="error" />

        <Label name="email" errorClassName="error">
          Email
        </Label>
        <TextField
          name="email"
          validation={{
            required: true,
            pattern: {
              value: /^[^@]+@[^.]+\..+$/,
              message: 'Please enter a valid email address',
            },
          }}
          errorClassName="error"
        />
        <FieldError name="email" className="error" />

        <Label name="message" errorClassName="error">
          Message
        </Label>
        <TextAreaField
          name="message"
          validation={{ required: true }}
          errorClassName="error"
        />
        <FieldError name="message" className="error" />

        <Submit disabled={loading}>Save</Submit>
      </Form>
    </>
  )
}

export default ContactPage
```

</TabItem>
</Tabs>

That's it! [React Hook Form](https://react-hook-form.com/) provides a bunch of [functionality](https://react-hook-form.com/docs) that `<Form>` doesn't expose. When you want to get to that functionality you can call `useForm()` yourself, but make sure to pass the returned object (we called it `formMethods`) as a prop to `<Form>` so that the validation and other functionality keeps working.

:::info

You may have noticed that the onBlur form config stopped working once you started calling `useForm()` yourself. That's because Redwood calls `useForm()` behind the scenes and automatically passes it the `config` prop that you gave to `<Form>`. Redwood is no longer calling `useForm()` for you so if you need some options passed you need to do it manually:

<Tabs groupId="js-ts">
<TabItem value="js" label="JavaScript">

```jsx title="web/src/pages/ContactPage/ContactPage.jsx"
const ContactPage = () => {
  const formMethods = useForm({ mode: 'onBlur' })
  //...
```

</TabItem>
<TabItem value="ts" label="TypeScript">

```tsx title="web/src/pages/ContactPage/ContactPage.tsx"
const ContactPage = () => {
  const formMethods = useForm({ mode: 'onBlur' })
  //...
```

</TabItem>
</Tabs>

:::

The public site is looking pretty good. How about the administrative features that let us create and edit posts? We should move them to some kind of admin section and put them behind a login so that random users poking around at URLs can't create ads for discount pharmaceuticals.
