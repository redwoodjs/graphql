/* eslint-disable no-var */
import type { HelmetServerState } from 'react-helmet-async'

declare global {
  var RWJS_ENV: {
    RWJS_API_GRAPHQL_URL: string
    /** URL or absolute path to serverless functions */
    RWJS_API_URL: string

    __REDWOOD__APP_TITLE: string
  }

  var RWJS_DEBUG_ENV: {
    RWJS_SRC_ROOT: string
    REDWOOD_ENV_EDITOR?: string
  }

  var __REDWOOD__PRERENDERING: boolean
  var __REDWOOD__HELMET_CONTEXT: { helmet?: HelmetServerState }
  var __REDWOOD__APP_TITLE: string
  /**
   * URL or absolute path to the GraphQL serverless function, without the trailing slash.
   * Example: `./redwood/functions/graphql` or `https://api.redwoodjs.com/graphql`
   */
  var RWJS_API_GRAPHQL_URL: string

  /**
   * URL or absolute path to serverless functions, without the trailing slash.
   * Example: `./redwood/functions/` or `https://api.redwoodjs.com/`
   **/
  var RWJS_API_URL: string

  namespace NodeJS {
    interface Global {
      __REDWOOD__PRERENDERING: boolean
      __REDWOOD__HELMET_CONTEXT: { helmet?: HelmetServerState }
      __REDWOOD__APP_TITLE: string

      /** URL or absolute path to the GraphQL serverless function */
      RWJS_API_GRAPHQL_URL: string
      /** URL or absolute path to serverless functions */
      RWJS_API_URL: string
    }
  }
}

export {}
