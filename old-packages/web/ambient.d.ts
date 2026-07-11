/* eslint-disable no-var */
import type { NormalizedCacheObject } from '@apollo/client'
import type { HelmetServerState } from 'react-helmet-async'

declare global {
  var __REDWOOD__PRERENDERING: boolean
  var __REDWOOD__HELMET_CONTEXT: { helmet?: HelmetServerState }
  var __REDWOOD__APP_TITLE: string
  var __REDWOOD__APOLLO_STATE: NormalizedCacheObject

  // Provided by Vite.config
  var RWJS_ENV: {
    RWJS_API_GRAPHQL_URL: string
    /** URL or absolute path to serverless functions */
    RWJS_API_URL: string
    RWJS_EXP_STREAMING_SSR: boolean
    RWJS_EXP_RSC: boolean

    __REDWOOD__APP_TITLE: string
    __REDWOOD__APOLLO_STATE: NormalizedCacheObject

    RWJS_EXP_SSR_GRAPHQL_ENDPOINT: string
  }

  var RWJS_DEBUG_ENV: {
    RWJS_SRC_ROOT: string
    REDWOOD_ENV_EDITOR: string
  }

  /** URL or absolute path to the DbAuth serverless function */
  var RWJS_API_DBAUTH_URL: string
  /** URL or absolute path to the GraphQL serverless function */
  var RWJS_API_GRAPHQL_URL: string
  /** URL or absolute path to serverless functions */
  var RWJS_API_URL: string
  /** Path to Redwood app source used by Development Error page to resolve source code paths */
  var RWJS_SRC_ROOT: string
  /** Flag for experimental Streaming and SSR support */
  var RWJS_EXP_STREAMING_SSR: boolean
  /** Flag for experimental RSC support */
  var RWJS_EXP_RSC: boolean

  namespace NodeJS {
    interface Global {
      /**
       * This global is set to true by the prerendering CLI command.
       */
      __REDWOOD__PRERENDERING: boolean
      __REDWOOD__HELMET_CONTEXT: { helmet?: HelmetServerState }
      __REDWOOD__APP_TITLE: string
      __REDWOOD__APOLLO_STATE: NormalizedCacheObject

      /** URL or absolute path to the GraphQL serverless function */
      RWJS_API_GRAPHQL_URL: string
      /** URL or absolute path to serverless functions */
      RWJS_API_URL: string
    }
  }
}

export {}
