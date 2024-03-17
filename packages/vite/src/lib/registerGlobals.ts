import path from 'node:path'

import { getConfig, getPaths } from '@redwoodjs/project-config'

/**
 * Use this function on the web server
 *
 * Because although this is defined in Vite/index.ts
 * They are only available in the user's code (and not in FW code)
 * because define STATICALLY replaces it in user's code, not in node_modules
 *
 * It's still available on the client side though, probably because its processed by Vite
 */
export const registerFwGlobals = () => {
  const rwConfig = getConfig()
  const rwPaths = getPaths()

  globalThis.RWJS_ENV = {
    // @NOTE we're avoiding process.env here, unlike webpack
    RWJS_API_GRAPHQL_URL:
      rwConfig.web.apiGraphQLUrl ?? rwConfig.web.apiUrl + '/graphql',
    RWJS_API_URL: rwConfig.web.apiUrl,
    __REDWOOD__APP_TITLE: rwConfig.web.title || path.basename(rwPaths.base),
    RWJS_EXP_STREAMING_SSR:
      rwConfig.experimental.streamingSsr &&
      rwConfig.experimental.streamingSsr.enabled,
    RWJS_EXP_RSC: rwConfig.experimental?.rsc?.enabled,
    RWJS_EXP_SSR_GRAPHQL_ENDPOINT: (() => {
      const apiPath =
        rwConfig.web.apiGraphQLUrl ?? rwConfig.web.apiUrl + '/graphql'

      // If its an absolute url, use as is
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(apiPath)) {
        return apiPath
      } else {
        let webHost = process.env.REDWOOD_WEB_HOST
        webHost ??= rwConfig.web.host
        webHost ??= process.env.NODE_ENV === 'production' ? '0.0.0.0' : '[::]'

        let webPort
        if (process.env.REDWOOD_WEB_PORT) {
          webPort = parseInt(process.env.REDWOOD_WEB_PORT)
        } else {
          webPort = rwConfig.web.port
        }

        // NOTE: rwConfig.web.host defaults to "localhost", which is
        // When running in production, the api server does not listen on localhost
        const proxiedApiUrl = swapLocalhostFor127(
          'http://' + webHost + ':' + webPort + apiPath,
        )

        if (
          process.env.NODE_ENV === 'production' &&
          !process.env.RWJS_EXP_SSR_GRAPHQL_ENDPOINT?.length
        ) {
          console.log('------------------ WARNING ! -------------------------')
          console.warn()
          console.warn()

          console.warn(`You haven't configured your API absolute url.`)

          console.warn(`Using ${proxiedApiUrl}`)
          console.warn()

          console.warn(
            'You can override this for SSR by setting RWJS_EXP_SSR_GRAPHQL_ENDPOINT in your environment vars',
          )
          console.warn()

          console.log('------------------ WARNING ! -------------------------')

          return proxiedApiUrl
        }

        return swapLocalhostFor127(
          (process.env.RWJS_EXP_SSR_GRAPHQL_ENDPOINT as string) ??
            proxiedApiUrl,
        )
      }
    })(),
  }

  globalThis.RWJS_DEBUG_ENV = {
    RWJS_SRC_ROOT: rwPaths.web.src,
    REDWOOD_ENV_EDITOR: JSON.stringify(process.env.REDWOOD_ENV_EDITOR),
  }

  globalThis.__rw_module_cache__ ||= new Map()

  globalThis.__webpack_chunk_load__ ||= (id) => {
    console.log('rscWebpackShims chunk load id', id)
    return import(id).then((m) => globalThis.__rw_module_cache__.set(id, m))
  }

  // @ts-expect-error This is a webpack shim typed as any by @types/webpack
  globalThis.__webpack_require__ ||= (id) => {
    console.log('rscWebpackShims require id', id)
    return globalThis.__rw_module_cache__.get(id)
  }
}

function swapLocalhostFor127(hostString: string) {
  return hostString.replace('localhost', '127.0.0.1')
}
