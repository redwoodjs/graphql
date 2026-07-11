import type { PluginOption } from 'vite'

/**
 *
 * Temporary plugin, that swaps the ApolloProvider import with the Suspense enabled one,
 * until it becomes stable.
 *
 * import { RedwoodApolloProvider } from "@redwoodjs/web/apollo" ->
 * import { RedwoodApolloProvider } from "@redwoodjs/web/dist/apollo/suspense"
 *
 */
export function swapApolloProvider(): PluginOption {
  return {
    name: 'redwood-swap-apollo-provider',
    async transform(code: string, id: string) {
      if (/web\/src\/App\.(ts|tsx|js|jsx)$/.test(id)) {
        return code.replace(
          '@redwoodjs/web/apollo',
          '@redwoodjs/web/dist/apollo/suspense',
        )
      }

      return code
    },
  }
}
