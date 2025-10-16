---
description: An ORM with a natural interface
---

# RedwoodRecord

> RedwoodRecord is currently considered to be **Experimental**. We are hoping folks will start using it and give us feedback to help shape its development and developer experience.

RedwoodRecord is an ORM ([Object-relational Mapping](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)) built on top of Prisma. It may be extended in the future to wrap other database-access packages.

RedwoodRecord is heavily inspired by [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html) which ships with [Ruby on Rails](https://rubyonrails.org). It presents a natural interface to the underlying data in your database, without worry about the particulars of SQL syntax.

## Background and Terminology

Before you can use RedwoodRecord you need to create classes for each database table you intend to access. Let's say we have a blog with three database tables:

```
┌───────────┐       ┌────────────┐      ┌────────────┐
│   User    │       │    Post    │      │  Comment   │
├───────────┤       ├────────────┤      ├────────────┤
│ id        │•──┐   │ id         │•──┐  │ id         │
│ name      │   └──<│ userId     │   └─<│ postId     │
│ email     │       │ title      │      │ name       │
└───────────┘       │ body       │      │ message    │
                    └────────────┘      └────────────┘
```

In database-speak we say that these tables have _one-to-many_ relationships between them when moving from left to right in the diagram above: one User can have many Posts associated to it, and a Post can have many Comments. The "one" is denoted with a `•` on the arrow above and a `<` denotes the "many."

You can leave it at that, as saying one-to-many explains both sides of the relationship, but it's sometimes convenient to refer to the relation in the "opposite" direction. Reading the diagram from right to left we could say that a comment _belongs to_ a post (it has a foreign key `postId` that points to Post via `Comment.postId` → `Post.id`) and a Post belongs to a User (`Post.userId` → `User.id`)

There are also _many-to-many_ relationships, such as a Product and Category—a Product can have many different Categories, and a Category will have many different Products connected to it:

```
┌───────────┐       ┌────────────┐
│  Product  │       │  Category  │
├───────────┤       ├────────────┤
│ id        │>─────<│ id         │
│ name      │       │ name       │
│ upc       │       │ shelf      │
└───────────┘       └────────────┘
```

These tables don't have any foreign keys (`productId` or `categoryId`) so how do they keep track of each other? Generally you'll create a _join table_ between the two that references each other's foreign key:

```
┌───────────┐      ┌───────────────────┐       ┌────────────┐
│  Product  │      │  ProductCategory  │       │  Category  │
├───────────┤      ├───────────────────┤       ├────────────┤
│ id        │•────<│ productId         │   ┌──•│ id         │
│ name      │      │ categoryId        │>──┘   │ name       │
│ upc       │      └───────────────────┘       │ shelf      │
└───────────┘                                  └────────────┘
```

Now we're back to one-to-many relationships. In Prisma this join table is created and maintained for you. It will be named `_CategoryToPost` and the foreign keys will simply be named `A` and `B` and point to the two separate tables. Prisma refers to this as an [implicit many-to-many](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations#implicit-many-to-many-relations) relationship.

If you want to create the join table yourself and potentially store additional data there (like a timestamp of when the product was categorized) then this is simply a one-to-many relationship on both sides: a Product has many ProductCategories and a Category has many ProductCategories. Prisma refers to this as an [explicitly many-to-many](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations#explicit-many-to-many-relations) relationship.

> TODO: We'll be adding logic soon that will let you get to the categories from a product record (and vice versa) in explicit many-to-manys without having to manually go through ProductCategory. From this:
>
> ```
> const product = await Product.find(1)
> const productCategories = await product.productCategories.all()
> const categories = productCategories.map(async (pc) => await pc.categories.all()).flat()
> ```
>
> To this:
>
> ```
> const product = await Product.find(1)
> const categories = await product.categories.all()
> ```

The only other terminology to keep in mind are the terms _model_ and _record_. A _model_ is the name for the class that represents one database table. The example above has three models: User, Post and Comment. Prisma also calls each database-table declaration in their `schema.prisma` declaration file a "model", but when we refer to a "model" in this doc it will mean the class that extends `RedwoodRecord`. A _record_ is a single instance of our model that now represents a single row of data in the database.

So: I use the User model to find a given user in the database, and, assuming they are found, I now have a single user record (an instance of the User model).

## Usage

You'll want to add RedwoodRecord's package to the api side:

```
yarn workspace api add @redwoodjs/record
```

First you'll need to create a model to represent the database table you want to access. In our blog example, let's create a User model:

```jsx title="api/src/models/User.js"
import { RedwoodRecord } from '@redwoodjs/record'

export default class User extends RedwoodRecord {}
```

Now we need to parse the Prisma schema, store it as a cached JSON file, and create an `index.js` file with a couple of config settings:

```
yarn rw record init
```

You'll see that this created `api/src/models/datamodel.js` and `api/src/models/index.js`.

Believe it or not, that's enough to get started! Let's try using the Redwood console to make some quick queries without worrying about starting up any servers:

> TODO: Models don't quite work correctly in the console. The require and fetching of records below will work, but actually trying to read any properties returns `undefined`. For now you'll need to test out RedwoodRecord directly in your app.

```
yarn rw c
```

Now we've got a standard Node REPL but with a bunch of Redwood goodness loaded up for us already. First, let's require our model:

```jsx
const { User } = require('./api/src/models')
```

And now we can start querying and modifying our data:

```jsx
await User.all()
const newUser = await User.create({ name: 'Rob', email: 'rob@redwoodjs.com' })
newUser.name = 'Robert'
await newUser.save()
await User.find(1)
await User.findBy({ email: 'rob@redwoodjs.com' })
await newUser.destroy()
```

### Initializing New Records

To create a new record in memory only (not yet saved to the database) use `build()`:

```jsx
const user = User.build({ firstName: 'David', lastName: 'Price' })
```

Note that `build` simply builds the record in memory, and thus is not asynchronous, whereas other model methods that interact with Prisma/the DB are.

See [create/save](#save) below for saving this record to the database.

### Errors

When a record cannot be saved to the database, either because of database errors or [validation](#validation) errors, the `errors` property will be populated with the error message(s).

```jsx
const user = User.build({ name: 'Rob Cameron' })
await user.save() // => false
user.hasError() // => true
user.errors // => { base: [], email: ['must not be null'] }
user.errors.email // => ['must not be null']
```

> `base` is a special key in the errors object and is for errors that don't apply to a single attribute, like `email`. For example, if you try to delete a record that doesn't exist (maybe someone else deleted it between when you retrieved it from the database and when you tried to delete it) you'll get an error on the `base` attribute:
>
> `user.errors.base // => ['User record to destroy not found']`

You can preemptively check for errors before attempting to modify the record, but only for errors that would be caught with [validation](#validation), by using `isValid`:

```jsx
const user = User.build({ name: 'Rob Cameron' })
user.isValid // => false
user.errors.email // => ['must be formatted like an email address']
```

### Validation

Records can be checked for valid data before saving to the database by using the same [validation types](services.md#absence) available to [Service Validations](services.md#service-validations):

```jsx
export default class User extends RedwoodRecord {
  static validates = {
    email: { presence: true, email: true },
    username: { length: { min: 2, max: 50 } },
  }
}

const user = User.build({ username: 'r' })
await user.save() // => false
user.errors.email = ['must be present']
user.errors.username = ['must be at least 2 characters']
user.email = 'rob@redwoodjs.com'
user.username = 'rob'
await user.save()
```

### Finding Records

There are a few different ways to find records for a model. Sometimes you want to find multiple records (all that match certain criteria) and sometimes only one (the one record with a certain email address).

#### where()

`where()` is for finding multiple records. It returns an array of model records. The first argument is the properties that you would normally set as the `where` value in Prisma's [`findMany()` function](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#findmany). The second argument (optional) is any additional properties (like ordering or limiting) that you want to perform on the resulting records:

```jsx
await User.where() // would return all records
await User.where({ emailPreference: 'weekly' })
await User.where({ theme: 'dark' }, { orderBy: { createdAt: 'desc' } })
```

#### all()

`all()` is simply a synonym for `where()` but makes it clearer that your intention is truly to select all records (and optionally sort/order them). The first (and only) argument is now the additional properties (like `sort` and `orderBy`):

```jsx
await User.all()
await User.all({ orderBy: { lastName: 'asc' } })
```

#### find()

Finds a single record by that record's primary key. By default that is `id` but you can change the primary key of a model by defining it in the class definition:

```jsx
export default class User extends RecordRecord {
  static primaryKey = 'ident'
}
```

This call will throw an error if the record is not found: if you are trying to select a user by ID, presumably you expect that user to exist. So, it not existing is an exceptional condition. Behind the scenes this uses Prisma's [`findFirst()` function](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#findfirst).

```jsx
await User.find(123)
```

#### findBy()

Finds a single record by certain criteria. Similar to `where()`, but will only return the first record that matches. The first argument is the properties that you would normally set as the `where` value to Prisma's [`findFirst()` function](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#findmany). The second argument (optional) is any additional properties (like ordering or limiting) that you want to perform on the resulting records before selecting one:

```jsx
await User.findBy({ email: 'rob@redwoodjs.com' })
await User.findBy({ email: { endsWith: { 'redwoodjs.com' } } }, { orderBy: { lastName: 'asc' }, take: 10 })
```

If no record matching your query was found, it returns `null`.

#### first()

Alias for `findBy()`. This function can be used in your code to show your intention to only use the first of potentially multiple records that could match with `findBy()`.

```jsx
const randomCoreMember = await User.first({ email: { endsWith: { 'redwoodjs.com' } } })
```

### Creating Records

You can create new records with your RedwoodRecord model in two ways:

#### create()

Initializes a new record and saves it. If the save fails, `create` will return `false` instead of the instance of your record. If you need your new model instance (even on a failed save) use the `build()` version next.

The first argument is the data that would be given to Prisma's `create()` function. The (optional) second argument are any additional properties that are passed on to Prisma:

```jsx
await User.create({ name: 'Tom Preston-Werner' })
await User.create(
  { firstName: 'Rob', email: 'rob@redwoodjs.com' },
  { select: ['email'] }
)
```

#### save()

When calling `save()` on a record that hasn't been saved to the database, a new record will be created. If the record cannot be saved this call will return `false`. You can have it throw an error instead by including `{ throw: true }` in the first argument.

If the record cannot be saved you can inspect it for errors.

```jsx
const user = User.build({ firstName: 'Peter', lastName: 'Pistorius' })
await user.save()
// or
await user.save({ throw: true })
// check for errors
user.hasErrors // => true
user.errors.email // => ['can't be null']
```

### Updating Records

There are two ways to update a record. You can either 1) list all of the attributes to change in a call to `update()`, or 2) set the attributes manually and then call `save()`.

#### update()

Call `update()` on a record, including the attributes to change as the first argument. The second (optional) argument are any properties to forward to Prisma on updating. Returns `false` if the record did not save, otherwise returns itself with the newly saves attributes.

```jsx
const user = await User.find(123)
await user.update({ email: 'rob.cameron@redwoodjs.com' })
// or
await user.update({ email: 'rob.cameron@redwoodjs.com' }, { throw: true })
```

#### save()

Save changes made to a record. The first (optional) argument includes any properties to be forwarded to Prisma, as well as the option to throw an error on a failed save:

```jsx
const user = await User.find(123)
user.email = 'rob.cameron@redwoodjs.com'
await user.save()
// or
await user.save({ throw: true })
```

### Deleting Records

Records can be deleted easily enough. Coming soon will be class functions for deleting one or multiple records, without having to instantiate an instance of the model first.

#### destroy()

Call on a record to delete it in the database. The first (optional) argument are any properties to forward to Prisma when deleting, as well as the option to throw an error if the delete fails. This function returns `false` if the record could not be deleted, otherwise returns the record itself.

```jsx
const user = await User.find(123)
await user.destroy()
// or
await user.destroy({ throw: true })
```

### Relationships

As shown in [Background and Terminology](#background-and-terminology) above, RedwoodRecord provides a way to get data from related models. For example, to get the posts belonging to a user via what we call a _relation proxy_:

```jsx
const user = await User.find(123)
const posts = await user.posts.all()
```

In this example `posts` is the proxy. All of the normal finder methods available on a model (`where()`, `all()`, `find()` and `findBy()`) are all available to be called on the relation proxy. But that's not all: you can create records as well and they will automatically be associated to the parent record:

```jsx
const user = await User.find(123)
const post = await user.posts.create({ title: 'Related post!' })
post.userId // => 123
```

#### One-to-many

The _many_ records are accessible through the relation proxy:

```jsx
const user = await User.find(123)
const post = await user.posts.first()
const comments = await post.comments.all()
```

You can also create a record:

```jsx
const user = await User.find(123)
const post = await user.posts.create({ title: 'Related post!' })
```

#### Belongs-to

A belongs-to relationship implies that you have the child record and want the parent. In a belongs-to relationship there is only ever a single parent, so there is no need for a relationship proxy property: there is only one record that will ever be returned.

```jsx
const post = await Post.first()
const user = await post.user
```

> You cannot currently create a belongs-to record through the parent, but we're working on syntax to enable this!

#### Many-to-many

If you have an implicit many-to-many relationship then you will access the records similar to the one-to-many type:

```jsx
const product = await Product.find(123)
const categories = await product.categories.all()
```

If you have an explicit many-to-many relationship then you need to treat it as a two-step request. First, get the one-to-many relationships for the join table, then a belongs-to relationship for the data you actually want:

```
Product -> one-to-many -> ProductCategories -> belongs-to -> Category
-------                   -----------------                  --------
```

```jsx
const product = await Product.find(123)
const productCategories = await product.productCategories.all()
const categories = await Promise.all(
  productCategories.map(async (pc) => await pc.category)
)
```

If you wanted to create a new record this way, you would need to create the join table record after having already created/retrieved the records on either side of the relation:

```jsx
const product = await Product.find(123)
const category = await Category.find(234)
await ProductCategory.create({ productId: product.id, categoryId: category.id })
```

> We're working on improving this syntax to make interacting with these records as simple as the implicit version. Stay tuned!

## Coming Soon

The following features are in development but are not available in this experimental release.

### Lifecycle Callbacks

Coming soon will be the ability create functions around the lifecycle of a record. For example, to set a newly-created user's default preferences, you may want an `afterCreate` callback that invokes a function (syntax not final):

```jsx
export default class User extends RedwoodRecord {
  static afterCreate = async (user) => {
    await user.preferences.create({ email: 'weekly' })
  }
}
```

Or make sure that a user has transferred ownership of some data before closing their account:

```jsx
export default class User extends RedwoodRecord {
  static beforeDestroy = async (user) => {
    if ((await user.teams.count()) !== 0) {
      throw new Error('Please transfer ownership of your teams first')
    }
  }
}
```
