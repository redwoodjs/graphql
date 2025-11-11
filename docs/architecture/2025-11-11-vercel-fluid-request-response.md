# Vercel Fluid Request/Response Handlers

## Context

- Vercel Fluid compute requires web-standard `Request`/`Response` handlers to unlock streaming, `waitUntil`, and shared concurrency features ([Fluid Compute docs](https://vercel.com/docs/fluid-compute)).
- The Build Output API for Node.js documents the framework-level entrypoints (`export const GET`, `POST`, etc.) that Vercel expects for routing ([Build Output API primitives](https://vercel.com/docs/build-output-api/primitives#node.js-config)).
- Redwood API functions currently expose the AWS Lambda `(event, context)` signature, which is incompatible with Fluid-only capabilities.

## Goals

- Provide an opt-in package variant that requires Redwood API functions to export web-standard handlers and drops the Lambda adapter.
- Ensure generated scaffold code, TypeScript types, and CLI validation enforce `Request`/`Response` usage when the Fluid package is installed.
- Maintain backwards compatibility for existing deployments that stay on the Lambda-compatible package.

## Non-goals

- Do not migrate non-Vercel providers to the new surface in this iteration.
- Do not remove legacy Lambda support from the default package.

## High-level design

1. Publish a new entry point (e.g. `@redwoodjs/api/fluid`) that exports a base handler signature `(request: Request, context?: FluidContext) => Response | Promise<Response>` and helper utilities.
2. Update the API build pipeline to fail fast if a function exports `handler` with Lambda parameters while Fluid mode is enabled; require named exports like `GET`, `POST`, or a default `handle` compatible with Vercel's routing.
3. Adjust CLI generators (`yarn rw g function`) to emit Request/Response templates when the Fluid package is detected.
4. Extend dev server and test harness to call functions using the new signature so local development matches production.
5. Provide codemods or lint rules to help migrate existing functions to the new API when opting in.

## Open questions

- How should multi-method functions (`GET`, `POST`, etc.) map onto Redwood's router and auth hooks?
- What fallback context (if any) needs to be supplied to mimic `event.requestContext` data previously available in Lambda?
- Do background tasks like `waitUntil` require additional runtime plumbing inside the dev server?

## Tasks

1. Detect Fluid mode via package flag or `redwood.toml` config and gate behavior across CLI, builder, and dev server.
2. Implement runtime adapters in `@redwoodjs/api/fluid` that expose helper APIs (auth decoding, logger, db access) over `Request`/`Response`.
3. Update API function generator templates and associated tests to emit new signatures.
4. Enforce signature validation in the build step with clear diagnostics when legacy `handler(event, context)` exports are found.
5. Modify dev server (`@redwoodjs/api-server`) to invoke functions through the web-standard signature.
6. Refresh documentation and migration guides covering Fluid opt-in, generator changes, and manual migration steps.
