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

## Implementation (Completed)

### Configuration

- Added TypeScript types for Vercel Fluid configuration in `packages/project-config/src/config.ts`
- Added `DeployConfig` and `VercelDeployConfig` interfaces
- `isVercelFluidDeploy()` function gates behavior based on `deploy.vercel.fluid` flag in `redwood.toml`

### @redwoodjs/api/fluid Package

Created new entry point at `packages/api/src/fluid.ts`:

- `FluidHandler` type: `(request: Request, context?: FluidContext) => Response | Promise<Response>`
- `FluidContext` interface with `waitUntil` and `requestId` properties
- Helper utilities: `json()`, `parseBody()`, `getQueryParams()`, `createFluidResponse()`
- Support for named HTTP method exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`
- Added export to `package.json`

### Build Pipeline

Modified `packages/internal/src/build/vercel.ts`:

- Added `validateFluidHandler()` function that detects legacy Lambda handlers
- Fails build with clear error message pointing to migration guide
- Detects HTTP method exports (`GET`, `POST`, etc.) and default exports

Updated `packages/internal/src/build/api.ts`:

- Calls `validateFluidHandler()` when Fluid mode is enabled
- Uses `transformAsync` directly to handle pre-validated code

### Dev Server

Created `packages/api-server/src/requestHandlers/fluidFastify.ts`:

- Converts Fastify requests to web-standard `Request` objects
- Invokes Fluid handlers with `Request`/`Response` signature
- Provides mock `FluidContext` for local development

Modified `packages/api-server/src/plugins/lambdaLoader.ts`:

- Added `FLUID_FUNCTIONS` registry for Fluid handlers
- Added `isFluidMode()` detection function
- Modified `setLambdaFunctions()` to load HTTP method exports when in Fluid mode
- Updated `lambdaRequestHandler()` to route to appropriate handler based on mode
- Supports method-specific routing with 405 responses for unsupported methods

### Documentation

Created `docs/docs/vercel-fluid-migration.md`:

- Configuration instructions
- Before/after code examples
- HTTP method handler patterns
- Helper utility usage
- Streaming response examples
- Background task examples with `waitUntil`
- Migration checklist
- Common patterns and limitations
