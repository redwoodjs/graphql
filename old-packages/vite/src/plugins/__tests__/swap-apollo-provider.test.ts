import { describe, it, expect } from 'vitest'

import { swapApolloProvider } from '../vite-plugin-swap-apollo-provider.js'

describe('excludeModule', () => {
  it('should swap the import', async () => {
    const plugin = swapApolloProvider()

    // @ts-expect-error The PluginOption type is 'false | Plugin_2 | PluginOption[] | Promise<false | Plugin_2 | PluginOption[] | null | undefined>' which does not gaurentee that the transform method exists.
    const output = await plugin.transform(
      `import ApolloProvider from '@redwoodjs/web/apollo'`,
      '/Users/dac09/Experiments/ssr-2354/web/src/App.tsx',
    )

    expect(output).toEqual(
      "import ApolloProvider from '@redwoodjs/web/dist/apollo/suspense'",
    )
  })
})
