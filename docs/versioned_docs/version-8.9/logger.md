---
title: Logging
description: Use the Logger to observe your application
---

# Logger

RedwoodJS provides an opinionated logger with sensible, practical defaults that grants you visibility into the applications while you're developing and after you have deployed.

Logging in the serverless ecosystem is not trivial and neither is its configuration. Redwood aims to make this easier.

When choosing a Node.js logger to add to the framework, RedwoodJS required that it:

- Have a low-overhead, and be fast
- Output helpful, readable information in development
- Be highly configurable to set log levels, time formatting, and more
- Support key redaction to prevent passwords or tokens from leaking out
- Save to a file in local (or other) environments that can write to the file system
- Stream to third-party log and application monitoring services vital to production logging in serverless environments like [LogFlare](https://logflare.app/), [Datadog](https://www.datadoghq.com/) or [LogDNA](https://www.logdna.com/)
- Hook into [Prisma logging](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging) to give visibility into connection issues, slow queries, and any unexpected errors
- Have a solid Developer experience (DX) to get logging out-of-the-gate quickly
- Use a compact configuration to set how to log (its `options`) and where to log -- file, stdout, or remote transport stream -- (its `destination`)

With those criteria in mind, Redwood includes [pino](https://github.com/pinojs/pino) with its rich [features](https://github.com/pinojs/pino/blob/master/docs/api.md), [ecosystem](https://github.com/pinojs/pino/blob/master/docs/ecosystem.md) and [community](https://github.com/pinojs/pino/blob/master/docs/ecosystem.md#community).

Plus ... pino means 🌲 pine tree! How perfect is that for RedwoodJS?

Note: RedwoodJS logging is setup for its api side only. For browser and web side error reporting or exception handling, these features will be considered in future releases.

## Quick Start

To start 🌲🪓 api-side logging, just

- import the logger in your service, function, or any other lib
- use `logger` with the level just as you might have with `console`

```jsx title="api/lib/logger.ts"
import { createLogger } from '@redwoodjs/api/logger'

/**
 * Creates a logger. Options define how to log. Destination defines where to log.
 * If no destination, std out.
 */
export const logger = createLogger({})

// then, in your api service, lib, or function
import { logger } from 'src/lib/logger'

//...

logger.trace(`>> items service -> About to save item ${item.name}`)
logger.info(`Saving item ${item.name}`)
logger.debug({ item }, `Item ${item.name} detail`)
logger.warn(item, `Item ${item.id} is missing a name`)
logger.warn(
  { missing: { name: item.name } },
  `Item ${item.id} is missing values`
)
logger.error(error, `Failed to save item`)
```

That's it!

### Manual Setup for RedwoodJS Upgrade

If you are upgrading an existing RedwoodJS app older than v0.28 and would like to include logging, you simply need to copy over files from the "Create Redwood Application" template:

- Copy [`packages/create-redwood-app/template/api/src/lib/logger.ts`](https://github.com/redwoodjs/redwood/blob/main/packages/create-redwood-app/template/api/src/lib/logger.ts) to `api/src/lib/logger.ts`. Required.

For optional Prisma logging:

- Copy [`packages/create-redwood-app/template/api/src/lib/db.ts`](https://github.com/redwoodjs/redwood/blob/main/packages/create-redwood-app/template/api/src/lib/db.ts) and replace `api/src/lib/db.ts` (or `api/src/lib/db.js`). _Optional_.

The first file `logger.ts` defines the logger instance. You will import `logger` and use in your services, functions or other libraries. You may then replace existing `console.log()` statements with `logger.info()` or `logger.debug()`.

The second `db.ts` replaces how the `db` Prisma client instance is declared and exported. It configures Prisma logging, if desired. See below for more information on Prisma logging options.

## Options aka How to Log

In addition to the rich [features](https://github.com/pinojs/pino/blob/master/docs/api.md) that [pino](https://github.com/pinojs/pino) offers, RedwoodJS has added some sensible, practical defaults to make the logger DX first-rate.

### Log Level

One of 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'.

The logger detects your current environment and will default to a sensible minimum log level.

> **_NOTE:_** In Development, the default is `trace` while in Production, the default is `warn`.
> This means that output in your dev server can be verbose, but when you deploy you won't miss out on critical issues.

You can override the default log level via the `LOG_LEVEL` environment variable or the `level` LoggerOption.

The 'silent' level disables logging.

### Troubleshooting

> If you are not seeing log output when deployed, consider setting the level to `info` or `debug`.

```jsx
import { createLogger } from '@redwoodjs/api/logger'

/**
 * Creates a logger with RedwoodLoggerOptions
 *
 * These extend and override default LoggerOptions,
 * can define a destination like a file or other supported pino log transport stream,
 * and sets whether or not to show the logger configuration settings (defaults to false)
 *
 * @param RedwoodLoggerOptions
 *
 * RedwoodLoggerOptions have
 * @param {options} LoggerOptions - defines how to log, such as redaction and format
 * @param {string | DestinationStream} destination - defines where to log, such as a transport stream or file
 * @param {boolean} showConfig - whether to display logger configuration on initialization
 */
export const logger = createLogger({ options: { level: 'info' } })
```

Please refer to the [Pino options documentation](https://github.com/pinojs/pino/blob/master/docs/api.md#options) for a complete list.

### Redaction

Everyone has heard of reports that Company X logged emails, or passwords, to files or systems that may not have been secured. While RedwoodJS logging won't necessarily prevent that, it does provide you with the mechanism to ensure that it won't happen.

To redact sensitive information, you can supply paths to keys that hold sensitive data using the [redact option](https://github.com/pinojs/pino/blob/master/docs/redaction.md).

We've included a default set called the `redactionsList` that includes keys such as

```
  'access_token',
  'accessToken',
  'DATABASE_URL',
  'email',
  'event.headers.authorization',
  'host',
  'jwt',
  'JWT',
  'password',
  'params',
  'secret',
```

You may wish to augment these defaults via the `redact` configuration setting, here adding a Social Security Number and Credit Card Number key to the list.

```jsx
/**
 * Custom redaction list
 */
import { redactionsList } from '@redwoodjs/api/logger'

//...

export const logger = createLogger({
  options: { redact: [...redactionsList, 'ssn,credit_card_number'] },
})
```

Note: Unless you provide the current `redactionsList` with the defaults, just the keys `'ssn,credit_card_number'` will be redacted.

### Log Formatter (formerly known as "Pretty Printing")

> **_Important:_** As of version 0.41, "pretty printing" with pino is no longer supported due to pino having deprecated the `pino-pretty` package and the accepted practice of not pretty printing in production due to overhead and not being able to send these formatted logs to transports.

No log is worth logging if you cannot read it.

RedwoodJS provides a `LogFormatter` that adds color, emoji, time formatting and level reporting so you can quickly see what is going on.

It is based on [pino-colada](https://github.com/lrlna/pino-colada/blob/master/README.md): a cute [ndjson](http://ndjson.org) formatter for [pino](https://github.com/pinojs/pino).

#### Command

The `LogFormatter` is distributed as a bin that can be invoke via the `yarn rw-log-formatter` command

To pipe logs to the formatter:

```bash
echo "{\"level\": 30, \"message\": \"Hello RedwoodJS\"}" | yarn rw-log-formatter
```

Output:

```bash
11:00:28 🌲 Hello RedwoodJS
✨ Done in 0.14s.
```

#### Usage

Log formatting is automatically setup in the `yarn rw dev` command.

```bash
yarn rw dev
```

You may also pipe logs to the formatter when using `rw serve`:

```bash
yarn rw serve | yarn rw-log-formatter
yarn rw serve api | yarn rw-log-formatter
```

> Note: Since `rw serve` sets the Node environment to `production` you will not see log non-warn/error output unless you configure your logging level to `debug` or below.

You'll see that formatted output by default when you launch your RedwoodJS app using:

```bash
yarn rw dev
```

### Examples

The following examples and screenshots show how log formatting output may look in your development environment.

Notice how the emoji help identify the level, such as 🐛 for `debug` and 🌲 for `info`.

#### Basic

Simple request and with basic GraphQL output.

![Screen Shot 2021-12-22 at 1 41 46 PM](https://user-images.githubusercontent.com/1051633/147141091-ab27e5f0-4b90-4114-9452-c095df5e2516.png)

#### With a Custom Payload

Sometimes you will want to log a 🗒 Custom message or payload object that isn't one of the predefined `query` or `data` options.

> In these examples, the `post` is a blog post with a `id`, `title`, `commentCount`, and `description`.

You can use the `custom` option:

```tsx
logger.debug({ custom: post.title }, 'The title of a Post')
```

Or, you can also log a custom object payload:

```tsx
logger.debug(
  {
    custom: {
      title: post.title,
      comments: post.commentCount,
    },
  },
  'Post with count of comments'
)
```

Or, a more nested payload:

```tsx
logger.debug(
  {
    custom: {
      title: post.title,
      details: {
        id: post.id,
        description: post.description,
        comments: post.commentCount,
      },
    },
  },
  'Post details'
)
```

Or, an entire object:

```tsx
logger.debug(
  {
    custom: post,
  },
  'Post details'
)
```

#### With GraphQL Options

Logging with extended GraphQL output that includes:

- 🏷 GraphQL Operation Name
- 🔭 GraphQL Query
- 📦 GraphQL Data

![Screen Shot 2021-12-22 at 1 43 11 PM](https://user-images.githubusercontent.com/1051633/147141089-20a41441-1038-4fee-a599-12f78d83a31d.png)

#### With Prisma Queries

Logging with Prisma query statement output.

![Screen Shot 2021-12-22 at 1 44 20 PM](https://user-images.githubusercontent.com/1051633/147141082-7cfd417a-28bf-4020-8547-96c33972b7ce.png)

#### GraphQL Logging

Redwood-specific [GraphQL log data](graphql.md#logging) included by the the `useRedwoodLogger` envelop plug-in is supported:

- Request Id
- User-Agent
- GraphQL Operation Name
- GraphQL Query
- GraphQL Data

#### Production Logging

By the way, when logging in production, you may want to:

- send the logs as [ndjson](http://ndjson.org) to your host's log handler or application monitoring service to process, store and display. Therefore, you would not format your logs with `LogFormatter`.
- log only `warn` and `errors` to avoid chatty `info` or `debug` messages (that would be better suited for a staging or integration environment)

### Nested Logging

Since you can log metadata information alongside your message as seen in:

```jsx
logger.debug({ item }, `Item ${item.name} detail`)
logger.warn(item, `Item ${item.id} is missing a name`)
logger.warn(
  { missing: { name: item.name } },
  `Item ${item.id} is missing values`
)
logger.error(error, `Failed to save item`)
```

There could be cases where a key in that metadata collides with a key needed by pino or your third-party transport.

To prevent collisions and overwriting values, you can nest your metadata in `log` or `payload` (or some other attribute).

```jsx
nestedKey: 'log',
```

Note: If you use `nestedKey` logging, you will have to manually set any `redact` options to include the `nestedKey` values as a prefix.

For example, if your nestedKey is `'log`, then instead of redacting `email` you will have to redact `log.email`.

### Destination aka Where to Log

The `destination` option allows you to specify where to send the api-side log statements: to standard output, file, or transport stream.

### Dev Server

When in your development environment, logs will be output to the dev server's standard output.

### Log to File

If you are in your development environment (or another environment in which you have write access to the filesystem) you can set the `destination` to the location of your file.

Note: logging to a file is not permitted if deployed to Netlify or Vercel.

```jsx
/**
 * Log to a File
 */
export const logger = createLogger({
  //options: {},
  destination: '/path/to/file/api.log',
})
```

### Transport Streams

Since each serverless function is ephemeral, its logging output is, too. Unless you monitor that function log just at the right time, you'll miss critical warnings, errors, or exceptions.

It's recommended then to log to a "transport" stream when deployed to production so that logs are stored and searchable.

Pino offers [several transports](https://github.com/pinojs/pino/blob/HEAD/docs/transports.md#known-transports) that can send your logs to a remote destination. A ["transport"](https://github.com/pinojs/pino/blob/HEAD/docs/transports.md) for pino is a supplementary tool which consumes pino logs.

See below for examples of how to configure Logflare and Datadog.

Note that not all [known pino transports](https://github.com/pinojs/pino/blob/HEAD/docs/transports.md#known-transports) can be used in a serverless environment.

## Default Configuration Overview

RedwoodJS provides an opinionated logger with sensible, practical defaults. These include:

- Colorize and emojify output with a custom LogFormatter
- Ignore certain event attributes like hostname and pid for cleaner log statements
- Prefix the log output with log level
- Use a shorted log message that omits server name
- Humanize time in GMT
- Set the default log level in dev or test to trace
- Set the default log level in prod to warn
- Note you may override the default log level via the LOG_LEVEL environment variable
- Redact the host and other keys via a set redactionsList

## Configuration Examples

Some examples of common configurations and overrides that demonstrate how you can have control over both how and where you log.

### Override Log Level

You can set the minimum [level](#log-level) to log via the `level` option. This is useful if you need to override the default Production settings (just `warn` and `error`) to in this case `debug`.

```jsx
/**
 * Override minimum log level to debug
 */
export const logger = createLogger({
  options: { level: 'debug' },
})
```

### Customize a Redactions List

While the logger provides a default redaction list, you can specify additional keys to redact by either appending them to the list or setting the `redact` option to a new array of keys.

Please see [pino's redaction documentation](https://github.com/pinojs/pino/blob/master/docs/redaction.md) for other `redact` options, such as removing both keys and values and path matching.

```jsx
/**
 * Customize a redactions list to add `my_secret_key`
 */
import { redactionsList } from '@redwoodjs/api/logger'

export const logger = createLogger({
  options: { redact: [...redactionsList, 'my_secret_key'] },
})
```

### Log to a Physical File

If in your development environment or another environment in which you have write access to the filesystem, can can set the `destination` to the location of your file.

Note: logging to a file is not permitted if deployed to Netlify or Vercel.

```jsx
/**
 * Log to a File
 */
export const logger = createLogger({
  options: {},
  destination: '/path/to/file/api.log',
})
```

### Customize your own Transport Stream Destination, eg: with Honeybadger

If `pino` doesn't have a transport package for your service, you can write one with the class `Write` from the `stream` package. You can adapt this example to your own logging needs but here, we will use [Honeybadger.io](https://honeybadger.io).

- Install the `stream` package into `api`

```shell
yarn workspace api add stream
```

- Install the `honeybadger-io/js` package into `api`, or any other package that suits you

```shell
yarn workspace api add @honeybadger-io/js
```

- Import both `stream` and `@honeybadger-io/js` into `api/src/lib/logger.ts`

```jsx
import { createLogger } from '@redwoodjs/api/logger'
import { Writable } from 'stream'

const Honeybadger = require('@honeybadger-io/js')

Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
})

const HoneybadgerStream = () => {
  const stream = new Writable({
    write(chunk: any, encoding: BufferEncoding, fnOnFlush: (error?: Error | null) => void) {
      Honeybadger.notify(chunk.toString())
      fnOnFlush()
    },
  })

  return stream
}

/**
 * Creates a logger. Options define how to log. Destination defines where to log.
 * If no destination, std out.
 */
export const logger = createLogger({
  options: { level: 'debug' },
  destination: HoneybadgerStream(),
})
```

- For the sake of our example, make sure you have a `HONEYBADGER_API_KEY` variable in your environment.

Documentation on the `Write` class can be found here: [https://nodejs.org/api/stream.html](https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback)

### Log to Datadog using a Transport Stream Destination

To stream your logs to [Datadog](https://www.datadoghq.com/), you can

- Install the [`pino-datadog`](https://www.npmjs.com/package/pino-datadog) package into `api`

```bash
yarn workspace api add pino-datadog
```

- Import `pino-datadog` into `api/src/lib/logger.ts`
- Configure the `stream` with your API key and [settings](https://github.com/ovhemert/pino-datadog/blob/master/docs/API.md)
- Set the logger `destination` to the `stream`

```jsx
/**
 * Stream logs to Datadog
 */
// api/src/lib/logger.ts
import datadog from 'pino-datadog'

/**
 * Creates a synchronous pino-datadog stream
 *
 * @param {object} options - Datadog options including your account's API Key
 *
 * @typedef {DestinationStream}
 */
export const stream = datadog.createWriteStreamSync({
  apiKey: process.env.DATADOG_API_KEY,
  ddsource: 'my-source-name',
  ddtags: 'tag,not,it',
  service: 'my-service-name',
  size: 1,
})

/**
 * Creates a logger with RedwoodLoggerOptions
 *
 * These extend and override default LoggerOptions,
 * can define a destination like a file or other supported pino log transport stream,
 * and sets whether or not to show the logger configuration settings (defaults to false)
 *
 * @param RedwoodLoggerOptions
 *
 * RedwoodLoggerOptions have
 * @param {options} LoggerOptions - defines how to log, such as redaction and format
 * @param {string | DestinationStream} destination - defines where to log, such as a transport stream or file
 * @param {boolean} showConfig - whether to display logger configuration on initialization
 */
export const logger = createLogger({
  options: {},
  destination: stream,
})
```

### Log to Logflare using a Transport Stream Destination

- Install the [`pino-logflare`](https://www.npmjs.com/package/pino-logflare) package into `api`

```bash
yarn workspace api add pino-logflare
```

- Import `pino-logflare` into `api/src/lib/logger.ts`
- Configure the `stream` with your [API key and sourceToken](https://github.com/Logflare/pino-logflare/blob/master/docs/API.md)
- Set the logger `destination` to the `stream`

```jsx title="api/src/lib/logger.ts"
import { createWriteStream } from 'pino-logflare'

/**
 * Creates a pino-logflare stream
 *
 * @param {object} options - Logflare options including
 * your account's API Key and source token id
 *
 * @typedef {DestinationStream}
 */
export const stream = createWriteStream({
  apiKey: process.env.LOGFLARE_API_KEY,
  sourceToken: process.env.LOGFLARE_SOURCE_TOKEN,
})

export const logger = createLogger({
  options: {},
  destination: stream,
})
```

### Log to logDNA using a Transport Stream Destination

- Install the [pino-logdna](https://www.npmjs.com/package/pino-logdna) package into `api`

```bash
yarn workspace api add pino-logdna
```

- Import `pino-logdna` into `api/src/lib/logger.ts`
- Configure the `stream` with your [ingestion key](https://github.com/Logflare/pino-logflare/blob/master/docs/API.md)
- Set the logger `destination` to the `stream`

```jsx title="api/src/lib/logger.ts"
import pinoLogDna from 'pino-logdna'

const stream = pinoLogDna({
  key: process.env.LOGDNA_INGESTION_KEY,
  onError: console.error,
})

/**
 * Creates a logger with RedwoodLoggerOptions
 *
 * These extend and override default LoggerOptions,
 * can define a destination like a file or other supported pino log transport stream,
 * and sets whether or not to show the logger configuration settings (defaults to false)
 *
 * @param RedwoodLoggerOptions
 *
 * RedwoodLoggerOptions have
 * @param {options} LoggerOptions - defines how to log, such as redaction and format
 * @param {string | DestinationStream} destination - defines where to log, such as a transport stream or file
 * @param {boolean} showConfig - whether to display logger configuration on initialization
 */
export const logger = createLogger({
  options: {},
  destination: stream,
})
```

### Log to Papertrail using a Transport Stream Destination

- Install the [pino-papertrail](https://www.npmjs.com/package/pino-papertrail) package into `api`

```bash
yarn workspace api add pino-papertrail
```

- Import `pino-papertrail` into `logger.ts`
- Configure the `stream` in your Papertrail `options` with your appname's [configuration settings](https://github.com/ovhemert/pino-papertrail/blob/master/docs/API.md#options)
- Set the logger `destination` to the `stream`

```jsx
import papertrail from 'pino-papertrail'

const stream = papertrail.createWriteStream({
  appname: 'my-app',
  host: '*****.papertrailapp.com',
  port: '*****',
})

/**
 * Creates a logger with RedwoodLoggerOptions
 *
 * These extend and override default LoggerOptions,
 * can define a destination like a file or other supported pino log transport stream,
 * and sets whether or not to show the logger configuration settings (defaults to false)
 *
 * @param RedwoodLoggerOptions
 *
 * RedwoodLoggerOptions have
 * @param {options} LoggerOptions - defines how to log, such as redaction and format
 * @param {string | DestinationStream} destination - defines where to log, such as a transport stream or file
 * @param {boolean} showConfig - whether to display logger configuration on initialization
 */
export const logger = createLogger({
  options: {},
  destination: stream,
})
```

## Papertrail Options

You can pass the [following properties](https://github.com/ovhemert/pino-papertrail/blob/master/docs/API.md) in an options object:

| Property                                                | Type              | Description                                         |
| ------------------------------------------------------- | ----------------- | --------------------------------------------------- |
| appname (default: pino)                                 | string            | Application name                                    |
| host (default: localhost)                               | string            | Papertrail destination address                      |
| port (default: 1234)                                    | number            | Papertrail destination port                         |
| connection (default: udp)                               | string            | Papertrail connection method (tls/tcp/udp)          |
| echo (default: true)                                    | boolean           | Echo messages to the console                        |
| message-only (default: false)                           | boolean           | Only send msg property as message to papertrail     |
| backoff-strategy (default: `new ExponentialStrategy()`) | [BackoffStrategy] | Retry backoff strategy for any tls/tcp socket error |

[backoffstrategy]: https://github.com/MathieuTurcotte/node-backoff#interface-backoffstrategy

### Prisma Logging

Redwood declares an instance of the PrismaClient

Prisma is configured to log at the:

- info
- warn
- error

levels via `emitLogLevels`.

One may also log _every_ query by adding the `query` level to

```jsx
log: emitLogLevels(['info', 'warn', 'error', 'query']),
```

If you wish to remove `info` logging, then you can define a set of levels, such as `['warn', 'error']`.

To configure Prisma logging, you first create the client and set the `log` options to emit the levels you wish to be logged via `emitLogLevels`. Second, you instruct the `logger` to handle the events emitted by the Prisma client in `handlePrismaLogging` setting the instance of the Prisma Client you've created in `db`, the `logger` instances, and then the same levels you've told the client to emit.

Both `emitLogLevels` and `handlePrismaLogging` are `@redwoodjs/api/logger` package exports.

```jsx
/*
 * Instance of the Prisma Client
 */
export const db = new PrismaClient({
  log: emitLogLevels(['info', 'warn', 'error']),
})

handlePrismaLogging({
  db,
  logger,
  logLevels: ['info', 'warn', 'error'],
})
```

See: The Prisma Client References documentation on [Logging](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#log).

#### Slow Queries

If `query` Prisma level logging is enabled and the `debug` level is enabled on the Logger then all query statements will be logged.

Otherwise, any query exceeding a threshold duration will be logged on the `warn` level.

The default threshold duration is 2 seconds. You can also pass `slowQueryThreshold` as an option to customize this duration when setting up Prisma logger. For example:

```jsx
handlePrismaLogging({
  db,
  logger,
  logLevels: ['query', 'info', 'warn', 'error'],
  slowQueryThreshold: 5_000, // in ms
})
```

### Advanced Use

There are situations when you may wish to add information to every log statement.

This may be accomplished via [child loggers](https://github.com/pinojs/pino/blob/master/docs/child-loggers.md).

#### GraphQL Service / Event Logger

Examples to come. (PRs welcome.)

#### Flushing the Log

Flush the content of the buffer when an asynchronous destination:

```jsx
logger.flush()
```

The use case is primarily for asynchronous logging, which may buffer log lines while others are being written.

#### Child Loggers

A child logger let's you add information to every log statement output.

See: [pino's Child Loggers documentation](https://github.com/pinojs/pino/blob/master/docs/child-loggers.md)

For example:

```jsx
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const userExamples = ({}, { info }) => {
  // Adds path to the log
  const childLogger = logger.child({ path: info.fieldName })
  childLogger.trace('I am in find many user examples resolver')
  return db.userExample.findMany()
}

export const userExample = async ({ id }, { info }) => {
  // Adds id and the path to the log
  const childLogger = logger.child({ id, path: info.fieldName })
  childLogger.trace('I am in the find a user example by id resolver')
  const result = await db.userExample.findUnique({
    where: { id },
  })

  // Since this is the child logger, here id and path will be included as well
  childLogger.debug({ ...result }, 'This is the detail for the user')

  return result
}
```

The Redwood logger uses a child logger to inject the Prisma Client version into every Prisma log statement:

```jsx
logger.child({
  prisma: { clientVersion: db['_clientVersion'] },
})
```
