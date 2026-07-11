import type { ViteDevServer } from 'vite'

// We are just importing the type here, it's OK!
// eslint-disable-next-line no-restricted-imports
import type { RWRouteManifestItem } from '@redwoodjs/internal/dist/routes.js'

import type { MiddlewareRequest } from './MiddlewareRequest.js'
import type { MiddlewareResponse } from './MiddlewareResponse.js'

export * from './MiddlewareRequest.js'
export * from './MiddlewareResponse.js'

export type MiddlewareInvokeOptions = {
  route?: RWRouteManifestItem
  cssPaths?: string[]
  params?: Record<string, unknown>
  viteSsrDevServer?: ViteDevServer
}

export type Middleware = (
  req: MiddlewareRequest,
  res: MiddlewareResponse,
  options?: MiddlewareInvokeOptions,
) => Promise<MiddlewareResponse> | MiddlewareResponse | void

export interface MiddlewareClass {
  invoke: Middleware
}
