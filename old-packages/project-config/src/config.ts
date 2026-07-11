import fs from 'fs'

import merge from 'deepmerge'
import * as toml from 'smol-toml'
import { env as envInterpolation } from 'string-env-interpolation'

import { getConfigPath } from './configPath.js'

export enum TargetEnum {
  NODE = 'node',
  BROWSER = 'browser',
  REACT_NATIVE = 'react-native',
  ELECTRON = 'electron',
}

export interface NodeTargetConfig {
  title: string
  name?: string
  host?: string
  port: number
  path: string
  target: TargetEnum.NODE
  schemaPath: string
  serverConfig: string
  debugPort?: number
}

interface BrowserTargetConfig {
  title: string
  name?: string
  host?: string
  port: number
  path: string
  target: TargetEnum.BROWSER
  includeEnvironmentVariables: string[]
  /**
   * Specify the URL to your api-server.
   * This can be an absolute path proxied on the current domain (`/.netlify/functions`),
   * or a fully qualified URL (`https://api.example.org:8911/functions`).
   *
   * Note: This should not include the path to the GraphQL Server.
   **/
  apiUrl: string
  /**
   * Optional: FQDN or absolute path to the GraphQL serverless function, without the trailing slash.
   * This will override the apiUrl configuration just for the graphql function
   * Example: `./redwood/functions/graphql` or `https://api.redwoodjs.com/graphql`
   */
  apiGraphQLUrl?: string

  fastRefresh: boolean
  a11y: boolean
  sourceMap: boolean
}

interface GraphiQLStudioConfig {
  endpoint?: string
  authImpersonation?: AuthImpersonationConfig
}

type SupportedAuthImpersonationProviders = 'dbAuth' | 'netlify' | 'supabase'

interface AuthImpersonationConfig {
  authProvider?: SupportedAuthImpersonationProviders
  jwtSecret?: string
  userId?: string
  email?: string
  roles?: string[]
}

interface StudioConfig {
  basePort: number
  graphiql?: GraphiQLStudioConfig
}

export interface Config {
  web: BrowserTargetConfig
  api: NodeTargetConfig
  browser: {
    open: boolean | string
  }
  generate: {
    tests: boolean
    stories: boolean
    nestScaffoldByModel: boolean
  }
  graphql: {
    fragments: boolean
    trustedDocuments: boolean
    includeScalars: {
      File: boolean
    }
  }
  notifications: {
    versionUpdates: string[]
  }
  studio: StudioConfig
  experimental: {
    opentelemetry: {
      enabled: boolean
      wrapApi: boolean
      apiSdk?: string
    }
    cli: {
      autoInstall: boolean
      plugins: CLIPlugin[]
    }
    useSDLCodeGenForGraphQLTypes: boolean
    streamingSsr: {
      enabled: boolean
    }
    rsc: {
      enabled: boolean
    }
    realtime: {
      enabled: boolean
    }
    reactCompiler: {
      enabled: boolean
      lintOnly: boolean
    }
  }
}

export interface CLIPlugin {
  package: string
  enabled?: boolean
}

const DEFAULT_CONFIG: Config = {
  web: {
    title: 'Redwood App',
    port: 8910,
    path: './web',
    target: TargetEnum.BROWSER,
    includeEnvironmentVariables: [],
    apiUrl: '/.redwood/functions',
    fastRefresh: true,
    a11y: true,
    sourceMap: false,
  },
  api: {
    title: 'Redwood App',
    port: 8911,
    path: './api',
    target: TargetEnum.NODE,
    schemaPath: './api/db/schema.prisma',
    serverConfig: './api/server.config.js',
    debugPort: 18911,
  },
  graphql: {
    fragments: false,
    trustedDocuments: false,
    includeScalars: { File: true },
  },
  browser: {
    open: false,
  },
  generate: {
    tests: true,
    stories: true,
    nestScaffoldByModel: true,
  },
  notifications: {
    versionUpdates: [],
  },
  studio: {
    basePort: 4318,
    graphiql: {
      authImpersonation: {
        authProvider: undefined,
        userId: undefined,
        email: undefined,
        jwtSecret: 'secret',
      },
    },
  },
  experimental: {
    opentelemetry: {
      enabled: false,
      wrapApi: true,
    },
    cli: {
      autoInstall: true,
      plugins: [
        {
          package: '@redwoodjs/cli-storybook-vite',
        },
        {
          package: '@redwoodjs/cli-data-migrate',
        },
      ],
    },
    useSDLCodeGenForGraphQLTypes: false,
    streamingSsr: {
      enabled: false,
    },
    rsc: {
      enabled: false,
    },
    realtime: {
      enabled: false,
    },
    reactCompiler: {
      enabled: false,
      lintOnly: false,
    },
  },
}

/**
 * These configuration options are modified by the user via the Redwood
 * config file.
 */
export const getConfig = (configPath = getConfigPath()): Config => {
  try {
    return merge(DEFAULT_CONFIG, getRawConfig(configPath))
  } catch (e) {
    throw new Error(`Could not parse "${configPath}": ${e}`)
  }
}

/**
 * Returns the JSON parse of the config file without any default values.
 *
 * @param configPath Path to the config file, defaults to automatically find the project `redwood.toml` file
 * @returns A JSON object from the parsed toml values
 */
export function getRawConfig(configPath = getConfigPath()) {
  try {
    return toml.parse(envInterpolation(fs.readFileSync(configPath, 'utf8')))
  } catch (e) {
    throw new Error(`Could not parse "${configPath}": ${e}`)
  }
}
