/* eslint-disable no-var */
/// <reference types="react/experimental" />
import type { HelmetServerState } from 'react-helmet-async'
import type { ViteRuntime } from 'vite/runtime'

declare global {
  // Provided by Vite.config
  // but "regsitered" in packages/vite/src/streaming/registerGlobals.ts
  // for it to be available to framework code
  var RWJS_ENV: {
    RWJS_API_GRAPHQL_URL: string
    /** URL or absolute path to serverless functions */
    RWJS_API_URL: string
    RWJS_EXP_STREAMING_SSR: boolean
    RWJS_EXP_RSC: boolean
    RWJS_EXP_SSR_GRAPHQL_ENDPOINT: string

    __REDWOOD__APP_TITLE: string
  }

  var RWJS_DEBUG_ENV: {
    RWJS_SRC_ROOT: string
    REDWOOD_ENV_EDITOR: string
  }

  var __REDWOOD__PRERENDER_PAGES: any
  var __rwjs__vite_ssr_runtime: ViteRuntime | undefined
  var __rwjs__vite_rsc_runtime: ViteRuntime | undefined
  var __rwjs__client_references: Set<string> | undefined
  var __rwjs__server_references: Set<string> | undefined

  var __REDWOOD__HELMET_CONTEXT: { helmet?: HelmetServerState }

  var __rw_module_cache__: Map<string, unknown>

  var __webpack_chunk_load__: (
    id: string,
  ) => Promise<typeof __rw_module_cache__>
  var __webpack_require__: (id: string) => unknown
}

export {}
