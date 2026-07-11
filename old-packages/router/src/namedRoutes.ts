import type { AvailableRoutes } from './index.js'

// namedRoutes is populated at run-time by iterating over the `<Route />`
// components, and appending them to this object.
// Has to be `const`, or there'll be a race condition with imports in users'
// projects
export const namedRoutes: AvailableRoutes = {}
