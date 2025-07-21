# Server File

Redwood v7 introduced a new entry point to Redwood's api server: the server file at `api/src/server.ts`.

It allows you to:

1. have control over how the api server starts,
2. customize the server as much as you want, and
3. minimize the number of dependencies needed to start the api server process (all you need is Node.js!)

Get started by running the setup command:

```
yarn rw setup server-file
```

This should give you a new file at `api/src/server.ts`:

```typescript title="api/src/server.ts"
import { createServer } from '@redwoodjs/api-server'

import { logger } from 'src/lib/logger'

async function main() {
  const server = await createServer({
    logger,
  })

  await server.start()
}

main()
```

Without the server file, to start the api side, you'd use binaries provided by `@redwoodjs/api-server` such as `yarn rw-server api` (you may also see this as `./node_modules/.bin/rw-server api`).

With the server file, there's no indirection. Just use `node`:

```
yarn node api/dist/server.js
```

### Building

You can't run the server file directly with Node.js; it has to be built first:

```
yarn rw build api
```

The api serve stage in the Dockerfile pulls from the api build stage, so things are already in the right order there. Similarly, for `yarn rw dev`, the dev server will build and reload the server file for you.

### Command

That means you will swap the `CMD` instruction in the api server stage:

```diff
  ENV NODE_ENV=production

- CMD [ "node_modules/.bin/rw-server", "api" ]
+ CMD [ "api/dist/server.js" ]
```

:::important
If you are using a [Server File](#using-the-server-file) then you must change the command that runs the `api_serve` service to `./api/dist/server.js` as shown above.

Not updating the command will not completely configure the GraphQL Server and not setup [Redwood Realtime](./realtime.md), if you are using that.
:::

### Configuring the server

There are three ways you may wish to configure the server.

#### Underlying Fastify server

First, you can configure how the underlying Fastify server is instantiated via the`fastifyServerOptions` passed to the `createServer` function:

```ts title="api/src/server.ts"
const server = await createServer({
  logger,
  // highlight-start
  fastifyServerOptions: {
    // ...
  },
  // highlight-end
})
```

For the complete list of options, see [Fastify's documentation](https://fastify.dev/docs/latest/Reference/Server/#factory).

#### Configure the redwood API plugin

Second, you may want to alter the behavior of redwood's API plugin itself. To do this we provide a `configureApiServer(server)` option where you can do anything you wish to the fastify instance before the API plugin is registered. Two examples are given below.

##### Example: Compressing Payloads and Rate Limiting

Let's say that we want to compress payloads and add rate limiting.
We want to compress payloads only if they're larger than 1KB, preferring deflate to gzip,
and we want to limit IP addresses to 100 requests in a five minute window.
We can leverage two Fastify ecosystem plugins, [@fastify/compress](https://github.com/fastify/fastify-compress) and [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) respectively.

First, you'll need to install these packages:

```
yarn workspace api add @fastify/compress @fastify/rate-limit
```

Then register them with the appropriate config:

```ts title="api/src/server.ts"
const server = await createServer({
  logger,
  async configureApiServer(server) {
    await server.register(import('@fastify/compress'), {
      global: true,
      threshold: 1024,
      encodings: ['deflate', 'gzip'],
    })

    await server.register(import('@fastify/rate-limit'), {
      max: 100,
      timeWindow: '5 minutes',
    })
  },
})
```

##### Example: Multipart POSTs

If you try to POST file content to the api server such as images or PDFs, you may see the following error from Fastify:

```json
{
  "statusCode": 400,
  "code": "FST_ERR_CTP_INVALID_CONTENT_LENGTH",
  "error": "Bad Request",
  "message": "Request body size did not match Content-Length"
}
```

This's because Fastify [only supports `application/json` and `text/plain` content types natively](https://www.fastify.io/docs/latest/Reference/ContentTypeParser/).
While Redwood configures the api server to also accept `application/x-www-form-urlencoded` and `multipart/form-data`, if you want to support other content or MIME types (likes images or PDFs), you'll need to configure them here in the server file.

You can use Fastify's `addContentTypeParser` function to allow uploads of the content types your application needs.
For example, to support image file uploads you'd tell Fastify to allow `/^image\/.*/` content types:

```ts title="api/src/server.ts"
const server = await createServer({
  logger,
  configureApiServer(server) {
    server.addContentTypeParser(/^image\/.*/, (_req, payload, done) => {
      payload.on('end', () => {
        done()
      })
    })
  },
})
```

The regular expression (`/^image\/.*/`) above allows all image content or MIME types because [they start with "image"](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types).

Now, when you POST those content types to a function served by the api server, you can access the file content on `event.body`.

Note that for the GraphQL endpoint, using Redwood's built-in [Uploads](uploads.md), multipart requests are already configured.

#### Additional Fastify plugins

Finally, you can register additional Fastify plugins on the server instance:

```ts title="api/src/server.ts"
const server = await createServer({
  logger,
})

// highlight-next-line
server.register(myFastifyPlugin)
```

:::note Fastify encapsulation

Fastify is built around the concept of [encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/). It is important to note that redwood's API plugin cannot be mutated after it is registered, see [here](https://fastify.dev/docs/latest/Reference/Plugins/#asyncawait). This is why you must use the `configureApiServer` option to do as shown above.

:::

### The `start` method

Since there's a few different ways to configure the host and port the server listens at, the server instance returned by `createServer` has a special `start` method:

```ts title="api/src/server.ts"
await server.start()
```

`start` is a thin wrapper around [`listen`](https://fastify.dev/docs/latest/Reference/Server/#listen).
It takes the same arguments as `listen`, except for host and port. It computes those in the following way, in order of precedence:

1. `--apiHost` or `--apiPort` flags:

```
yarn node api/dist/server.js --apiHost 0.0.0.0 --apiPort 8913
```

2. `REDWOOD_API_HOST` or `REDWOOD_API_PORT` env vars:

```
export REDWOOD_API_HOST='0.0.0.0'
export REDWOOD_API_PORT='8913'
yarn node api/dist/server.js
```

3. `[api].host` and `[api].port` in `redwood.toml`:

```toml title="redwood.toml"
[api]
  host = '0.0.0.0'
  port = 8913
```

If you'd rather not have `createServer` parsing `process.argv`, you can disable it via `parseArgv`:

```ts title="api/src/server.ts"
await createServer({
  parseArgv: false,
})
```

And if you'd rather it do none of this, just change `start` to `listen` and specify the host and port inline:

```ts title="api/src/server.ts"
await server.listen({
  host: '0.0.0.0',
  port: 8913,
})
```

If you don't specify a host, `createServer` uses `NODE_ENV` to set it. If `NODE_ENV` is production, it defaults to `'0.0.0.0'` and `'::'` otherwise.
The Dockerfile sets `NODE_ENV` to production so that things work out of the box.
