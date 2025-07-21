---
description: Scale your serverless functions
---

# Connection Pooling

> ⚠ **Work in Progress** ⚠️
>
> There's more to document here. In the meantime, you can check our [community forum](https://community.redwoodjs.com/search?q=connection%20pooling) for answers.
>
> Want to contribute? Redwood welcomes contributions and loves helping people become contributors.
> You can edit this doc [here](https://github.com/redwoodjs/redwoodjs.com/blob/main/docs/connectionPooling.md).
> If you have any questions, just ask for help! We're active on the [forums](https://community.redwoodjs.com/c/contributing/9) and on [discord](https://discord.com/channels/679514959968993311/747258086569541703).

Production Redwood apps should enable connection pooling in order to properly scale with your Serverless functions.

## Prisma Data Proxy

The [Prisma Data Proxy](https://www.prisma.io/docs/data-platform/data-proxy) provides database connection management and pooling for Redwood apps using Prisma. It supports MySQL and Postgres databases in either the U.S. or EU regions.

To set up a Prisma Data Proxy, sign up for the [Prisma Data Platform](https://www.prisma.io/data-platform) for free. In your onboarding workflow, plug in the connection URL for your database and choose your region. This will generate a connection string for your app. Then follow the instructions in [Prisma's documentation](https://www.prisma.io/docs/concepts/data-platform/data-proxy).

> Note that the example uses npm. Rather than using npm, you can access the Prisma CLI using `yarn redwood prisma` inside a Redwood app.

## Prisma & PgBouncer

PgBouncer holds a connection pool to the database and proxies incoming client connections by sitting between Prisma Client and the database. This reduces the number of processes a database has to handle at any given time. PgBouncer passes on a limited number of connections to the database and queues additional connections for delivery when space becomes available.

To use Prisma Client with PgBouncer from a serverless function, add the `?pgbouncer=true` flag to the PostgreSQL connection URL:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true
```

Typically, your PgBouncer port will be 6543 which is different from the Postgres default of 5432.

> Note that since Prisma Migrate uses database transactions to check out the current state of the database and the migrations table, if you attempt to run Prisma Migrate commands in any environment that uses PgBouncer for connection pooling, you might see an error.
>
> To work around this issue, you must connect directly to the database rather than going through PgBouncer when migrating.

For more information on Prisma and PgBouncer, please refer to Prisma's Guide on [Configuring Prisma Client with PgBouncer](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer).

## Supabase

For Postgres running on [Supabase](https://supabase.io) see: [PgBouncer is now available in Supabase](https://supabase.io/blog/2021/04/02/supabase-pgbouncer#using-connection-pooling-in-supabase).

All new Supabase projects include connection pooling using [PgBouncer](https://www.pgbouncer.org/).

We recommend that you connect to your Supabase Postgres instance using SSL which you can do by setting `sslmode` to `require` on the connection string:

```
// not pooled typically uses port 5432
postgresql://postgres:mydb.supabase.co:5432/postgres?sslmode=require
// pooled typically uses port 6543
postgresql://postgres:mydb.supabase.co:6543/postgres?sslmode=require&pgbouncer=true
```

## Heroku

For Postgres, see [Postgres Connection Pooling](https://devcenter.heroku.com/articles/postgres-connection-pooling).

Heroku does not officially support MySQL.

## Digital Ocean

For Postgres, see [How to Manage Connection Pools](https://www.digitalocean.com/docs/databases/postgresql/how-to/manage-connection-pools)

To run migrations through a connection pool, you're required to append connection parameters to your `DATABASE_URL`. Prisma needs to know to use pgbouncer (which is part of Digital Ocean's connection pool). If omitted, you may receive the following error:

```
Error: Migration engine error:
db error: ERROR: prepared statement "s0" already exists
```

To resolve this, use the following structure in your `DATABASE_URL`:

```
<YOUR_CONNECTION_POOL_URL>:25061/defaultdb?connection_limit=3&sslmode=require&pgbouncer=true&connect_timeout=10&pool_timeout=30
```

Here's a couple more things to be aware of:

- When using a Digital Ocean connection pool, you'll have multiple ports available. Typically the direct connection (without connection pooling) is on port `25060` and the connection through pgbouncer is served through port `25061`. Make sure you connect to your connection pool on port `25061`
- Adjust the `connection_limit`. Clusters provide 25 connections per 1 GB of RAM. Three connections per cluster are reserved for maintenance, and all remaining connections can be allocated to connection pools
- Both `pgbouncer=true` and `pool_timeout=30` are required to deploy successfully through your connection pool

Connection Pooling for MySQL is not yet supported.

## AWS

Use [Amazon RDS Proxy](https://aws.amazon.com/rds/proxy) for MySQL or PostgreSQL.

From the [AWS Docs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html#rds-proxy.limitations):

> Your RDS Proxy must be in the same VPC as the database. The proxy can't be publicly accessible.

Because of this limitation, with out-of-the-box configuration, you can only use RDS Proxy if you're deploying your Lambda Functions to the same AWS account. Alternatively, you can use RDS directly, but you might require larger instances to handle your production traffic and the number of concurrent connections.

## Why Connection Pooling?

Relational databases have a maximum number of concurrent client connections.

- Postgres allows 100 by default
- MySQL allows 151 by default

In a traditional server environment, you would need a large amount of traffic (and therefore web servers) to exhaust these connections, since each web server instance typically leverages a single connection.

In a Serverless environment, each function connects directly to the database, which can exhaust limits quickly. To prevent connection errors, you should add a connection pooling service in front of your database. Think of it as a load balancer.
