# Database Seeds

Seeds are data that are required in order for your app to function. Think of
the data a new developer would need to get up and running with your codebase, or
data that needs to exist when a new instance of your application is deployed to
a new environment.

Seed data are things like:

- An admin user so that you can log in to your new instance
- A list of categories that can be assigned to a Product
- Lists of roles and permissions

Seed data is not meant for:

- Sample data to be used in development
- Data to run tests against
- Randomized data

## Best Practices

Ideally seed data should be idempotent: you can execute the seed
script against your database at any time and end up with the seed data properly
populated in the database. It should not result in wiping out existing records
or creating duplicates of any seeded data that is already present.

Making your seeds idempotent requires more code than just a straight
`createMany()`. The code examples below use the safest idempotent strategy
by having an `upsert` check if a record with the same unique identifier
already exists, and if so just update it, if not then create it. But, this
technique requires a separate SQL statement for each member of your data array
and is less performant than `createMany()`.

You could also do a check if _any_ data exists in the database first, and if
not, create the records with `createMany()`. However, this means that any
existing seed data that may have been modified will remain, and would not be
updated to match what you expect in your seed.

When in doubt, `upsert`!

## When seeds run

Seeds are automatically run the first time you migrate your database:

```bash
yarn rw prisma migrate dev
```

They are run _every_ time you reset your database:

```bash
yarn rw prisma migrate reset
```

You can manually run seeds at any time with the following command:

```
yarn rw prisma db seed
```

You generally don't need to keep invoking your seeds over and over again, so it
makes sense that Prisma only does it on a complete database reset, or when the
database is created with the first `prisma migrate dev` execution. But as your
schema evolves you may add a new model that requires some seeded data and so
you can add it to your seed file and then manually run it to create those
records.

### Performance

Prisma is faster at execting a `createMany()` instead of many `create` or
`upsert` functions. Unfortunately, you lose the ability to easily make your seed
idempotent with a single function call.

One solution to simulate an `upsert` will still using `createMany()` could be
to start with the full array of data and first check to see whether each of
those records already exist in the database. If they do, create two
arrays: one for records that don't exist and run `createMany()` with them, and
the second list for records that do exist, and run `updateMany()` on those.

Unfortunately this relies on a select query for each record, which may negate
the performance benefits of `createMany()`. Since you are running seeds
realitively rarely, it's our recommendation that you focus less on absolute
performance and worry more about making them easy to maintain.

## Types

If you're using Typescript you'll probably want to type your seeds as well.
Getting the right types for Prisma models can be tricky, but here's the formula:

```javascript title="scripts/seed.ts"
import { db } from 'api/src/lib/db'
// highlight-next-line
import type { Prisma } from '@prisma/client'

export default async () => {
  try {
    // highlight-next-line
    const users: Prisma.UserCreateArgs['data'][] = [
      { name: 'Alice', email: 'alice@redwoodjs.com },
      { name: 'Bob', email: 'bob@redwoodjs.com },
    ]

    await db.user.createMany({ data: users })
  } catch (error) {
    console.error(error)
  }
}
```

## Creating seed data

Take a look at `scripts/seed.js` (or `.ts` if you're working on a Typescript
project):

```javascript title="scripts/seed.js"
import { db } from 'api/src/lib/db'

export default async () => {
  try {
    // Create your database records here! For example, seed some users:
    //
    // const users = [
    //   { name: 'Alice', email: 'alice@redwoodjs.com },
    //   { name: 'Bob', email: 'bob@redwoodjs.com },
    // ]
    //
    // await db.user.createMany({ data: users })

    console.info(
      '\n  No seed data, skipping. See scripts/seed.ts to start seeding your database!\n'
    )
  } catch (error) {
    console.error(error)
  }
}
```

Let's create some categories for a bookstore. For this example, assume the
`Category` model has a unique constraint on the `name` field. Remove the
commented example and add your code:

```javascript title="scripts/seed.js"
export default async () => {
  try {
    const data = [
      { name: 'Art', bisacCode: 'ART000000' },
      { name: 'Biography', bisacCode: 'BIO000000' },
      { name: 'Fiction', bisacCode: 'FIC000000' },
      { name: 'Nature', bisacCode: 'NAT000000' },
      { name: 'Travel', bisacCode: 'TRV000000' },
      { name: 'World History', bisacCode: 'HIS037000' },
    ]

    for (const item of data) {
      await db.category.upsert({
        where: { name: item.name },
        update: { code: item.code },
        create: { name: item.name, code: item.code },
      })
    }
  } catch (error) {
    console.error(error)
  }
}
```

You can now execute this seed as many times as you want and you'll end up with
that exact list in the database each time. And, any additional categories you've
created in the meantime will remain. Remember: seeds are meant to be the
_minimum_ amount of data you need for your app to run, not necessarily _all_ the
data that will ever be present in those tables.

# Seeding users for dbAuth

If using dbAuth and seeding users, you'll need to add a `hashedPassword` and
`salt` using the same algorithm that dbAuth uses internally. Here's an easy way
do that:

```javascript title="scripts/seed.js"
import { hashPassword } from '@redwoodjs/auth-dbauth-api'

export default async () => {
  const users = [
    { name: 'John', email: 'john@example.com', password: 'secret1' },
    { name: 'Jane', email: 'jane@example.com', password: 'secret2' },
  ]

  for (const user of users) {
    const [hashedPassword, salt] = hashPassword(user.password)

    await db.user.upsert({
      where: {
        email: user.email,
      },
      create: {
        name: user.name,
        email: user.email,
        hashedPassword,
        salt,
      },
      update: {
        name: user.name,
        hashedPassword,
        salt,
      },
    })
  }
}
```

## What if I don't need seeds?

In order to stop automatically executing seeds with the `prisma migrate`
commands you can remove the following lines from `package.json` in the root of
your app:

```json
"prisma": {
  "seed": "yarn rw exec seed"
},
```

You can then delete the `scripts/seed.js` file.
