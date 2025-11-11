# Vercel Fluid request/response migration

## Attempt 1: Lambda signature adapter

- Wrapped lambda handlers with `webRequestToLambdaEvent` and `lambdaResponseToWebResponse` bridge.
- Hooked the wrapper into the esbuild pipeline when `deploy.target` was `vercel`.
- Confirmed approach still relied on translating back to AWS Lambda semantics, which blocks access to Fluid-specific features like streaming responses.

## Decision point

- Fluid compute requires user handlers to expose the Request/Response surface natively, per Vercel documentation ([Fluid Compute docs](https://vercel.com/docs/fluid-compute)).
- Builder-level translation preserves legacy API but prevents adoption of streaming APIs defined in the [Build Output API primitives for Node.js runtimes](https://vercel.com/docs/build-output-api/primitives#node.js-config).

## Current direction

- Ship an opt-in package variant that expects handlers to export web-standard `Request`/`Response` entrypoints (e.g. `export const GET`).
- Deprecate the AWS Lambda signature for projects that install the Fluid package.
- Update generators, type definitions, and docs to steer users toward the new interface.
