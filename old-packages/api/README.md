# API

## Purpose and Vision

Redwood believes the future is serverless and multi-client. And `@redwoodjs/api` makes Redwood serverless and multi-client ready. Redwood has one API to rule them all. Your API is abstracted away from any one side of your application, so you can have as many sides as you need, and when you need them.

Right now, the `@redwoodjs/api` package exposes functions that help with logging, services, data fetching via Prisma, webhooks and authentication.

We also plan to make Functions platform-agnostic. At the moment, we're targeting AWS Lambda, but we aim to provide a single interface for other providers and build-time support when you've targeted them.

## Package Lead

[@peterp](https://github.com/peterp/)
[@dthyresson](https://github.com/dthyresson/)

### Logging

RedwoodJS provides an opinionated logger with sensible, practical defaults that grants you visibility into the JAMStack applications you're developing and have deployed -- with ease.

Logging in the serverless ecosystem is not trivial and neither is its configuration.

When choosing a Node.js logger to add to the framework, RedwoodJS required that it:

- Have a low-overhead, and be fast
- Output helpful, readable information in development
- Be highly configurable to set log levels, time formatting, and more
- Support key redaction to prevent passwords or tokens from leaking out
- Save to a file in local (or other) environments that can write to the file system
- Stream to third-party log and application monitoring services vital to production logging in serverless environments like [logFlare](https://logflare.app/) and [Datadog](https://www.datadoghq.com/)
- Hook into [Prisma logging](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging) to give visibility into connection issues, slow queries, and any unexpected errors
- Have a solid Developer experience (DX) to get logging out-of-the-gate quickly
- Use a compact configuration to set how to log (its `options`) and where to log -- file, stdout, or remote transport stream -- (its `destination`)

With those criteria in mind, Redwood includes [pino](https://github.com/pinojs/pino) with its rich [features](https://github.com/pinojs/pino/blob/master/docs/api.md), [ecosystem](https://github.com/pinojs/pino/blob/master/docs/ecosystem.md) and [community](https://github.com/pinojs/pino/blob/master/docs/ecosystem.md#community).

Plus ... pino means 🌲 pine tree! How perfect is that for RedwoodJS?

Note: RedwoodJS logging is setup for its api side only. For browser and web side error reporting or exception handling, these features will be addressed in a future release.

For detailed logger configuration, see the RedwoodJS logger package [README](./src/logger/README.md).

## Contributing

`@redwoodjs/api` uses a few things you should be familiar with:

- [Prisma](https://www.prisma.io)
- [Pino](https://getpino.io)

Although this package depends, in the code-dependency sense, only on `@redwoodjs/internal`, it still hangs together with the others&mdash;notably, `@redwoodjs/web` and `@redwoodjs/api-server`. So, if you’re asking yourself “but when does my server run?” head over to `@redwoodjs/api-server`.

If you’re asking yourself “but where is my GraphQL Server” head over to `@redwoodjs/graphql-server`.
