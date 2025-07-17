---
description: Put all your business logic in one place
---

# Services

Redwood aims to put all your business logic in one place—Services. These can be used by your GraphQL API or any other place in your backend code. Redwood does all the annoying stuff for you, just write your business logic!

## Overview

What do we mean by "business logic?" [One definition](https://www.investopedia.com/terms/b/businesslogic.asp) states: "Business logic is the custom rules or algorithms that handle the exchange of information between a database and user interface." In Redwood, those custom rules and algorithms go in Services. You can't put that logic in the client because it's open to the world and could be manipulated. Imagine having the code to determine a valid withdrawal or deposit to someone's bank balance living in the client, and the server just receives API calls of where to move the money, doing no additional verification of those numbers! Your bank would quickly go insolvent. As you'll hear many times throughout our docs, and your development career—never trust the client.

But how does the client get access to the output of these Services? By default, that's through GraphQL. GraphQL is an API, accessible to clients, that relies on getting data from "somewhere" before returning it. That somewhere is a function backed by what's known as a [**resolver**](https://graphql.org/learn/execution/) in GraphQL. And in Redwood, those resolvers are your Services!

```
┌───────────┐      ┌───────────┐      ┌───────────┐
│  Browser  │ ───> │  GraphQL  │ ───> │  Service  │
└───────────┘      └───────────┘      └───────────┘
```

Remember: Service are just functions. That means they can be used not only as GraphQL resolvers, but from other Services, or serverless functions, or anywhere else you invoke a function on the api side.

> **Can I use Service functions on the web side?**
>
> The short answer is no because our build process doesn't support it yet.
>
> Generally, in a full-stack application, Services will concern themselves with getting data in and out of a database. The libraries we use for this, like Prisma, do not run in the browser. However, even if it did, it would happily pass on whatever SQL-equivalent commands you give it, like `db.user.deleteMany()`, which would remove all user records! That kind of power in the hands of the client would wreak havoc the likes of which you have never seen.

Service functions can also call each other. For example, that theoretical Service function that handles transferring money between two accounts: it certainly comes in handy when a user initiates a transfer through a GraphQL call, but our business logic for what constitutes a transfer lives in that function. That function should be the only one responsible for moving money between two accounts, so we should make use of it anywhere we need to do a transfer—imagine an async task that moves $100 between a checking and savings account every 1st of the month.

```
┌───────────┐      ┌───────────┐
│  Service  │ ───> │  Service  │
└───────────┘      └───────────┘
```

Finally, Services can also be called from [serverless functions](serverless-functions.md). Confusingly, these are also called "functions", but are meant to be run in a serverless environment where the code only exists long enough to complete a task and is then shut down. Redwood loves serverless functions. In fact, your GraphQL endpoint is, itself, a serverless function! In Redwood, these go in `api/src/functions`. Serverless functions can make use of Services, rather than duplicating business logic inside of themselves. In our bank transfer example, a third party service could initiate a webhook call to one of our serverless functions saying that Alice just got paid. Our (serverless) function can then call our (Service) function to make the transfer from the third party to Alice.

```
┌───────────────────────┐      ┌───────────┐
│  Serverless Function  │ ───> │  Service  │
└───────────────────────┘      └───────────┘
```

## Service Validations

Redwood includes a feature we call Service Validations. These simplify an extremely common task: making sure that incoming data is formatted properly before continuing. These validations are meant to be included at the start of your Service function and will throw an error if conditions are not met:

```jsx
import {
  validate,
  validateWith,
  validateWithSync,
  validateUniqueness,
} from '@redwoodjs/api'

export const createUser = async ({ input }) => {
  validate(input.firstName, 'First name', {
    presence: true,
    exclusion: {
      in: ['Admin', 'Owner'],
      message: 'That name is reserved, sorry!',
    },
    length: { min: 2, max: 255 },
  })
  validateWithSync(() => {
    if (
      input.role === 'Manager' &&
      !context.currentUser.roles.includes('admin')
    ) {
      throw 'Only Admins can create new Managers'
    }
  })
  await validateWith(async () => {
    const inviteCount = await db.invites.count({
      where: { userId: currentUser.id },
    })
    if (inviteCount >= 10) {
      throw 'You have already invited your max of 10 users'
    }
  })

  return validateUniqueness('user', { username: input.username }, (db) => {
    return db.user.create({ data: input })
  })
}
```

> **What's the difference between Service Validations and Validator Directives?**
>
> [Validator Directives](directives.md#validators) were added to Redwood in v0.37 and provide a way to validate whether data going through GraphQL is allowed based on the user that's currently requesting it (the user that is logged in). These directives control _access_ to data, while Service Validators operate on a different level, outside of GraphQL, and make sure data is formatted properly before, most commonly, putting it into a database.
>
> You could use these in combination to, for example, prevent a client from accessing the email addresses of any users that aren't themselves (Validator Directives) while also verifying that when creating a user, an email address is present, formatted correctly, and unique (Service Validations).

### Displaying to the User

If you're using [Redwood's scaffolds](cli-commands.md#generate-scaffold) then you'll see requisite error messages when trying to save a form that runs into these validation errors automatically:

![image](https://user-images.githubusercontent.com/300/138919184-89eddd9e-8ee7-4956-b7ed-ba8daaa0f6ea.png)

Otherwise you'll need to use the `error` property that you can [destructure](https://www.apollographql.com/docs/react/data/mutations/#executing-a-mutation) from `useMutation()` and display an element containing the error message (Redwood's [form helpers](/docs/forms) will do some of the heavy lifting for you for displaying the error):

```jsx {13,21}
import { Form, FormError, Label, TextField, Submit } from '@redwoodjs/forms'
import { useMutation } from '@redwoodjs/web'

const CREATE_CONTACT = gql`
  mutation CreateContactMutation($input: ContactInput!) {
    createContact(input: $input) {
      id
    }
  }
`

const ContactPage = () => {
  const [create, { loading, error }] = useMutation(CREATE_CONTACT)

  const onSubmit = (data) => {
    create({ variables: { input: data }})
  }

  return (
    <Form onSubmit={onSubmit}>
      <FormError error={error}>
      <Label name="email">Email Address</Label>
      <TextField name="email" />
      <Submit disabled={loading}>Save</Submit>
    </Form>
  )
}
```

### Importing

You'll import the three functions below from `@redwoodjs/api`:

```jsx
import { validate, validateWith, validateUniqueness } from '@redwoodjs/api'
```

### validate()

This is the main function to call when you have a piece of data to validate. There are two forms of this function call, one with 2 arguments and one with 3. The first argument is always the variable to validate and the last argument is an object with all the validations you want to run against the first argument. The (optional) second argument is the name of the field to be used in a default error message if you do not provide a custom one:

```jsx
// Two argument form: validate(value, validations)
validate(input.email, { email: { message: 'Please provide a valid email address' } })

// Three argument form: validate(value, name, validations)
validate(input.email, 'Email Address', { email: true }
```

All validations provide a generic error message if you do not specify one yourself (great for quickly getting your app working). In the three argument version, you provide the "name" of the field (in this case `'Email Address'`) and that will be used in the error message:

```
Email Address must be formatted like an email address
```

Using the two argument version will use your custom error message in the validations object properties:

```
Please provide a valid email address
```

#### Multiple Validations

You can provide multiple validations in the last argument object, some with custom messages and some without. If you include only _some_ custom messages, make sure to use the 3-argument version as the ones without custom messages will need a variable name to include their messages:

```jsx
validate(input.name, 'Name', {
  presence: true,
  exclusion: {
    in: ['Admin', 'Owner'],
    message: 'Sorry that name is reserved'
  },
  length: {
    min: 2,
    max: 255,
    message: 'Please provide a name at least two characters long, but no more than 255'
  },
  format: {
    pattern: /^[A-Za-z]+$/,
    message: 'Name can only contain letters'
  }
)
```

Note that the validations object properties often take two forms: a simple form without a custom message, and a nested object when you do need a custom message:

```jsx
{ email: true }
{ email: { message: 'Must provide an email' } }

{ exclusion: ['Admin', 'Owner'] }
{ exclusion: { in: ['Admin', 'Owner' ], message: 'That name is reserved' } }
```

This keeps the syntax as simple as possible when a custom message is not required. Details on the options for each validation are detailed below.

#### Absence

Requires that a field NOT be present, meaning it must be `null` or `undefined`.
Opposite of the [presence](#presence) validator.

```jsx
validate(input.value, 'Value', {
  absence: true,
})
```

##### Options

- `allowEmptyString` will count an empty string as being absent (that is, `null`, `undefined` and `""` will pass this validation)

```jsx
validate(input.honeypot, 'Honeypot', {
  absence: { allowEmptyString: true },
})
```

- `message`: a message to be shown if the validation fails

```jsx
validate(input.value, {
  absence: { message: 'Value must be absent' },
})
```

#### Acceptance

Requires that the passed value be `true`, or within an array of allowed values that will be considered "true".

```jsx
validate(input.terms, 'Terms of Service', {
  acceptance: true,
})
```

##### Options

- `in`: an array of values that, if any match, will pass the validation

```jsx
validate(input.terms, 'Terms of Service', {
  acceptance: { in: [true, 'true', 1, '1'] },
})
```

- `message`: a custom message if validation fails

```jsx
validate(input.terms, {
  acceptance: { message: 'Please accept the Terms of Service' },
})
```

#### Email

Requires that the value be formatted like an email address by comparing against a regular expression. The regex is extremely lax: `/^[^@\s]+@[^.\s]+\.[^\s]+$/` This says that the value:

- Must start with one or more characters that aren't a whitespace or literal `@`
- Followed by a `@`
- Followed by one or more characters that aren't a whitespace or literal `.`
- Followed by a `.`
- Ending with one or more characters that aren't whitespace

Since the [official email regex](http://www.ex-parrot.com/~pdw/Mail-RFC822-Address.html) is around 6,300 characters long, we though this one was good enough. If you have a different, preferred email validation regular expression, use the [format](#format) validation.

```jsx
validate(input.email, 'Email', {
  email: true,
})
```

##### Options

- `message`: a custom message if validation fails

```jsx
validate(input.email, {
  email: { message: 'Please provide a valid email address'
})
```

#### Exclusion

Requires that the given value _not_ equal to any in a list of given values. Opposite of the [inclusion](#inclusion) validation.

```jsx
validate(input.name, 'Name', {
  exclusion: ['Admin', 'Owner'],
})
```

##### Options

- `in`: the list of values that cannot be used
- `caseSensitive`: toggles case sensitivity; default: `true`

```jsx
validate(input.name, 'Name', {
  exclusion: { in: ['Admin', 'Owner'] },
})
```

- `message`: a custom error message if validation fails

```jsx
validate(input.name, {
  exclusion: {
    in: ['Admin', 'Owner'],
    message: 'That name is reserved, try another',
  },
})
```

#### Format

Requires that the value match a given regular expression.

```jsx
validate(input.usPhone, 'US Phone Number', {
  format: /^[0-9-]{10,12}$/,
})
```

##### Options

- `pattern`: the regular expression to use

```jsx
validate(input.usPhone, 'US Phone Number', {
  format: { pattern: /^[0-9-]{10,12}$/ },
})
```

- `message`: a custom error message if validation fails

```jsx
validate(input.usPhone, {
  format: {
    pattern: /^[0-9-]{10,12}$/,
    message: 'Can only contain numbers and dashes',
  },
})
```

#### Inclusion

Requires that the given value _is_ equal to one in a list of given values. Opposite of the [exclusion](#exclusion) validation.

```jsx
validate(input.role, 'Role', {
  inclusion: ['Guest', 'Member', 'Manager'],
})
```

##### Options

- `in`: the list of values that can be used
- `caseSensitive`: toggles case sensitivity; default: `true`

```jsx
validate(input.role, 'Role', {
  inclusion: { in: ['Guest', 'Member', 'Manager'] },
})
```

- `message`: a custom error message if validation fails

```jsx
validate(input.role, 'Role', {
  inclusion: {
    in: ['Guest', 'Member', 'Manager'],
    message: 'Please select a proper role',
  },
})
```

#### Length

Requires that the value meet one or more of a number of string length validations.

```jsx
validate(input.answer, 'Answer', {
  length: { min: 6, max: 200 },
})
```

##### Options

- `min`: must be at least this number of characters long

```jsx
validate(input.name, 'Name', {
  length: { min: 2 },
})
```

- `max`: must be no more than this number of characters long

```jsx
validate(input.company, 'Company', {
  length: { max: 255 },
})
```

- `equal`: must be exactly this number of characters long

```jsx
validate(input.pin, 'PIN', {
  length: { equal: 4 },
})
```

- `between`: convenience syntax for defining min and max as an array

```jsx
validate(input.title, 'Title', {
  length: { between: [2, 255] },
})
```

- `message`: a custom message if validation fails. Can use length options as string interpolations in the message itself, including `name` which is the name of the field provided in the second argument

```jsx
validate(input.title, 'Title', {
  length: {
    min: 2,
    max: 255,
    message: '${name} must be between ${min} and ${max} characters',
  },
})
```

> Note that you cannot use backticks to define the string here—that would cause the value(s) to be interpolated immediately, and `min` and `max` are not actually available yet. This must be a plain string using single or double quotes, but using the `${}` interpolation syntax inside.

#### Numericality

The awesomely-named Numericality Validation requires that the value passed meet one or more criteria that are all number related.

```jsx
validate(input.year, 'Year', {
  numericality: { greaterThan: 1900, lessThanOrEqual: 2021 },
})
```

##### Options

- `integer`: the number must be an integer

```jsx
validate(input.age, 'Age', {
  numericality: { integer: true },
})
```

- `lessThan`: the number must be less than the given value

```jsx
validate(input.temp, 'Temperature', {
  numericality: { lessThan: 100 },
})
```

- `lessThanOrEqual`: the number must be less than or equal to the given value

```jsx
validate(input.temp, 'Temperature', {
  numericality: { lessThanOrEqual: 100 },
})
```

- `greaterThan`: the number must be greater than the given value

```jsx
validate(input.temp, 'Temperature', {
  numericality: { greaterThan: 32 },
})
```

- `greaterThanOrEqual`: the number must be greater than or equal to the given number

```jsx
validate(input.temp, 'Temperature', {
  numericality: { greaterThanOrEqual: 32 },
})
```

- `equal`: the number must be equal to the given number

```jsx
validate(input.guess, 'Guess', {
  numericality: { equal: 6 },
})
```

- `otherThan`: the number must not be equal to the given number

```jsx
validate(input.floor, 'Floor', {
  numericality: { otherThan: 13 },
})
```

- `even`: the number must be even

```jsx
validate(input.skip, 'Skip', {
  numericality: { even: true },
})
```

- `odd`: the number must be odd

```jsx
validate(input.zenGarden, 'Zen Garden', {
  numericality: { odd: true },
})
```

- `positive`: the number must be positive (greater than 0)

```jsx
validate(input.balance, 'Balance', {
  numericality: { positive: true },
})
```

- `negative`: the number must be negative (less than 0)

```jsx
validate(input.debt, 'Debt', {
  numericality: { negative: true },
})
```

- `message`: a custom message if validation fails. Some options can be used in string interpolation: `lessThan`, `lessThanOrEqual`, `greaterThan`, `greaterThanOrEqual`, `equal`, and `otherThan`

```jsx
validate(input.floor, 'Floor', {
  numericality: {
    otherThan: 13,
    message: 'You cannot go to floor ${otherThan}',
  },
})
```

> Note that you cannot use backticks to define the string here—that would cause the value(s) to be interpolated immediately. This must be a plain string using single or double quotes, but using the `${}` interpolation syntax inside.

#### Presence

Requires that a field be present, meaning it must not be `null` or `undefined`.
Opposite of the [absence](#absence) validator.

```jsx
validate(input.value, 'Value', {
  presence: true,
})
```

##### Options

- `allowNull`: whether or not to allow `null` to be considered present (default is `false`)

```jsx
validate(input.value, 'Value', {
  presence: { allowNull: true },
})
// `null` passes
// `undefined` fails
// "" passes
```

- `allowUndefined`: whether or not to allow `undefined` to be considered present (default is `false`)

```jsx
validate(input.value, 'Value', {
  presence: { allowUndefined: true },
})
// `null` fails
// `undefined` passes
// "" passes
```

- `allowEmptyString`: whether or not to allow an empty string `""` to be considered present (default is `true`)

```jsx
validate(input.value, 'Value', {
  presence: { allowEmptyString: false },
})
// `null` fails
// `undefined` fails
// "" fails
```

- `message`: a message to be shown if the validation fails

```jsx
validate(input.lastName, {
  presence: { allowEmptyString: false, message: "Can't leave last name empty" },
})
```

#### Custom

Run a custom validation function passed as `with` which should either throw or return nothing.
If the function throws an error, the error message will be used as the message of the validation error associated with the field.

```jsx
validate(input.value, 'Value', {
  custom: {
    with: () => {
      if (isInvalid) {
        throw new Error('Value is invalid')
      }
    },
  },
})
```

##### Options

- `message`: a custom error message if validation fails

```jsx
validate(input.value, 'Value', {
  custom: {
    with: () => {
      if (isInvalid) {
        throw new Error('Value is invalid')
      }
    },
    message: 'Please specify a different value',
  },
})
```

### validateWithSync()

`validateWithSync()` is simply given a function to execute. This function should throw with a message if there is a problem, otherwise do nothing.

```jsx
validateWithSync(() => {
  if (input.name === 'Name') {
    throw "You'll have to be more creative than that"
  }
})

validateWithSync(() => {
  if (input.name === 'Name') {
    throw new Error("You'll have to be more creative than that")
  }
})
```

Either of these errors will be caught and re-thrown as a `ServiceValidationError` with your text as the `message` of the error (although technically you should always throw errors with `new Error()` like in the second example).

You could just write your own function and throw whatever you like, without using `validateWithSync()`. But, when accessing your Service function through GraphQL, that error would be swallowed and the user would simply see "Something went wrong" for security reasons: error messages could reveal source code or other sensitive information so most are hidden. Errors thrown by Service Validations are considered "safe" and allowed to be shown to the client.

### validateWith()

The same behavior as `validateWithSync()` but works with Promises. Remember to `await` the validation.

```jsx
await validateWith(async () => {
  if ((await db.products.count()) >= 100) {
    throw 'There can only be a maximum of 100 products in your store'
  }
})
```

### validateUniqueness()

This validation guarantees that the field(s) given in the first argument are unique in the database before executing the callback given in the last argument. If a record is found with the given fields then an error is thrown and the callback is not invoked.

The uniqueness guarantee is handled through Prisma's [transaction API](https://www.prisma.io/docs/concepts/components/prisma-client/transactions). Given this example validation:

```jsx
return validateUniqueness('user', { username: input.username }, (db) => {
  return db.user.create({ data: input })
})
```

It is functionally equivalent to:

```jsx
return await db.$transaction(async (db) => {
  if (await db.user.findFirst({ username: input.username })) {
    throw new ServiceValidationError('Username is not unique')
  } else {
    return db.user.create({ data: input })
  }
})
```

So `validateUniqueness()` first tries to find a record with the given fields, and if found raise an error, if not then executes the callback.

> **Why use this when the database can verify uniqueness with a UNIQUE INDEX database constraint?**
>
> You may be in a situation where you can't have a unique index (supporting a legacy schema, perhaps), but still want to make sure the data is unique before proceeding. There is also the belief that you shouldn't have to count on the database to validate your data—that's a core concern of your business logic, and your business logic should live in your Services in a Redwood app.
>
> Another issue is that the error raised by Prisma when a record validates a unique index is swallowed by GraphQL and so you can't report it to the user (there are still ways around this, but it involves catching and re-throwing a different error). The error raised by `validateUniqueness()` is already safe-listed and allowed to be sent to the browser.

#### Arguments

1. The name of the db table accessor that will be checked (what you would call on `db` in a normal Prisma call). If you'd call `db.user` then this value is `"user"`.
2. An object, containing the db fields/values to check for uniqueness, like `{ email: 'rob@redwoodjs.com' }`. Can also include additional options explained below that provide for a narrower scope for uniqueness requirements, and a way for the record to identify itself and not create a false positive for an existing record.
3. [Optional] An object with options. `message` - custom error message. `db` - custom instance of the PrismaClient to use
4. Callback to be invoked if record is found to be unique.

In its most basic usage, say you want to make sure that a user's email address is unique before creating the record. `input` is an object containing all the user fields to save to the database, including `email` which must be unique:

```jsx
const createUser = (input) => {
  return validateUniqueness('user', { email: input.email }, (db) => {
    return db.user.create({ data: input })
  })
}
```

You can provide a custom message if the validation failed with the optional third argument:

```jsx
const createUser = (input) => {
  return validateUniqueness(
    'user',
    { email: input.email },
    { message: 'Your email is already in use' },
    (db) => db.user.create({ data: input })
  )
}
```

You can provide the PrismaClient to be used for the transaction and callback.

```jsx
import { db } from 'src/lib/db'

const createUser = (input) => {
  return validateUniqueness('user', { email: input.email }, { db }, (db) =>
    db.user.create({ data: input })
  )
}
```

> If you are overwriting the DATABASE_URL in your `src/lib/db` instantiation of the PrismaClient, you need to use this option. If not provided, a vanilla `new PrismaClient()` is used to run the callback that will not respect any custom configurations not represented in your `prisma.schema`

Be sure that both your callback and the surrounding `validateUniqueness()` function are `return`ed or else your service function will have nothing to return to its consumers, like GraphQL.

##### $self

What about updating an existing record? In its default usage, an update with this same `validateUniqueness` check will fail because the existing record will be found in the database and so think the email address is already in use, even though its in use by itself! In this case, pass an extra `$self` prop to the list of fields containing a check on how to identify the record as itself:

```jsx
const updateUser = (id, input) => {
  return validateUniqueness('user', {
    email: input.email,
    $self: { id }
  }, (db) => db.user.create({ data: input })
}
```

Now the check for whether a record exists will exclude those records whose `id` is the same as this record's `id`.

##### $scope

Sometimes we may only want to check uniqueness against a subset of records, say only those owned by the same user. Two different users can create the same blog post with the same title, but a single user can't create two posts with the same title. If the `Post` table contains a foreign key to the user that created it, called `userId`, we can use that to **scope** the uniqueness check:

```jsx
const createPost = (input) => {
  return validateUniqueness(
    'post',
    {
      title: input.title,
      $scope: { userId: context.currentUser.id },
    },
    (db) => {
      return db.user.create({ data: input })
    }
  )
}
```

This makes sure that the user that's logged in and creating the post cannot reuse the same blog post title as one of their own posts.

## Caching

Redwood provides a simple [LRU cache](https://www.baeldung.com/java-lru-cache) for your services. With an LRU cache you never need to worry about manually expiring or updating cache items. You either read an existing item (if its **key** is found) or create a new cached item if it isn't. This means that over time the cache will get bigger and bigger until it hits a memory or disk usage limit, but you don't care: the cache software is responsible for removing the oldest/least used members to make more room. For many applications, its entire database resultset may fit in cache!

How does a cache work? At its simplest, a cache is just a big chunk of memory or disk that stores key/value pairs. A unique key is used to lookup a value—the value being what you wanted to cache. The trick with a cache is selecting a key that makes the data unique among all the other data being cached, but that it itself (the key) contains enough uniqueness that you can safely discard it when something in the computed value changes, and you want to save a new value instead. More on that in [Choosing a Good Key](#choosing-a-good-key) below.

Why use a cache? If you have an expensive or time-consuming process in your service that doesn't change on every request, this is a great candidate. For example, for a store front, you may want to show the most popular products. This may be computed by a combination of purchases, views, time spent on the product page, social media posts, or a whole host of additional information. Aggregating this data may take seconds or more, but the list of popular products probably doesn't change that often. There's no reason to make every user wait all that time just to see the same list of products. With service caching, just wrap this computation in the `cache()` function, and give it an expiration time of 24 hours, and now the result is returned in milliseconds for every user (except the first one in a 24 hour period, it has to be computed from scratch and then stored in the cache again). You can even remove this first user's wait by "warming" the cache: trigging the service function by a process you run on the server, rather than by a user's first visit, on a 24 hour schedule so that it's the one that ends up waiting for the results to be computed.

:::info What about GraphQL caching?

You could also cache data at the [GraphQL layer](https://community.redwoodjs.com/t/guide-power-of-graphql-caching/2624) which has some of the same benefits. Using Envelop plugins you can add a response cache _after_ your services (resolver functions in the context of GraphQL) run - with a global configuration.

However, by placing the cache one level "lower," at the service level, you get the benefit of caching even when one service calls another internally, or when a service is called via another serverless function, and finer grained control of what you're caching.

In our example above you could cache the GraphQL query for the most popular products. But if you had an internal admin function which was a different query, augmenting the popular products with additional information, you now need to cache that query as well. With service caching, that admin service function can call the same popular product function that's already cached and get the speed benefit automatically.

:::

### Clients

As of this writing, Redwood ships with clients for the two most popular cache backends: [Memcached](https://memcached.org/) and [Redis](https://redis.io/). Service caching wraps each of these in an adapter, which makes it easy to add more clients in the future. If you're interested in adding an adapter for your favorite cache client, [open a issue](https://github.com/redwoodjs/redwood/issues) and tell us about it! Instructions for getting started with the code are [below](#creating-your-own-client).

:::info

If you need to access functionality in your cache client that the `cache()` and `cacheFindMany()` functions do not handle, you can always get access to the underlying raw client library and use it however you want:

```javascript
import { cacheClient } from 'src/lib/cache'

export const updatePost = async ({ id, input }) => {
  const post = await db.post.update({
    data: input,
    where: { id },
  })
  // highlight-next-line
  await cacheClient.MSET(
    `post-${id}`,
    JSON.stringify(post),
    `blogpost-${id}`,
    JSON.stringify(post)
  )

  return post
}
```

:::

### What Can Be Cached

The service cache mechanism can only store strings, so whatever data you want to cache needs to be able to survive a round trip through `JSON.stringify()` and `JSON.parse()`. That means that if you have a real `Date` instance, you'd need to re-initialize it as a `Date`, because it's going to return from the cache as a string like `"2022-08-24T17:50:05.679Z"`.

A function will not survive being serialized as a string so those are right out.

Most Prisma datasets can be serialized just fine, as long as you're mindful of dates and things like BLOBs, which may contain binary data and could get mangled.

We have an [outstanding issue](https://github.com/redwoodjs/redwood/issues/6282) which will add support for caching instances of custom classes and getting them back out of the cache as that instance, rather than a generic object which you would normally get after a `JSON.stringify`!

### Expiration

You can set a number of seconds after which to automatically expire the key. After this time the call to `cache()` will set the key/value in the store again. See the function descriptions below for usage examples.

### Choosing a Good Key

As the old saying goes "there are only two hard problems in computer science: cache, and naming things." The reason cache is included in this list is, funnily enough, many times because of naming something—the key for the cache.

Consider a product that you want to cache. At first thought you may think "I'll use the name of the product as its key" and so your key is `led light strip`. One problem is that you must make absolutely sure that your product name is unique across your shop. This may not be a viable solution for your store: you could have two manufacturers with the same product name.

Okay, let's use the product's database ID as the key: `41443`. It's definitely going to be unique now, but what if you later add a cache for users? Could a user record in the database have that same ID? Probably, so now you may think you're retrieving a cached user, but you'll get the product instead.

What if we add a "type" into the cache key, so we know what type of thing we're caching: `product-41442`. Now we're getting somewhere. Users will have a cache key `user-41442` and the two won't clash. But what happens if you change some data about that product, like the description? Remember that we can only get an existing key/value, or create a key/value in the cache, we can't update an existing key. How we can encapsulate the "knowledge" that a product's data has changed into the cache key?

One solution would be to put all of the data that we care about changing into the key, like: `product-41442-${description}`. The problem here is that keys can only be so long (in Memcached it's 250 bytes). Another option could be to hash the entire product object and use that as the key (this can encompass the `product` part of the key as well as the ID itself, since _any_ data in the object being different will result in a new hash):

```js
import { md5 } from 'blueimp-md5'

cache(md5(JSON.stringify(product)), () => {
  // ...
})
```

This works, but it's the nicest to look at in the code, and computing a hash isn't free (it's fast, but not 0 seconds).

For this reason we always recommend that you add an `updatedAt` column to all of your models. This will automatically be set by Prisma to a timestamp whenever it updates that row in the database. This means we can count on this value being different whenever a record changes, regardless of what column actually changed. Now our key can look like `product-${id}-${updatedAt.getTime()}`. We use `getTime()` so that the timestamp is returned as a nice integer `1661464626032` rather than some string like `Thu Aug 25 2022 14:56:25 GMT-0700 (Pacific Daylight Time)`.

:::info

If you're using [Redwood Record](/docs/redwoodrecord) pretty soon you'll be able to cache a record by just passing the instance as the key, and it will automatically create the same key behind the scenes for you:

```js
cache(product, () => {
  // ...
})
```

:::

One drawback to this key is in potentially responding to _too many_ data changes, even ones we don't care about caching. Imagine that a product has a `views` field that tracks how many times it has been viewed in the browser. This number will be changing all the time, but if we don't display that count to the user then we're constantly re-creating the cache for the product even though no data the user will see is changing. There's no way to tell Prisma "set the `updatedAt` when the record changes, but not if the `views` column changes." This cache key is too variable. One solution would be to move the `views` column to another table with a `productId` pointing back to this record. Now the `product` is back to just containing data we care about caching.

What if you want to expire a cache regardless of whether the data itself has changed? Maybe you make a UI change where you now show a product's SKU on the page where you didn't before. You weren't previously selecting the `sku` field out of the database, and so it hasn't been cached. But now that you're showing it you'll need to add it the list of fields to return from the service. One solution would be forcibly update all of the `updatedAt` fields in the database. But a) Prisma won't easily let you do this since it think it controls that column, and b) every product is going to appear to have been edited at the same time, when in fact nothing changed—you just needed to bust the cache.

An easier solution to this problem would be to add some kind of version number to your cache key that you are in control of and can change whenever you like. Something like appending a `v1` to the key: `v1-product-${id}-${updatedAt}`

And this key is our final form: a unique, but flexible key that allows us to expire the cache on demand (change the version) or automatically expire it when the record itself changes.

:::info

One more case: what if the underlying `Product` model itself changes, adding a new field, for example? Each product will now have new data, but no changes will occur to `updatedAt` as a result of adding this column. There are a couple things you could do here:

- Increment the version on the key, if you have one: `v1` => `v2`
- "Touch" all of the Product records in a script, forcing them to have their `updatedAt` timestamp changed
- Incorporate a hash of all the keys of a `product` into the cache key

How does that last one work? We get a list of all the keys and then apply a hashing algorithm like MD5 to get a string that's unique based on that list of database columns. Then if one is ever added or removed, the hash will change, which will change the key, which will bust the cache:

```javascript
const product = db.product.findUnique({ where: { id } })
const columns = Object.keys(product) // ['id', 'name', 'sku', ...]
const hash = md5(columns.join(',')) // "e4d7f1b4ed2e42d15898f4b27b019da4"

cache(`v1-product-${hash}-${id}-${updatedAt}`, () => {
  // ...
})
```

Note that this has the side effect of having to select at least one record from the database so that you know what the column names are, but presumably this is much less overhead that whatever computation you're trying to avoid by caching: the slow work that happens inside of the function passed to `cache()` will still be avoided on subsequent calls (and selecting a single record from the database by an indexed column like `id` should be very fast).

:::

#### Expiration-based Keys

You can skirt these issues about what data is changing and what to include or not include in the key by just setting an expiration time on this cache entry. You may decide that if a change is made to a product, it's okay if users don't see the change for, say, an hour. In this case just set the expiration time to 3600 seconds and it will automatically be re-built, whether something changed in the record or not:

```js
cache(
  `product-${id}`,
  () => {
    // ...
  },
  { expires: 3600 }
)
```

This leads to your product cache being rebuilt every hour, even though you haven't made any changes that are of consequence to the user. But that may be we worth the tradeoff versus rebuilding the cache when _no_ useful data has changed (like the `views` column being updated).

#### Global Cache Key Prefix

Just like the `v1` we added to the `product` cache key above, you can globally prefix a string to _all_ of your cache keys:

```js title="api/src/lib/cache.js"
export const { cache, cacheFindMany } = createCache(client, {
  logger,
  timeout: 500,
  // highlight-next-line
  prefix: 'alpha',
})
```

This would turn a key like `posts-123` into `alpha-posts-123` before giving it to the cache client. If you prefixed with `v1` in the individual cache key, you'd now have `alpha-v1-posts-123`.

This gives you a nuclear option to invalidate all cache keys globally in your app. Let's say you launched a new redesign, or other visual change to your site where you may be showing more or less data from your GraphQL queries. If your data was purely based on the DB data (like `id` and `updatedAt`) there would be no way to refresh all of these keys without changing each and every cache key manually in every service, or by manually updating _all_ `updatedAt` timestamps in the database. This gives you a fallback to refreshing all data at once.

#### Caching User-specific Data

Sometimes you want to cache data unique to a user. Imagine a Recommended Products feature on our store: it should recommend products based on the user's previous purchase history, views, etc. In this case we'd way to include something unique about the user itself in the key:

```js
cache(`recommended-${context.currentUser.id}`, () => {
  // ...
})
```

If every page the user visits has a different list of recommended products for every page (meaning that the full computation will need to run at least once, before it's cached) then creating this cache may not be worth it: how often does the user revisit the same product page more than once? Conversely, if you show the _same_ recommended products on every page then this cache would definitely improve the user's experience.

The _key_ to writing a good key (!) is to think carefully about the circumstances in which the key needs to expire, and include those bits of information into the key string/array. Adding caching can lead to weird bugs you don't expect, but in these cases the root cause will usually be the cache key not containing enough bits of information to expire it correctly. When in doubt, restart the app with the cache server (memcached or redis) disabled and see if the same behavior is still present. If not, the cache key is the culprit!

### Setup

We have a setup command which creates a file `api/src/lib/cache.js` and include basic initialization for Memcached or Redis:

```bash
yarn rw setup cache memcached
yarn rw setup cache redis
```

This generates the following (memcached example shown):

```js title="api/src/lib/cache.js"
import { createCache, MemcachedClient } from '@redwoodjs/api/cache'

import { logger } from './logger'

const memJsFormattedLogger = {
  log: (msg) => logger.error(msg),
}

let client
try {
  client = new MemcachedClient('localhost:11211', {
    logger: memJsFormattedLogger,
  })
} catch (e) {
  console.error(`Could not connect to cache: ${e.message}`)
}

export const { cache, cacheFindMany } = createCache(client, {
  logger,
  timeout: 500,
})
```

When the time comes, you can replace the hardcoded `localhost:11211` with an ENV var that can be set per-environment.

#### Logging

You'll see two different instances of passing `logger` as arguments here. The first:

```js
client = new MemcachedClient(process.env.CACHE_SERVER, {
  logger: memJsFormattedLogger,
})
```

passes it to the `MemcachedClient` initializer, which passes it on to the MemJS library underneath so that it (MemJS) can report errors. `memJsFormattedLogger` just wraps the Redwood logger call in another function, which is the format expected by the MemJS library.

The second usage of the logger argument:

```js
export const { cache, cacheFindMany } = createCache(client, {
  logger,
  timeout: 500,
})
```

is passing it to Redwood's own service cache code, so that it can log cache hits, misses, or errors.

#### Options

There are several options you can pass to the `createCache()` call:

- `logger`: an instance of the Redwood logger. Defaults to `null`, but if you want any feedback about what the cache is doing, make sure to set this!
- `timeout`: how long to wait for the cache server to respond during a get/set before giving up and just executing the function containing what you want to cache and returning the result directly. Defaults to `500` milliseconds.
- `prefix`: a global cache key prefix. Defaults to `null`.
- `fields`: an object that maps the model field names for the `id` and `updatedAt` fields if your database has another name for them. For example: `fields: { id: 'post_id', updatedAt: 'updated_at' }`. Even if only one of your names is different, you need to provide both properties to this option. Defaults to `{ id: 'id', updatedAt: 'updatedAt' }`

### `cache()`

Use this function when you want to cache some data, optionally including a number of seconds before it expires:

```js
// cache forever
const posts = () => {
  return cache(`posts`, () => {
    return db.post.findMany()
  })
}

// cache for 1 hour
const posts = () => {
  return cache(
    `posts`,
    () => {
      return db.post.findMany()
    },
    { expires: 3600 }
  )
}
```

Note that a key can be a string or an array:

```js
const post = ({ id }) => {
  return cache(`posts-${id}-${updatedAt.getTime()}`, () => {
    return db.post.findUnique({ where: { id } })
  })
}

// or

const post = ({ id }) => {
  return cache(['posts', id, updatedAt.getTime()], () => {
    return db.post.findUnique({ where: { id } })
  })
}
```

:::info

`cache()` returns a Promise so you'll want to `await` it if you need the data for further processing in your service. If you're only using your service as a GraphQL resolver then you can just return `cache()` directly.

:::

### `cacheFindMany()`

Use this function if you want to cache the results of a `findMany()` call from Prisma, but only until one or more of the records in the set is updated. This is sort of a best of both worlds cache scenario where you can cache as much data as possible, but also expire and re-cache as soon as any piece of it changes, without going through every record manually to see if it's changed: whenever _any_ record changes the cache will be discarded.

This function will always execute a `findFirst()` query to get the latest record that's changed, then use its `id` and `updatedAt` timestamp as the cache key for the full query. This means you'll always incur the overhead of a single DB call, but not the bigger `findMany()` unless something has changed. Note you still need to include a cache key prefix:

```js
const post = ({ id }) => {
  return cacheFindMany(`users`, db.user)
}
```

The above is the simplest usage example. If you need to pass a `where`, or any other object that `findMany()` accepts, include a `conditions` key in an object as the third argument:

```js
const post = ({ id }) => {
  return cacheFindMany(`users`, db.user, {
    conditions: { where: { roles: 'admin' } },
  })
}
```

This is functionally equivalent to the following:

```js
const latest = await db.user.findFirst({
  where: { roles: 'admin' } },
  orderBy: { updatedAt: 'desc' },
  select: { id: true, updatedAt: true }
})

return cache(`posts-${latest.id}-${latest.updatedAt.getTime()}`, () => {
  return db.post.findMany({ where: { roles: 'admin' } })
})
```

If you also want to pass an `expires` option, do it in the same object as `conditions`:

```js
const post = ({ id }) => {
  return cacheFindMany(`users`, db.user, {
    conditions: { where: { roles: 'admin' } },
    expires: 86400,
  })
}
```

:::info

`cacheFindMany()` returns a Promise so you'll want to `await` it if you need the data for further processing in your service. If you're only using your service as a GraphQL resolver than you can just return the Promise.

:::

### `deleteCacheKey()`

There may be instances where you want to explicitly remove something from the cache so that it gets re-created with the same cache key. A good example is caching a single user, using only their `id` as the cache key. By default, the cache would never bust because a user's `id` is not going to change, no matter how many other fields on user are updated. With `deleteCacheKey()` you can choose to delete the key, for example, when the `updateUser()` service is called. The next time `user()` is called, it will be re-cached with the same key, but it will now contain whatever data was updated.

```javascript
import { cache, deleteCacheKey } from 'src/lib/cache'

const user = ({ id }) => {
  return cache(`user-${id}`, () => {
    return db.user.findUnique({ where: { id } })
  })
})

const updateUser = async ({ id, input }) => {
  await deleteCacheKey(`user-${id}`)
  return db.user.update({ where: { id }, data: { input } })
})
```

:::warning

When explicitly deleting cache keys like this you could find yourself going down a rabbit hole. What if there is another service somewhere that also updates user? Or another service that updates an organization, as well as all of its underlying child users at the same time? You'll need to be sure to call `deleteCacheKey()` in these places as well. As a general guideline, it's better to come up with a cache key that encapsulates any triggers for when the data has changed (like the `updatedAt` timestamp, which will change no matter who updates the user, anywhere in your codebase).

Scenarios like this are what people are talking about when they say that caching is hard!

:::

### Testing what you cache

We wouldn't just give you all of these caching APIs and not show you how to test it right? You'll find all the details in the [Caching section in the testing doc](testing.md#testing-caching).

### Creating Your Own Client

If Memcached or Redis don't serve your needs, you can create your own client adapter. In the Redwood codebase take a look at `packages/api/src/cache/clients` as a reference for writing your own. The interface is extremely simple:

- Extend from the `BaseClient` class.
- A constructor that takes whatever arguments you want, passing them through to the client's initialization code.
- A `get()` function that accepts a `key` argument and returns the data from the cache if found, otherwise `null`. Note that in the Memcached and Redis clients the value returned is first run through `JSON.parse()` but if your cache client supports native JS objects then you wouldn't need to do this.
- A `set()` function that accepts a string `key`, the `value` to be cached, and an optional `options` object containing at least an `expires` key. Note that `value` can be a real JavaScript objects at this point, but in Memcached and Redis the value is run through `JSON.stringify()` before being sent to the client library. You may or may not need to do the same thing, depending on what your cache client supports.
