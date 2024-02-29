import fs from 'fs'
import path from 'path'

import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { normalizePath } from 'vite'

import { getWebSideDefaultBabelConfig } from '@redwoodjs/babel-config'
import { getConfig, getPaths } from '@redwoodjs/project-config'

import { getMergedConfig } from './getMergedConfig'
import handleJsAsJsx from './plugins/vite-plugin-jsx-loader'
import removeFromBundle from './plugins/vite-plugin-remove-from-bundle'
import swapApolloProvider from './plugins/vite-plugin-swap-apollo-provider'

/**
 * Pre-configured vite plugin, with required config for Redwood apps.
 */
export default function redwoodPluginVite(): PluginOption[] {
  const rwPaths = getPaths()
  const rwConfig = getConfig()

  const clientEntryPath = rwPaths.web.entryClient

  if (!clientEntryPath) {
    throw new Error(
      'Vite client entry point not found. Please check that your project has an entry.client.{jsx,tsx} file in the web/src directory.'
    )
  }

  const relativeEntryPath = path.relative(rwPaths.web.src, clientEntryPath)

  // If realtime is enabled, we want to include the sseLink in the bundle.
  // Right now the only way we have of telling is if the package is installed on the api side.
  const realtimeEnabled = fs
    .readFileSync(path.join(rwPaths.api.base, 'package.json'), 'utf-8')
    .includes('@redwoodjs/realtime')

  return [
    {
      name: 'redwood-plugin-vite-html-env',

      // Vite can support replacing environment variables in index.html but
      // there are currently two issues with that:
      // 1. It requires the environment variables to be exposed on
      //    `import.meta.env`, but we expose them on `process.env` in Redwood.
      // 2. There's an open issue on Vite where it adds extra quotes around
      //    the replaced values, which breaks trying to use environment
      //    variables in src attributes for example.
      // Until those issues are resolved, we'll do the replacement ourselves
      // instead using transformIndexHtml. Doing it this was was also the
      // recommended way until Vite added built-in support for it.
      //
      // Extra quotes issue: https://github.com/vitejs/vite/issues/13424
      // transformIndexHtml being the recommended way:
      //   https://github.com/vitejs/vite/issues/3105#issuecomment-1059975023
      transformIndexHtml: {
        // Setting order: 'pre' so that it runs before the built-in
        // html env replacement.
        order: 'pre',
        handler: (html: string) => {
          let newHtml = html

          rwConfig.web.includeEnvironmentVariables.map((envName) => {
            newHtml = newHtml.replaceAll(
              `%${envName}%`,
              process.env[envName] || ''
            )
          })

          Object.entries(process.env).forEach(([envName, value]) => {
            if (envName.startsWith('REDWOOD_ENV_')) {
              newHtml = newHtml.replaceAll(`%${envName}%`, value || '')
            }
          })

          return newHtml
        },
      },
    },
    {
      name: 'redwood-plugin-vite',

      // ---------- Bundle injection ----------
      // Used by Vite during dev, to inject the entrypoint.
      transformIndexHtml: {
        order: 'pre',
        handler: (html: string) => {
          // So we inject the entrypoint with the correct extension .tsx vs .jsx

          // And then inject the entry
          if (fs.existsSync(clientEntryPath)) {
            return html.replace(
              '</head>',
              // @NOTE the slash in front, for windows compatibility and for pages in subdirectories
              `<script type="module" src="/${relativeEntryPath}"></script>
        </head>`
            )
          } else {
            return html
          }
        },
      },
      // Used by rollup during build to inject the entrypoint
      // but note index.html does not come through as an id during dev
      transform: (code: string, id: string) => {
        if (
          fs.existsSync(clientEntryPath) &&
          normalizePath(id) === normalizePath(rwPaths.web.html)
        ) {
          return {
            code: code.replace(
              '</head>',
              `<script type="module" src="/${relativeEntryPath}"></script>
        </head>`
            ),
            map: null,
          }
        } else {
          return {
            code,
            map: null, // Returning null here preserves the original sourcemap
          }
        }
      },
      // ---------- End Bundle injection ----------

      // @MARK: Using the config hook here let's us modify the config
      // but returning plugins will **not** work
      config: getMergedConfig(rwConfig, rwPaths),
    },
    // We can remove when streaming is stable
    rwConfig.experimental.streamingSsr.enabled && swapApolloProvider(),
    handleJsAsJsx(),
    // Remove the splash-page from the bundle.
    removeFromBundle([
      {
        id: /@redwoodjs\/router\/dist\/splash-page/,
      },
    ]),
    !realtimeEnabled &&
      removeFromBundle([
        {
          id: /@redwoodjs\/web\/dist\/apollo\/sseLink/,
        },
      ]),
    react({
      babel: {
        ...getWebSideDefaultBabelConfig({
          forVite: true,
          // @MARK: Potential issue in the future. We don't want to set react plugins in each build file
          // because we should be able to trigger the builds from the vite CLI directly.
          // Right now, we can compile to SPA+SSR OR RSCClient+SSR+RSC - once this experimental flag is removed
          // we will need to make sure SPA+SSR is still possible
          forRscClient: rwConfig.experimental.rsc?.enabled,
        }),
      },
    }),
  ]
}
