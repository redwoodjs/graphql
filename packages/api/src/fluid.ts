export interface FluidContext {
  waitUntil?: (promise: Promise<unknown>) => void
  requestId?: string
}

export type FluidHandler = (
  request: Request,
  context?: FluidContext,
) => Response | Promise<Response>

export type FluidHttpMethodHandler = FluidHandler

export interface FluidHandlerExports {
  GET?: FluidHttpMethodHandler
  POST?: FluidHttpMethodHandler
  PUT?: FluidHttpMethodHandler
  PATCH?: FluidHttpMethodHandler
  DELETE?: FluidHttpMethodHandler
  OPTIONS?: FluidHttpMethodHandler
  HEAD?: FluidHttpMethodHandler
  default?: FluidHandler
}

export function createFluidResponse(
  body: BodyInit | null,
  init?: ResponseInit,
): Response {
  return new Response(body, init)
}

export function json(
  data: unknown,
  init?: Omit<ResponseInit, 'headers'> & {
    headers?: HeadersInit
  },
): Response {
  const headers = new Headers(init?.headers)
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  })
}

export async function parseBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type')

  if (!contentType) {
    return null
  }

  if (contentType.includes('application/json')) {
    return await request.json()
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    const body: Record<string, unknown> = {}
    for (const [key, value] of formData.entries()) {
      body[key] = value
    }
    return body
  }

  if (contentType.includes('multipart/form-data')) {
    return await request.formData()
  }

  return await request.text()
}

export function getQueryParams(request: Request): Record<string, string> {
  const url = new URL(request.url)
  const params: Record<string, string> = {}

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value
  }

  return params
}
