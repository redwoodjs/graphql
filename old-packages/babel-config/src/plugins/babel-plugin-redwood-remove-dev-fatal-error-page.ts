import type { PluginObj, types } from '@babel/core'

// This replaces
// import { DevFatalErrorPage } from '@redwoodjs/web/dist/components/DevFatalErrorPage'
// with
// const DevFatalErrorPage = undefined

export default function ({ types: t }: { types: typeof types }): PluginObj {
  return {
    name: 'babel-plugin-redwood-remove-dev-fatal-error-page',
    visitor: {
      ImportDeclaration(path) {
        // import { DevFatalErrorPage } from '@redwoodjs/web/dist/components/DevFatalErrorPage'
        if (
          path.node.source.value ===
          '@redwoodjs/web/dist/components/DevFatalErrorPage'
        ) {
          // const DevFatalErrorPage = undefined
          const variableDeclaration = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('DevFatalErrorPage'),
              t.identifier('undefined'),
            ),
          ])

          path.replaceWith(variableDeclaration)
        }
      },
    },
  }
}
