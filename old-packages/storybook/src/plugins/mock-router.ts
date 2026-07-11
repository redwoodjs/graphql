import type { PluginOption } from 'vite'

export function mockRouter(): PluginOption {
  return {
    name: 'mock-@redwoodjs/router',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (id.includes('src')) {
        code = code.replace(
          "'@redwoodjs/router'",
          "'storybook-framework-redwoodjs-vite/dist/mocks/MockRouter'",
        )
      }
      return code
    },
  }
}
