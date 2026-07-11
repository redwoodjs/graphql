import { AsyncLocalStorage } from 'async_hooks'

import type { GlobalContext } from './globalContext'

let CONTEXT_STORAGE: AsyncLocalStorage<Map<string, GlobalContext>>

/**
 * This returns a AsyncLocalStorage instance, not the actual store
 *
 * @deprecated This function will be available only from the `@redwoodjs/context` package in a future release.
 */
export const getAsyncStoreInstance = () => {
  if (!CONTEXT_STORAGE) {
    CONTEXT_STORAGE = new AsyncLocalStorage<Map<string, GlobalContext>>()
  }
  return CONTEXT_STORAGE
}
