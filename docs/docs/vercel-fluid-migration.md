# Migrating to Vercel Fluid Request/Response Handlers

## Overview

Vercel Fluid compute requires API functions to use web-standard `Request`/`Response` handlers instead of AWS Lambda `(event, context)` signatures. This unlocks streaming responses, `waitUntil`, and shared concurrency features.

## Configuration

Enable Fluid mode in `redwood.toml`:

```toml
[deploy]
target = "vercel"

[deploy.vercel]
fluid = true
```

## Handler Migration

### Before (Lambda signature)

```typescript
import type { APIGatewayEvent, Context } from 'aws-lambda'

export const handler = async (event: APIGatewayEvent, context: Context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: 'example' }),
  }
}
```

### After (Request/Response signature)

```typescript
import { json } from '@redwoodjs/api/fluid'

export const GET = async (request: Request) => {
  return json({ data: 'example' })
}
```

## HTTP Method Handlers

Fluid functions support named HTTP method exports:

```typescript
import { json, parseBody } from '@redwoodjs/api/fluid'

export const GET = async (request: Request) => {
  return json({ message: 'GET request' })
}

export const POST = async (request: Request) => {
  const body = await parseBody(request)
  return json({ received: body })
}

export const PUT = async (request: Request) => {
  return json({ message: 'PUT request' })
}
```

Supported methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`

## Default Handler

Functions can export a default handler that handles all methods:

```typescript
export default async (request: Request) => {
  return new Response(JSON.stringify({ method: request.method }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Helper Utilities

### JSON Response

```typescript
import { json } from '@redwoodjs/api/fluid'

export const GET = async (request: Request) => {
  return json({ data: 'value' }, { status: 200 })
}
```

### Parse Request Body

```typescript
import { parseBody } from '@redwoodjs/api/fluid'

export const POST = async (request: Request) => {
  const body = await parseBody(request)
  return json({ received: body })
}
```

### Query Parameters

```typescript
import { getQueryParams, json } from '@redwoodjs/api/fluid'

export const GET = async (request: Request) => {
  const params = getQueryParams(request)
  return json({ params })
}
```

## Streaming Responses

```typescript
export const GET = async (request: Request) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('chunk 1\n')
      controller.enqueue('chunk 2\n')
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
```

## Background Tasks with waitUntil

```typescript
import type { FluidContext } from '@redwoodjs/api/fluid'
import { json } from '@redwoodjs/api/fluid'

export const POST = async (request: Request, context?: FluidContext) => {
  context?.waitUntil?.(
    fetch('https://api.example.com/log', {
      method: 'POST',
      body: JSON.stringify({ event: 'processed' }),
    })
  )

  return json({ status: 'accepted' })
}
```

## Migration Checklist

- [ ] Enable Fluid mode in `redwood.toml`
- [ ] Replace Lambda `handler` exports with HTTP method exports (`GET`, `POST`, etc.)
- [ ] Convert `APIGatewayEvent` parameter access to `Request` API
- [ ] Convert `APIGatewayProxyResult` returns to `Response` objects
- [ ] Replace `event.queryStringParameters` with `getQueryParams(request)`
- [ ] Replace `JSON.parse(event.body)` with `parseBody(request)`
- [ ] Test functions locally with `yarn rw dev`
- [ ] Deploy to Vercel

## Common Patterns

### Accessing Headers

```typescript
export const GET = async (request: Request) => {
  const authHeader = request.headers.get('authorization')
  return json({ authenticated: !!authHeader })
}
```

### Setting Cookies

```typescript
export const POST = async (request: Request) => {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=abc123; Path=/; HttpOnly',
    },
  })
}
```

### Error Handling

```typescript
export const GET = async (request: Request) => {
  try {
    const data = await fetchData()
    return json(data)
  } catch (error) {
    return json({ error: error.message }, { status: 500 })
  }
}
```

## Limitations

- Fluid mode only applies when deploying to Vercel
- Legacy Lambda signature is not supported in Fluid mode
- Build fails with validation error if `handler` export is detected

## Support

For questions or issues, see the [Vercel Fluid documentation](https://vercel.com/docs/fluid-compute).
