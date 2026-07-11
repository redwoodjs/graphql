# Context

## About

This package contains code for the global context used on the API side of a
Redwood application. It's automatically available in services, auth functions
and custom functions.

## Serveful environments

In serverful environments with Fastify the global context is injected by a
Fastify `onRequest` hook.

## Serverless environments

Babel is used to automatically wrap functions with code that makes the context
available.
