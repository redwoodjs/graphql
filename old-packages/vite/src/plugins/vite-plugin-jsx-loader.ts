import type { PluginOption } from 'vite'
import { transformWithEsbuild } from 'vite'

/**
 *
 * This is a vite plugin to load and transform JS files as JSX.
 *
 */
export function handleJsAsJsx(): PluginOption {
  return {
    name: 'transform-js-files-as-jsx',
    async transform(code: string, id: string) {
      if (!id.match(/src\/.*\.js$/)) {
        return null
      }

      // Use the exposed transform from vite, instead of directly
      // transforming with esbuild
      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsx: 'automatic',
      })
    },
  }
}
