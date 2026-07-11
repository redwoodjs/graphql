import type {
  Middleware,
  MiddlewareClass,
} from '@redwoodjs/web/dist/server/middleware'

// Tuple of [mw, '*.{extension}']
export type MiddlewareReg = (
  | [Middleware | MiddlewareClass, string]
  | Middleware
  | MiddlewareClass
)[]
