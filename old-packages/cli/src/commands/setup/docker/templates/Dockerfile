# base
# ----
FROM node:20-bookworm-slim as base

RUN corepack enable

# We tried to make the Dockerfile as lean as possible. In some cases, that means we excluded a dependency your project needs.
# By far the most common is Python. If you're running into build errors because `python3` isn't available,
# add `python3 make gcc \` before the `openssl \` line below and in other stages as necessary:
RUN apt-get update && apt-get install -y \
  openssl \
  && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /home/node/app

COPY --chown=node:node .yarnrc.yml .
COPY --chown=node:node package.json .
COPY --chown=node:node api/package.json api/
COPY --chown=node:node web/package.json web/
COPY --chown=node:node yarn.lock .

RUN mkdir -p /home/node/.yarn/berry/index
RUN mkdir -p /home/node/.cache

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache,uid=1000 \
  --mount=type=cache,target=/home/node/.cache,uid=1000 \
  CI=1 yarn install

COPY --chown=node:node redwood.toml .
COPY --chown=node:node graphql.config.js .
COPY --chown=node:node .env.defaults .env.defaults

# api build
# ---------
FROM base as api_build

# If your api side build relies on build-time environment variables,
# specify them here as ARGs. (But don't put secrets in your Dockerfile!)
#
# ARG MY_BUILD_TIME_ENV_VAR

COPY --chown=node:node api api
RUN yarn rw build api

# web prerender build
# -------------------
FROM api_build as web_build_with_prerender

COPY --chown=node:node web web
RUN yarn rw build web

# web build
# ---------
FROM base as web_build

COPY --chown=node:node web web
RUN yarn rw build web --no-prerender

# api serve
# ---------
FROM node:20-bookworm-slim as api_serve

RUN corepack enable

RUN apt-get update && apt-get install -y \
  openssl \
  && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /home/node/app

COPY --chown=node:node .yarnrc.yml .
COPY --chown=node:node package.json .
COPY --chown=node:node api/package.json api/
COPY --chown=node:node yarn.lock .

RUN mkdir -p /home/node/.yarn/berry/index
RUN mkdir -p /home/node/.cache

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache,uid=1000 \
  --mount=type=cache,target=/home/node/.cache,uid=1000 \
  CI=1 yarn workspaces focus api --production

COPY --chown=node:node redwood.toml .
COPY --chown=node:node graphql.config.js .
COPY --chown=node:node .env.defaults .env.defaults

COPY --chown=node:node --from=api_build /home/node/app/api/dist /home/node/app/api/dist
COPY --chown=node:node --from=api_build /home/node/app/api/db /home/node/app/api/db
COPY --chown=node:node --from=api_build /home/node/app/node_modules/.prisma /home/node/app/node_modules/.prisma

ENV NODE_ENV=production

# default api serve command
# ---------
# If you are using a custom server file, you must use the following
# command to launch your server instead of the default api-server below.
# This is important if you intend to configure GraphQL to use Realtime.
#
# CMD [ "./api/dist/server.js" ]
CMD [ "node_modules/.bin/rw-server", "api" ]

# web serve
# ---------
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

# We use the shell form here for variable expansion.
CMD "node_modules/.bin/rw-web-server" "--api-proxy-target" "$API_PROXY_TARGET"

# console
# -------
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
