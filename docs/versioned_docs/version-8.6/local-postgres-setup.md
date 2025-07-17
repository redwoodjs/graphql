---
description: Setup a Postgres database to develop locally
---

# Local Postgres Setup

RedwoodJS uses a SQLite database by default. While SQLite makes local development easy, you're
likely going to want to run the same database you use in production locally at some point. And since the odds of that database being Postgres are high, here's how to set up Postgres.

## Install Postgres

### Mac

If you're on a Mac, we recommend using Homebrew:

```bash
brew install postgresql@14
```

> **Install Postgres? I've messed up my Postgres installation so many times, I wish I could just uninstall everything and start over!**
>
> We've been there before. For those of you on a Mac, [this video](https://www.youtube.com/watch?v=1aybOgni7lI) is a great resource on how to wipe the various Postgres installs off your machine so you can get back to a blank slate.
> Obviously, warning! This resource will teach you how to wipe the various Postgres installs off your machine. Please only do it if you know you can!

### Windows and Other Platforms

If you're using another platform, see Prisma's [Data Guide](https://www.prisma.io/dataguide/postgresql/setting-up-a-local-postgresql-database) for detailed instructions on how to get up and running.

## Creating a database

If everything went well, then Postgres should be running and you should have a few commands at your disposal (namely, `psql`, `createdb`, and `dropdb`).

Check that Postgres is running with `brew services` (the `$(whoami)` bit in the code block below is just where your username should appear):

```bash
$ brew services
Name Status User Plist
postgresql started $(whoami) /Users/$(whoami)/Library/LaunchAgents/homebrew.mxcl.postgresql.plist
```

If it's not started, start it with:

```bash
brew services start postgresql
```

Great. Now let's try running the PostgresQL interactive terminal, `psql`:

```bash
$ psql
```

You'll probably get an error like:

```bash
psql: error: FATAL: database $(whoami) does not exist
```

This is because `psql` tries to log you into a database of the same name as your user. But if you just installed Postgres, odds are that database doesn't exist.

Luckily it's super easy to create one using another of the commands you got, `createdb`:

```bash
$ createdb $(whoami)
```

Now try:

```
$ psql
psql (13.1)
Type "help" for help.

$(whoami)=#
```

If it worked, you should see a prompt like the one above&mdash;your username followed by `=#`. You're in the PostgreSQL interactive terminal! While we won't get into `psql`, here's a few the commands you should know:

- `\q` &mdash; quit (super important!)
- `\l` &mdash; list databases
- `\?` &mdash; get a list of commands

If you'd rather not follow any of the advice here and create another Postgres user instead of a Postgres database, follow [this](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-3-%E2%80%94-creating-a-new-role).

## Update the Prisma Schema

Tell Prisma to use a Postgres database instead of SQLite by updating the `provider` attribute in your
`schema.prisma` file:

```graphql title="api/db/schema.prisma"
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}
```

> Note: If you run into a "PrismaClientInitializationError" then you may need to regenerate the prisma client using: `yarn rw prisma generate`

## Connect to Postgres

Add a `DATABASE_URL` to your `.env` file with the URL of the database you'd like to use locally. The
following example uses `redwoodblog_dev` for the database. It also has `postgres` setup as a
superuser for ease of use.

```env
DATABASE_URL="postgresql://postgres@localhost:5432/redwoodblog_dev?connection_limit=1"
```

Note the `connection_limit` parameter. This is [recommended by Prisma](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/deployment#recommended-connection-limit) when working with
relational databases in a Serverless context. You should also append this parameter to your production
`DATABASE_URL` when configuring your deployments.

### Local Test DB

You should also set up a test database similarly by adding `TEST_DATABASE_URL` to your `.env` file.

```env
TEST_DATABASE_URL="postgresql://postgres@localhost:5432/redwoodblog_test?connection_limit=1"
```

> Note: local postgres server will need manual start/stop -- this is not handled automatically by RW CLI in a manner similar to sqlite

### Base URL and path

Here is an example of the structure of the base URL and the path using placeholder values in uppercase letters:

```bash
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

The following components make up the base URL of your database, they are always required:

| Name     | Placeholder | Description                                                  |
| -------- | ----------- | ------------------------------------------------------------ |
| Host     | `HOST`      | IP address/domain of your database server, e.g. `localhost`  |
| Port     | `PORT`      | Port on which your database server is running, e.g. `5432`   |
| User     | `USER`      | Name of your database user, e.g. `postgres`                  |
| Password | `PASSWORD`  | password of your database user                               |
| Database | `DATABASE`  | Name of the database you want to use, e.g. `redwoodblog_dev` |

## Migrations

Migrations are snapshots of your DB structure, which, when applied, manage the structure of both your local development DB and your production DB.

To create and apply a migration to the Postgres database specified in your `.env`, run the _migrate_ command. (Did this return an error? If so, see "Migrate from SQLite..." below.):

```bash
yarn redwood prisma migrate dev
```

### Migrate from SQLite to Postgres

If you've already created migrations using SQLite, e.g. you have a migrations directory at `api/db/migrations`, follow this two-step process.

#### 1. Remove existing migrations

**For Linux and Mac OS**
From your project root directory, run either command corresponding to your OS.

```bash
rm -rf api/db/migrations
```

**For Windows OS**

```bash
rmdir /s api\db\migrations
```

> Note: depending on your project configuration, your migrations may instead be located in `api/prisma/migrations`

#### 2. Create a new migration

Run this command to create and apply a new migration to your local Postgres DB:

```bash
yarn redwood prisma migrate dev
```

## DB Management Tools

Here are our recommendations in case you need a tool to manage your databases:

- [TablePlus](https://tableplus.com/) (Mac, Windows)
- [Beekeeper Studio](https://www.beekeeperstudio.io/) (Linux, Mac, Windows - Open Source)
