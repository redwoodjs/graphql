import type { default as RSDWServerModule } from 'react-server-dom-webpack/server.edge'

type RSDWServerType = typeof RSDWServerModule

/**
 * This function ensures we load the version of React that's been imported with
 * the react-server condition.
 */
export async function importRscReact() {
  if (globalThis.__rwjs__vite_rsc_runtime) {
    const reactMod =
      await globalThis.__rwjs__vite_rsc_runtime.executeUrl('react')
    return reactMod.default
  }

  return import('react')
}

export async function importRsdwServer(): Promise<RSDWServerType> {
  if (globalThis.__rwjs__vite_rsc_runtime) {
    const rsdwServerMod = await globalThis.__rwjs__vite_rsc_runtime.executeUrl(
      'react-server-dom-webpack/server.edge',
    )

    return rsdwServerMod.default
  } else {
    return import('react-server-dom-webpack/server.edge')
  }
}
