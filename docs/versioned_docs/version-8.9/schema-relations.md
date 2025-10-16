---
description: How Prisma relations work with scaffolds
---

# Prisma Relations and Redwood's Generators

## Many-to-many Relationships

A many-to-many relationship is accomplished by creating a "join" or "lookup" table between two other tables.
For example, if a **Product** can have many **Tag**s, any given **Tag** can also have many **Product**s that it is attached to.
A database diagram for this relationship could look like:

```
┌───────────┐     ┌─────────────────┐      ┌───────────┐
│  Product  │     │  ProductsOnTag  │      │    Tag    │
├───────────┤     ├─────────────────┤      ├───────────┤
│ id        │────<│ productId       │   ┌──│ id        │
│ title     │     │ tagId           │>──┘  │ name      │
│ desc      │     └─────────────────┘      └───────────┘
└───────────┘
```

[Here](https://www.prisma.io/docs/concepts/components/prisma-schema/relations#many-to-many-relations)
are Prisma's docs for creating many-to-many relationships.
The `schema.prisma` syntax to create this relationship looks like:

```jsx
model Product {
  id       Int    @id @default(autoincrement())
  title    String
  desc     String
  tags     Tag[]
}

model Tag {
  id       Int     @id @default(autoincrement())
  name     String
  products Product[]
}
```

These relationships can be [implicit](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations#implicit-many-to-many-relations) (as this diagram shows) or [explicit](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations#explicit-many-to-many-relations) (explained below). Redwood's SDL generator (which is also used by the scaffold generator) only supports an **explicit** many-to-many relationship when generating with the `--crud` flag. What's up with that?

## CRUD Requires an `@id`

CRUD (Create, Retrieve, Update, Delete) actions in Redwood currently require a single, unique field in order to retrieve, update or delete a record. This field must be denoted with Prisma's [`@id`](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#id) attribute, marking it as the tables's primary key. This field is guaranteed to be unique and so can be used to find a specific record.

Prisma's implicit many-to-many relationships create a table _without_ a single field marked with the `@id` attribute. Instead, it uses a similar attribute: [`@@id`](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#id-1) to define a _multi-field ID_. This multi-field ID will become the tables's primary key. The diagram above shows the result of letting Prisma create an implicit relationship.

Since there's no single `@id` field in implicit many-to-many relationships, you can't use the SDL generator with the `--crud` flag. Likewise, you can't use the scaffold generator, which uses the SDL generator (with `--crud`) behind the scenes.

## Supported Table Structure

To support both CRUD actions and to remain consistent with Prisma's many-to-many relationships, a combination of the `@id` and [`@@unique`](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#unique-1) attributes can be used. With this, `@id` is used to create a primary key on the lookup-table; and `@@unique` is used to maintain the table's unique index, which was previously accomplished by the primary key created with `@@id`.

> Removing `@@unique` would let a specific **Product** reference a particular **Tag** more than a single time.

You can get this working by creating an explicit relationship—defining the table structure yourself:

```jsx
model Product {
  id    Int         @id @default(autoincrement())
  title String
  desc  String
  tags  ProductsOnTag[]
}

model Tag {
  id       Int      @id @default(autoincrement())
  name     String
  products ProductsOnTag[]
}

model ProductsOnTag {
  id        Int     @id @default(autoincrement())
  tagId     Int
  tag       Tag     @relation(fields: [tagId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])

  @@unique([tagId, productId])
}
```

Which creates a table structure like:

```
┌───────────┐      ┌──────────────────┐     ┌───────────┐
│  Product  │      │  ProductsOnTags  │     │    Tag    │
├───────────┤      ├──────────────────┤     ├───────────┤
│ id        │──┐   │ id               │  ┌──│ id        │
│ title     │  └──<│ productId        │  │  │ name      │
│ desc      │      │ tagId            │>─┘  └───────────┘
└───────────┘      └──────────────────┘

```

Almost identical! But now there's an `id` and the SDL/scaffold generators will work as expected. The explicit syntax gives you a couple additional benefits—you can customize the table name and even add more fields. Maybe you want to track which user tagged a product—add a `userId` column to `ProductsOnTags` and now you know.

## Troubleshooting Generators

Are you getting errors when generating SDLs or scaffolds for your Prisma models?
There's a known limitation in Redwood's GraphQL type generation that happens when generating SDL for, or scaffolding out, a Prisma model that has relations before the SDL for the related model exists.

This may sound a little abstract, so let's look at an example. Let's say that you're modeling bookshelves. Your prisma schema has two data models, `Book` and `Shelf`. This is a one to many relationship: a shelf has many books, but a book can only be on one shelf:

```js
model Book {
  id      Int    @id @default(autoincrement())
  title   String @unique
  // highlight-start
  shelf   Shelf? @relation(fields: [shelfId], references: [id])
  shelfId Int?
  // highlight-end
}

model Shelf {
  id    Int    @id @default(autoincrement())
  name  String @unique
  // highlight-next-line
  books Book[]
}
```

The data model looks great. Let's make it real with SDLs and services:

```
yarn rw g sdl Book
```

Here's how the output from the command starts:

```bash
✔ Generating SDL files...
✔ Successfully wrote file $(./api/src/graphql/books.sdl.js)
✔ Successfully wrote file $(./api/src/services/books/books.scenarios.js)
✔ Successfully wrote file $(./api/src/services/books/books.test.js)
✔ Successfully wrote file $(./api/src/services/books/books.js)
```

Looks like it's working so far. The SDL and service files generated!
But, when the command starts generating types... 💥

```
  ⠙ Generating types ...
Failed to load schema

# ...

type Query {
  redwood: Redwood
},graphql/**/*.sdl.{js,ts},directives/**/*.{js,ts}:

        Unknown type: "Shelf".
        Error: Unknown type: "Shelf".
```

What happened?
Remember, the first thing to do when you get an error: _read the error message_.
The key is `Unknown type: "Shelf"`.
The type of `Book`'s `shelf` field is `Shelf`.
But we didn't generate the SDL for `Shelf` yet, so it doesn't exist.
And naturally, types can't be generated for it.

But fear not.
This should be an easy fix.
There are two ways you can go about it.

You can generate the SDLs for all the models in the relation, ignoring the errors. This way the last model in the relation should generate cleanly.

Or, you can remove or comment out the relations:

```js
model Book {
  id      Int    @id @default(autoincrement())
  title   String @unique
  // highlight-start
  // Shelf   Shelf? @relation(fields: [shelfId], references: [id])
  // shelfId Int?
  // highlight-end
}

model Shelf {
  id    Int    @id @default(autoincrement())
  name  String @unique
  // highlight-next-line
  // books Book[]
}
```

Then, generate the SDL for, or scaffold out, each model separately:

```
yarn rw g sdl Book
# ...

yarn rw g sdl Shelf
# ...
```

And lastly, add or comment in the relationships and regenerate their SDLs or scaffolds using the `--force` flag to overwrite the existing files, adding the `--no-tests` flag to preserve your tests and scenario files (if needed):

```
yarn rw g sdl Book --force --no-tests
# ...

yarn rw g sdl Shelf --force --no-tests
# ...
```

### Self-Relations

[Self-relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/self-relations#one-to-many-self-relations) are useful for modeling parent-child relationships where the parent and child are the "same type of thing".
For example, in a business, everyone is an employee with a role and possibly someone to directly report to:

- President—no direct report (for the purposes of this example)
- Director—reports to the President
- Manager—reports to a Director
- Employee—reports to a Manager, but has no direct reports

Let's use a self-relation to model this in our Prisma schema:

```js
model Employee {
  id            Int       @id @default(autoincrement())
  name          String
  jobTitle      String
  // highlight-start
  reportsToId   Int?      @unique
  reportsTo     Employee? @relation("OrgChart", fields: [reportsToId], references: [id])
  directReports Employee? @relation("OrgChart")
  // highlight-end
}
```

For the generators, what's important here is that the related models are optional.
`reportsToId`, `reportsTo`, and `directReports` use Prisma's `?` syntax to indicate that they're optional—not required.
The Redwood generators may complain or fail if you try to force a requirement here.

It's important because if you're at the top—say you're the President—then you don't have a `reportsTo`, and if you're just an Employee, then you don't have anyone that directly reports to you.
