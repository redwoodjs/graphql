---
title: App Configuration
description: Configure your app with redwood.toml
---

# App Configuration: redwood.toml

One of the premier places you can configure your Redwood app is `redwood.toml`. By default, `redwood.toml` lists the following configuration options:

```toml title="redwood.toml"
[web]
  title = "Redwood App"
  port = 8910
  apiUrl = "/.redwood/functions"
  includeEnvironmentVariables = []
[api]
  port = 8911
[browser]
  open = true
[notifications]
  versionUpdates = ["latest"]
```

These are listed by default because they're the ones that you're most likely to configure, but there are plenty more available.

You can think of `redwood.toml` as a frontend for configuring Redwood's build tools.
For certain options, instead of having to configure build tools directly, there's quick access via `redwood.toml`.

## [web]

| Key                           | Description                                                                                                     | Default                                                         |
| :---------------------------- | :-------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `title`                       | Title of your Redwood app                                                                                       | `'Redwood App'`                                                 |
| `port`                        | Port for the web server to listen at                                                                            | `8910`                                                          |
| `apiUrl`                      | URL to your api server. This can be a relative URL in which case it acts like a proxy, or a fully-qualified URL | `'/.redwood/functions'`                                         |
| `includeEnvironmentVariables` | Environment variables made available to the web side during dev and build                                       | `[]`                                                            |
| `host`                        | Hostname for the web server to listen at                                                                        | Defaults to `'0.0.0.0'` in production and `'::'` in development |
| `apiGraphQLUrl`               | URL to your GraphQL function                                                                                    | `'${apiUrl}/graphql'`                                           |
| `apiDbAuthUrl`                | URL to your dbAuth function                                                                                     | `'${apiUrl}/auth'`                                              |
| `sourceMap`                   | Enable source maps for production builds                                                                        | `false`                                                         |
| `a11y`                        | Enable storybook `addon-a11y` and `eslint-plugin-jsx-a11y`                                                      | `true`                                                          |

### Customizing the GraphQL Endpoint

By default, Redwood derives the GraphQL endpoint from `apiUrl` such that it's `${apiUrl}/graphql`, (with the default `apiUrl`, `./redwood/functions/graphql`).
But sometimes you want to host your api side somewhere else.
There's two ways you can do this:

1. Change `apiUrl`:

```toml title="redwood.toml"
[web]
  apiUrl = "https://api.coolredwoodapp.com"
```

Now the GraphQL endpoint is at `https://api.coolredwoodapp.com/graphql`.

2. Change `apiGraphQLUrl`:

```diff title="redwood.toml"
 [web]
   apiUrl = "/.redwood/functions"
+  apiGraphQLUrl = "https://api.coolredwoodapp.com/graphql"
```

### Customizing the dbAuth Endpoint

Similarly, if you're using dbAuth, you may decide to host it somewhere else.
To do this without affecting your other endpoints, you can add `apiDbAuthUrl` to your `redwood.toml`:

```diff title="redwood.toml"
 [web]
   apiUrl = "/.redwood/functions"
+  apiDbAuthUrl = "https://api.coolredwoodapp.com/auth"
```

:::tip

If you host your web and api sides at different domains and don't use a proxy, make sure you have [CORS](./cors.md) configured.
Otherwise browser security features may block client requests.

:::

### includeEnvironmentVariables

`includeEnvironmentVariables` is the set of environment variables that should be available to your web side during dev and build.
Use it to include env vars like public keys for third-party services you've defined in your `.env` file:

```toml title="redwood.toml"
[web]
  includeEnvironmentVariables = ["PUBLIC_KEY"]
```

```text title=".env"
PUBLIC_KEY=...
```

Instead of including them in `includeEnvironmentVariables`, you can also prefix them with `REDWOOD_ENV_` (see [Environment Variables](environment-variables.md#web)).

:::caution `includeEnvironmentVariables` isn't for secrets

Don't make secrets available to your web side. Everything in `includeEnvironmentVariables` is included in the bundle.

:::

## [api]

| Key          | Description                                                                                                                                                                                                                                                                             | Default                                                         |
| :----------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| `port`       | Port for the api server to listen at                                                                                                                                                                                                                                                    | `8911`                                                          |
| `host`       | Hostname for the api server to listen at                                                                                                                                                                                                                                                | Defaults to `'0.0.0.0'` in production and `'::'` in development |
| `schemaPath` | The location of your Prisma schema. If you have [enabled Prisma multi file schemas](https://www.prisma.io/docs/orm/prisma-schema/overview/location#multi-file-prisma-schema), then its value is the directory where your `schema.prisma` can be found, for example: `'./api/db/schema'` | Defaults to `'./api/db/schema.prisma'`                          |
| `debugPort`  | Port for the debugger to listen at                                                                                                                                                                                                                                                      | `18911`                                                         |

Additional server configuration can be done using [Server File](docker.md#using-the-server-file)

### Multi File Schema

Prisma's `prismaSchemaFolder` [feature](https://www.prisma.io/docs/orm/prisma-schema/overview/location#multi-file-prisma-schema) allows you to define multiple files in a schema subdirectory of your prisma directory.

:::note Important
If you wish to [organize your Prisma Schema into multiple files](https://www.prisma.io/blog/organize-your-prisma-schema-with-multi-file-support), you will need [enable](https://www.prisma.io/docs/orm/prisma-schema/overview/location#multi-file-prisma-schema) that feature in Prisma, move your `schema.prisma` file into a new directory such as `./api/db/schema` and then set `schemaPath` in the api toml config.
:::

For example:

```toml title="redwood.toml"
[api]
  port = 8911
  schemaPath = "./api/db/schema"
```

## [browser]

```toml title="redwood.toml"
[browser]
  open = true
```

Setting `open` to `true` opens your browser to `http://${web.host}:${web.port}` (by default, `http://localhost:8910`) after the dev server starts.
If you want your browser to stop opening when you run `yarn rw dev`, set this to `false`.
(Or just remove it entirely.)

There's actually a lot more you can do here. For more, see Vite's docs on [`preview.open`](https://vitejs.dev/config/preview-options.html#preview-open).

## [generate]

```toml title="redwood.toml"
[generate]
  tests = true
  stories = true
```

Many of Redwood's generators create Jest tests or Storybook stories.
Understandably, this can be lot of files, and sometimes you don't want all of them, either because you don't plan on using Jest or Storybook, or are just getting started and don't want the overhead.
These options allows you to disable the generation of test and story files.

## [cli]

```toml title="redwood.toml"
[notifications]
  versionUpdates = ["latest"]
```

There are new versions of the framework all the time—a major every couple months, a minor every week or two, and patches when appropriate.
And if you're on an experimental release line, like canary, there's new versions every day, multiple times.

If you'd like to get notified (at most, once a day) when there's a new version, set `versionUpdates` to include the version tags you're interested in.

## Using Environment Variables in `redwood.toml`

You may find yourself wanting to change keys in `redwood.toml` based on the environment you're deploying to.
For example, you may want to point to a different `apiUrl` in your staging environment.

You can do so with environment variables.
Let's look at an example:

```toml title="redwood.toml"
[web]
  // highlight-start
  title = "App running on ${APP_TITLE}"
  port = "${PORT:8910}"
  apiUrl = "${API_URL:/.redwood/functions}"
  // highlight-end
  includeEnvironmentVariables = []
```

This `${<envVar>:[fallback]}` syntax does the following:

- sets `title` by interpolating the env var `APP_TITLE`
- sets `port` to the env var `PORT`, falling back to `8910`
- sets `apiUrl` to the env var `API_URL`, falling back to `/.redwood/functions` (the default)

That's pretty much all there is to it.
Just remember two things:

1. fallback is always a string
2. these values are interpolated at build time

## Running in a Container or VM

To run a Redwood app in a container or VM, you'll want to set both the web and api's `host` to `0.0.0.0` to allow network connections to and from the host:

```toml title="redwood.toml"
[web]
  host = '0.0.0.0'
[api]
  host = '0.0.0.0'
```

You can also configure these values via `REDWOOD_WEB_HOST` and `REDWOOD_API_HOST`.
And if you set `NODE_ENV` to production, these will be the defaults anyway.
