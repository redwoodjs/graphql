---
description: Redwood's Dockerfile
---

# Docker

If you're not familiar with Docker, we recommend going through their [getting started](https://docs.docker.com/get-started/) documentation.

## Set up

To get started, run the setup command:

```
yarn rw setup docker
```

The setup commands does several things:

- writes four files: `Dockerfile`, `.dockerignore`, `docker-compose.dev.yml`, and `docker-compose.prod.yml`
- adds the `@redwoodjs/api-server` and `@redwoodjs/web-server` packages to the api and web sides respectively
- edits the `browser.open` setting in the `redwood.toml` (right now, if it's set to `true`, it'll break the dev server when running the `docker-compose.dev.yml`)

## Usage

You can start the dev compose file with:

```
docker compose -f ./docker-compose.dev.yml up
```

And the prod compose file with:

```
docker compose -f ./docker-compose.prod.yml up
```

:::info make sure to specify build args

If your api side or web side depend on env vars at build time, you may need to supply them as `--build-args`, or in the compose files.

This is often the most tedious part of setting up Docker. Have ideas of how it could be better? Let us know on the [forums](https://community.redwoodjs.com/)!

:::

The first time you do this, you'll have to use the `console` stage to go in and migrate the database—just like you would with a Redwood app on your machine:

```
docker compose -f ./docker-compose.dev.yml run --rm -it console /bin/bash
root@...:/home/node/app# yarn rw prisma migrate dev
```

:::info database choice
The docker setup command assumes that you are using Postgres as your database provider and sets up a local Postgres database for you. You may have to switch from SQLite to Postgres if you have not done so and want to continue with the default setup.
:::

:::important
If you are using a [Server File](server-file.md) then you should [change the command](#command) that runs the `api_serve` service.
:::

## Dockerfile

The documentation here goes through and explains every line of Redwood's Dockerfile.
If you'd like to see the whole Dockerfile for reference, you can find it [here](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/commands/setup/docker/templates/Dockerfile) or by setting it up in your project: `yarn rw setup docker`.

Redwood takes advantage of [Docker's multi-stage build support](https://docs.docker.com/build/building/multi-stage/) to keep the final production images lean.

### The `base` stage

The `base` stage installs dependencies.
It's used as the base image for the build stages and the `console` stage.

```Dockerfile
FROM node:20-bookworm-slim as base
```

We use a Node.js 20 image as the base image because that's the version Redwood targets.
"bookworm" is the codename for the current stable distribution of Debian (version 12).
Lastly, the "slim" variant of the `node:20-bookworm` image only includes what Node.js needs which reduces the image's size while making it more secure.

:::tip Why not alpine?

While alpine may be smaller, it uses musl, a different C standard library.
In developing this Dockerfile, we prioritized security over size.

If you know what you're doing feel free to change this—it's your Dockerfile now!
Just remember to change the `apt-get` instructions further down too if needed.

:::

Moving on, next we have `corepack enable`:

```Dockerfile
RUN corepack enable
```

[Corepack](https://nodejs.org/docs/latest-v18.x/api/corepack.html), Node's manager for package managers, needs to be enabled so that Yarn can use the `packageManager` field in your project's root `package.json` to pick the right version of itself.
If you'd rather check in the binary, you still can, but you'll need to remember to copy it over (i.e. `COPY --chown=node:node .yarn/releases .yarn/releases`).

```Dockerfile
RUN apt-get update && apt-get install -y \
    openssl \
    # python3 make gcc \
    && rm -rf /var/lib/apt/lists/*
```

The `node:20-bookworm-slim` image doesn't have [OpenSSL](https://www.openssl.org/), which [seems to be a bug](https://github.com/nodejs/docker-node/issues/1919).
(It was included in the "bullseye" image, the codename for Debian 11.)
On Linux, [Prisma needs OpenSSL](https://www.prisma.io/docs/reference/system-requirements#linux-runtime-dependencies), so we install it here via Ubuntu's package manager APT.
Python and its dependencies are there ready to be uncommented if you need them. See the [Troubleshooting](#python) section for more information.

[It's recommended](https://docs.docker.com/develop/develop-images/instructions/#apt-get) to combine `apt-get update` and `apt-get install -y` in the same `RUN` statement for cache busting.
After installing, we clean up the apt cache to keep the layer lean. (Running `apt-get clean` isn't required—[official Debian images do it automatically](https://github.com/moby/moby/blob/03e2923e42446dbb830c654d0eec323a0b4ef02a/contrib/mkimage/debootstrap#L82-L105).)

```Dockerfile
USER node
```

This and subsequent `chown` options in `COPY` instructions are for security.
[Services that can run without privileges should](https://docs.docker.com/develop/develop-images/instructions/#user).
The Node.js image includes a user, `node`, created with an explicit `uid` and `gid` (`1000`).
We reuse it.

```Dockerfile
WORKDIR /home/node/app

COPY --chown=node:node .yarnrc.yml .
COPY --chown=node:node package.json .
COPY --chown=node:node api/package.json api/
COPY --chown=node:node web/package.json web/
COPY --chown=node:node yarn.lock .
```

Here we copy the minimum set of files that the `yarn install` step needs.
The order isn't completely arbitrary—it tries to maximize [Docker's layer caching](https://docs.docker.com/build/cache/).
We expect `yarn.lock` to change more than the `package.json`s and the `package.json`s to change more than `.yarnrc.yml`.
That said, it's hard to argue that these files couldn't be arranged differently, or that the `COPY` instructions couldn't be combined.
The important thing is that they're all here, before the `yarn install` step:

```Dockerfile
RUN mkdir -p /home/node/.yarn/berry/index
RUN mkdir -p /home/node/.cache

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache,uid=1000 \
    --mount=type=cache,target=/home/node/.cache,uid=1000 \
    CI=1 yarn install
```

This step installs all your project's dependencies—production and dev.
Since we use multi-stage builds, your production images won't pay for the dev dependencies installed in this step.
The build stages need the dev dependencies.

The `mkdir` steps are a workaround for a permission error. We're working on removing them, but for now if you remove them the install step will probably fail.

This step is a bit more involved than the others.
It uses a [cache mount](https://docs.docker.com/build/cache/#use-your-package-manager-wisely).
Yarn operates in three steps: resolution, fetch, and link.
If you're not careful, the cache for the fetch step basically doubles the number of `node_modules` installed on disk.
We could disable it all together, but by using a cache mount, we can still get the benefits without paying twice.
We set it to the default directory here, but you can change its location in `.yarnrc.yml`.
If you've done so you'll have to change it here too.

One more thing to note: without setting `CI=1`, depending on the deploy provider, yarn may think it's in a TTY, making the logs difficult to read. With this set, yarn adapts accordingly.
Enabling CI enables [immutable installs](https://v3.yarnpkg.com/configuration/yarnrc#enableImmutableInstalls) and [inline builds](https://v3.yarnpkg.com/configuration/yarnrc#enableInlineBuilds), both of which are highly recommended.

```Dockerfile
COPY --chown=node:node redwood.toml .
COPY --chown=node:node graphql.config.js .
COPY --chown=node:node .env.defaults .env.defaults
```

We'll need these config files for the build and production stages.
The `redwood.toml` file is Redwood's de-facto config file.
Both the build and serve stages read it to enable and configure functionality.

:::warning `.env.defaults` is ok to include but `.env` is not

If you add a secret to the Dockerfile, it can be excavated.
While it's technically true that multi stage builds add a sort of security layer, it's not a best practice.
Leave them out and look to your deploy provider for further configuration.

:::

### The `api_build` stage

The `api_build` stage builds the api side:

```Dockerfile
FROM base as api_build

# If your api side build relies on build-time environment variables,
# specify them here as ARGs.
#
# ARG MY_BUILD_TIME_ENV_VAR

COPY --chown=node:node api api
RUN yarn rw build api
```

After the work we did in the base stage, building the api side amounts to copying in the api directory and running `yarn rw build api`.

### The `api_serve` stage

The `api_serve` stage serves your GraphQL api and functions:

```Dockerfile
FROM node:20-bookworm-slim as api_serve

RUN corepack enable

RUN apt-get update && apt-get install -y \
    openssl \
    # python3 make gcc \
    && rm -rf /var/lib/apt/lists/*
```

We don't start from the `base` stage, but begin anew with the `node:20-bookworm-slim` image.
Since this is a production stage, it's important for it to be as small as possible.
Docker's [multi-stage builds](https://docs.docker.com/build/building/multi-stage/) enables this.

```Dockerfile
USER node
WORKDIR /home/node/app

COPY --chown=node:node .yarnrc.yml .yarnrc.yml
COPY --chown=node:node package.json .
COPY --chown=node:node api/package.json api/
COPY --chown=node:node yarn.lock yarn.lock
```

Like other `COPY` instructions, ordering these files with care enables layering caching.

```Dockerfile
RUN mkdir -p /home/node/.yarn/berry/index
RUN mkdir -p /home/node/.cache

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache,uid=1000 \
    --mount=type=cache,target=/home/node/.cache,uid=1000 \
    CI=1 yarn workspaces focus api --production
```

This is a critical step for image size.
We don't use the regular `yarn install` command.
Using the [official workspaces plugin](https://github.com/yarnpkg/berry/tree/master/packages/plugin-workspace-tools)—which is included by default in yarn v4—we "focus" on the api workspace, only installing its production dependencies.

The cache mount will be populated at this point from the install in the `base` stage, so the fetch step should fly by.

```Dockerfile
COPY --chown=node:node redwood.toml .
COPY --chown=node:node graphql.config.js .
COPY --chown=node:node .env.defaults .env.defaults

COPY --chown=node:node --from=api_build /home/node/app/api/dist /home/node/app/api/dist
COPY --chown=node:node --from=api_build /home/node/app/api/db /home/node/app/api/db
COPY --chown=node:node --from=api_build /home/node/app/node_modules/.prisma /home/node/app/node_modules/.prisma
```

Here's where we really take advantage of multi-stage builds by copying from the `api_build` stage.
At this point all the building has been done. Now we can just grab the artifacts without having to lug around the dev dependencies.

There's one more thing that was built: the prisma client in `node_modules/.prisma`.
We need to grab it, too.

Lastly, the default command is to start the api server using the bin from the `@redwoodjs/api-server` package.
You can override this command if you have more specific needs.

```Dockerfile
ENV NODE_ENV=production

# default api serve command
# ---------
# If you are using a custom server file, you must use the following
# command to launch your server instead of the default api-server below.
# This is important if you intend to configure GraphQL to use Realtime.
#
# CMD [ "./api/dist/server.js" ]
CMD [ "node_modules/.bin/rw-server", "api" ]
```

:::important
If you are using a [Server File](#using-the-server-file) then you must change the command that runs the `api_serve` service to `./api/dist/server.js` as shown above.

Not updating the command will not completely configure the GraphQL Server and not setup [Redwood Realtime](./realtime.md), if you are using that.
:::

Note that the Redwood CLI isn't available anymore because it is a dev dependency.
To access the server bin, we have to find its path in `node_modules`.
Though this is somewhat discouraged in modern yarn, since we're using the `node-modules` node linker, it's in `node_modules/.bin`.

### The `web_build` stage

This `web_build` builds the web side:

```Dockerfile
FROM base as web_build

COPY --chown=node:node web web
RUN yarn rw build web --no-prerender
```

After the work we did in the base stage, building the web side amounts to copying in the web directory and running `yarn rw build web`.

This stage is a bit of a simplification.
It foregoes Redwood's prerendering (SSG) capability.
Prerendering is a little trickier; see [the `web_prerender_build` stage](#the-web_prerender_build-stage).

If you've included environment variables in your `redwood.toml`'s `web.includeEnvironmentVariables` field, you'll want to specify them as ARGs here.
The setup command should've inlined them for you.

### The `web_prerender_build` stage

The `web_prerender_build` stage builds the web side with prerender.

```Dockerfile
FROM api_build as web_build_with_prerender

COPY --chown=node:node web web
RUN yarn rw build web
```

Building the web side with prerendering poses a challenge.
Prerender needs the api side around to get data for your Cells and route hooks.
The key line here is the first one—this stage uses the `api_build` stage as its base image.

### The `web_serve` stage

```Dockerfile
FROM node:20-bookworm-slim as web_serve

RUN corepack enable

USER node
WORKDIR /home/node/app

COPY --chown=node:node .yarnrc.yml .
COPY --chown=node:node package.json .
COPY --chown=node:node web/package.json web/
COPY --chown=node:node yarn.lock .

RUN mkdir -p /home/node/.yarn/berry/index
RUN mkdir -p /home/node/.cache

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache,uid=1000 \
    --mount=type=cache,target=/home/node/.cache,uid=1000 \
    CI=1 yarn workspaces focus web --production

COPY --chown=node:node redwood.toml .
COPY --chown=node:node graphql.config.js .
COPY --chown=node:node .env.defaults .env.defaults

COPY --chown=node:node --from=web_build /home/node/app/web/dist /home/node/app/web/dist

ENV NODE_ENV=production \
    API_PROXY_TARGET=http://api:8911

CMD "node_modules/.bin/rw-web-server" "--api-proxy-target" "$API_PROXY_TARGET"
```

Most of this stage is similar to the `api_serve` stage, except that we're copying from the `web_build` stage instead of the `api_build`.
(If you're prerendering, you'll want to change the `--from=web_build` to `--from=web_prerender_build`.)

The binary we're using here to serve the web side is `rw-web-server` which comes from the `@redwoodjs/web-server` package.
While this web server will be much more fully featured in the future, right now it's mostly just to get you going.
Ideally you want to put a web server like Nginx or Caddy in front of it.

Lastly, note that we use the shell form of `CMD` here for its variable expansion.

### The `console` stage

The `console` stage is an optional stage for debugging:

````Dockerfile
FROM base as console

# To add more packages:
#
# ```
# USER root
#
# RUN apt-get update && apt-get install -y \
#     curl
#
# USER node
# ```

COPY --chown=node:node api api
COPY --chown=node:node web web
COPY --chown=node:node scripts scripts
````

The console stage completes the base stage by copying in the rest of your Redwood app.
But then it pretty much leaves you to your own devices.
The intended way to use it is to create an ephemeral container by starting a shell like `/bin/bash` in the image built by targeting this stage:

```bash
# Build the console image:
docker build . -t console --target console
# Start an ephemeral container from it:
docker run --rm -it console /bin/bash
```

As the comment says, feel free to add more packages.
We intentionally kept them to a minimum in the base stage, but you shouldn't worry about the size of the image here.

## Troubleshooting

### Python

We tried to make the Dockerfile as lean as possible.
In some cases, that means we excluded a dependency your project needs.
And by far the most common is Python.

During a stage's `yarn install` step (`RUN ... yarn install`), if you see an error like the following:

```
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python Python is not set from command line or npm configuration
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python Python is not set from environment variable PYTHON
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python checking if "python3" can be used
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - executable path is ""
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - "" could not be run
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python checking if "python" can be used
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - executable path is ""
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - "" could not be run
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python **********************************************************
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python You need to install the latest version of Python.
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python Node-gyp should be able to find and use Python. If not,
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python you can try one of the following options:
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - Use the switch --python="/path/to/pythonexecutable"
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python (accepted by both node-gyp and npm)
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - Set the environment variable PYTHON
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python - Set the npm configuration variable python:
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python npm config set python "/path/to/pythonexecutable"
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python For more information consult the documentation at:
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python https://github.com/nodejs/node-gyp#installation
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python **********************************************************
➤ YN0000: │ bufferutil@npm:4.0.8 STDERR gyp ERR! find Python
```

It's because your project depends on Python and the image doesn't provide it.

It's easy to fix: just add `python3` and its dependencies (usually `make` and `gcc`):

```diff
  FROM node:20-bookworm-slim as base

  RUN apt-get update && apt-get install -y \
      openssl \
+     python3 make gcc \
      && rm -rf /var/lib/apt/lists/*
```

Not sure why your project depends on Python? `yarn why` is your friend.
From the error message, we know `bufferutil` couldn't build.
But why do we have `bufferutil`?

```
yarn why bufferutil
└─ websocket@npm:1.0.34
   └─ bufferutil@npm:4.0.8 (via npm:^4.0.1)
```

`websocket` needs `bufferutil`. But why do we have `websocket`?
Keep pulling the thread till you get to a top-level dependency:

```
yarn why websocket
└─ @supabase/realtime-js@npm:2.8.4
   └─ websocket@npm:1.0.34 (via npm:^1.0.34)

yarn why @supabase/realtime-js
└─ @supabase/supabase-js@npm:2.38.4
   └─ @supabase/realtime-js@npm:2.8.4 (via npm:^2.8.4)

yarn why @supabase/supabase-js
├─ api@workspace:api
│  └─ @supabase/supabase-js@npm:2.38.4 (via npm:^2.21.0)
│
└─ web@workspace:web
   └─ @supabase/supabase-js@npm:2.38.4 (via npm:^2.21.0)
```

In this case, it looks like it's ultimately because of our auth provider, `@supabase/supabase-js`.

## Using the server file

Sometimes you will want additional control over the API server, perhaps adding content type parsers, or Fastify plugins.

Refer to our [Server File](server-file.md) for details on how to make use of this.
