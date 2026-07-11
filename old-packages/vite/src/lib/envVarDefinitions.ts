import path from 'node:path'

import { getConfig, getPaths } from '@redwoodjs/project-config'

export function getEnvVarDefinitions() {
  const rwConfig = getConfig()
  const rwPaths = getPaths()

  return {
    RWJS_ENV: {
      RWJS_API_GRAPHQL_URL:
        rwConfig.web.apiGraphQLUrl ?? rwConfig.web.apiUrl + '/graphql',
      RWJS_API_URL: rwConfig.web.apiUrl,
      __REDWOOD__APP_TITLE: rwConfig.web.title || path.basename(rwPaths.base),
      RWJS_EXP_STREAMING_SSR: rwConfig.experimental.streamingSsr?.enabled,
      RWJS_EXP_RSC: rwConfig.experimental?.rsc?.enabled,
    },
    RWJS_DEBUG_ENV: {
      RWJS_SRC_ROOT: rwPaths.web.src,
      REDWOOD_ENV_EDITOR: JSON.stringify(process.env.REDWOOD_ENV_EDITOR),
    },
    // Vite can automatically expose environment variables, but we
    // disable that in `buildFeServer.ts` by setting `envFile: false`
    // because we want to use our own logic for loading .env,
    // .env.defaults, etc
    // The two object spreads below will expose all environment
    // variables listed in redwood.toml and all environment variables
    // prefixed with REDWOOD_ENV_
    ...Object.fromEntries(
      rwConfig.web.includeEnvironmentVariables.flatMap((envName) => [
        // TODO: Figure out if/why we need to disable eslint here, when we
        // didn't have to before, when this code was in index.ts
        // Re-enable if possible
        // eslint-disable-next-line
        [`import.meta.env.${envName}`, JSON.stringify(process.env[envName])],
        // TODO: Figure out if/why we need to disable eslint here, when we
        // didn't have to before, when this code was in index.ts
        // Re-enable if possible
        // eslint-disable-next-line
        [`process.env.${envName}`, JSON.stringify(process.env[envName])],
      ]),
    ),
    ...Object.entries(process.env).reduce<Record<string, any>>(
      (acc, [key, value]) => {
        if (key.startsWith('REDWOOD_ENV_')) {
          acc[`import.meta.env.${key}`] = JSON.stringify(value)
          acc[`process.env.${key}`] = JSON.stringify(value)
        }

        return acc
      },
      {},
    ),
  }
}
