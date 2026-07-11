# Realtime

The real-time solution for RedwoodJS is initially for GraphQL.

In GraphQL, there are two options for real-time updates: **live queries** and **subscriptions**. Subscriptions are part of the GraphQL specification, whereas live queries are not.

There are times where subscriptions are well-suited for a realtime problem — and in some cases live queries may be a better fit. Later we’ll explore the pros and cons of each approach and how best to decide that to use and when.

### Features

RedwoodJS Realtime handles the hard parts of a GraphQL Realtime implementation by automatically:

- allowing GraphQL Subscription operations to be handled
- merging in your subscriptions types and mapping their handler functions (subscribe, and resolve) to your GraphQL schema letting you keep your subscription logic organized and apart from services (your subscription my use a service to respond to an event)
- authenticating subscription requests using the same `@requireAuth` directives already protecting other queries and mutations (or you can implement your own validator directive)
- adding in the `@live` query directive to your GraphQL schema and setting up the `useLiveQuery` envelop plugin to handle requests, invalidation, and managing the storage mechanism needed
- creating and configuring in-memory and persisted Redis stores uses by the PubSub transport for subscriptions and Live Queries (and letting you switch between them in development and production)
- placing the pubSub transport and stores into the GraphQL context so you can use them in services, subscription resolvers, or elsewhere (like a webhook, function, or job) to publish an event or invalidate data
- typing you subscription channel event payloads

It provides a first-class developer experience for real-time updates with GraphQL so you can easily

- respond to an event (e.g. NewPost, NewUserNotification)
- respond to a data change (e.g. Post 123's title updated)

and have the latest data reflected in your app.

Lastly, the Redwood CLI has commands to

- generate a boilerplate implementation and sample code needed to create your custom
  - subscriptions
  - live Queries

Regardless of the implementation chosen, **a stateful server and store are needed** to track changes, invalidation, or who wants to be informed about the change.

### useRedwoodRealtime

The `useRedwoodRealtime` plugin adds support for Redwood Realtime in GraphQL Yoga Server.

Note: Since a stateful server and store are needed, this plugin cannot be used this RedwoodJS applications deployed to serverless.

> **Warning**
>
> This is a new internal package. There are still changes we want to make, so we're marking it as experimental for now.
> **Don't depend on this directly in a Redwood project**.

<!-- ## Package size

| Version                                                                            | Publish | Install |
| :--------------------------------------------------------------------------------- | :------ | :------ |
| [v5.2.1](https://packagephobia.com/result?p=%40redwoodjs%2Fproject-config%405.2.1) | 96.6 kB | 809 kB  |

## Dependency graphs

### src

![src](./dependencyGraph.src.svg)

### dist

![dist](./dependencyGraph.dist.svg) -->
