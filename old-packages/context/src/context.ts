import { getAsyncStoreInstance } from './store.js'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GlobalContext extends Record<string, unknown> {}

export const createContextProxy = (target: GlobalContext) => {
  return new Proxy<GlobalContext>(target, {
    get: (_target, property: string) => {
      const store = getAsyncStoreInstance().getStore()
      const ctx = store?.get('context') || {}
      return ctx[property]
    },
    set: (_target, property: string, newVal) => {
      const store = getAsyncStoreInstance().getStore()
      const ctx = store?.get('context') || {}
      ctx[property] = newVal
      store?.set('context', ctx)
      return true
    },
  })
}

export let context: GlobalContext = createContextProxy({})

/**
 * Set the contents of the global context object.
 *
 * This completely replaces the existing context values such as currentUser.
 *
 * If you wish to extend the context simply use the `context` object directly,
 * such as `context.magicNumber = 1`, or `setContext({ ...context, magicNumber: 1 })`
 */
export const setContext = (newContext: GlobalContext): GlobalContext => {
  // re-init the proxy against the new context object,
  // so things like `console.log(context)` is the actual object,
  // not one initialized earlier.
  context = createContextProxy(newContext)

  // Replace the value of context stored in the current async store
  const store = getAsyncStoreInstance().getStore()
  store?.set('context', newContext)

  return context
}
