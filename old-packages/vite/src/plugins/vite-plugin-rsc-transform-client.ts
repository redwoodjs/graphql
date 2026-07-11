import path from 'node:path'

import type { AssignmentExpression, Program } from 'acorn'
import * as acorn from 'acorn-loose'
import { normalizePath, type Plugin } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

export function rscTransformUseClientPlugin(
  clientEntryFiles: Record<string, string>,
): Plugin {
  return {
    name: 'rsc-transform-use-client-plugin',
    transform: async function (code, id) {
      // Do a quick check for the exact string. If it doesn't exist, don't
      // bother parsing.
      if (!code.includes('use client')) {
        return code
      }

      // TODO (RSC): Bad bad hack. Don't do this.
      // At least look for something that's guaranteed to be only present in
      // transformed modules
      // Ideally don't even try to transform twice
      if (code.includes('$$id')) {
        // Already transformed
        return code
      }

      let body: Program['body']

      try {
        body = acorn.parse(code, {
          ecmaVersion: 2024,
          sourceType: 'module',
        }).body
      } catch (x: any) {
        console.error('Error parsing %s %s', id, x.message)
        return code
      }

      let useClient = false
      let useServer = false

      for (const node of body) {
        if (node.type !== 'ExpressionStatement' || !node.directive) {
          break
        }

        if (node.directive === 'use client') {
          useClient = true
        }

        if (node.directive === 'use server') {
          useServer = true
        }
      }

      if (!useClient) {
        return code
      }

      if (useClient && useServer) {
        throw new Error(
          'Cannot have both "use client" and "use server" directives in the same file.',
        )
      }

      const transformedCode = await transformClientModule(
        code,
        body,
        id,
        clientEntryFiles,
      )

      return transformedCode
    },
  }
}

function addExportNames(names: string[], node: any) {
  switch (node.type) {
    case 'Identifier':
      names.push(node.name)
      return

    case 'ObjectPattern':
      for (const property of node.properties) {
        addExportNames(names, property)
      }

      return

    case 'ArrayPattern':
      for (const element of node.elements) {
        if (element) {
          addExportNames(names, element)
        }
      }

      return

    case 'Property':
      addExportNames(names, node.value)
      return

    case 'AssignmentPattern':
      addExportNames(names, node.left)
      return

    case 'RestElement':
      addExportNames(names, node.argument)
      return

    case 'ParenthesizedExpression':
      addExportNames(names, node.expression)
      return
  }
}

/**
 * Parses `body` for exports and stores them in `names`
 */
async function parseExportNamesIntoNames(
  code: string,
  body: Program['body'],
  names: string[],
): Promise<void> {
  for (const node of body) {
    switch (node.type) {
      case 'ExportAllDeclaration':
        if (node.exported) {
          addExportNames(names, node.exported)
          continue
        } else {
          let childBody

          try {
            childBody = acorn.parse(code, {
              ecmaVersion: 2024,
              sourceType: 'module',
            }).body
          } catch (x: any) {
            console.error('Error parsing %s %s', '', x.message)
            continue
          }

          await parseExportNamesIntoNames(code, childBody, names)

          continue
        }

      case 'ExportDefaultDeclaration':
        names.push('default')
        continue

      case 'ExportNamedDeclaration':
        if (node.declaration) {
          if (node.declaration.type === 'VariableDeclaration') {
            const declarations = node.declaration.declarations

            for (const declaration of declarations) {
              addExportNames(names, declaration.id)
            }
          } else {
            addExportNames(names, node.declaration.id)
          }
        }

        if (node.specifiers) {
          const specifiers = node.specifiers

          for (const specifier of specifiers) {
            addExportNames(names, specifier.exported)
          }
        }

        continue

      // For CJS support
      case 'ExpressionStatement': {
        let assignmentExpression: AssignmentExpression | null = null

        if (node.expression.type === 'AssignmentExpression') {
          assignmentExpression = node.expression
        } else if (
          node.expression.type === 'LogicalExpression' &&
          node.expression.right.type === 'AssignmentExpression'
        ) {
          assignmentExpression = node.expression.right
        }

        if (!assignmentExpression) {
          continue
        }

        if (assignmentExpression.left.type !== 'MemberExpression') {
          continue
        }

        if (assignmentExpression.left.object.type !== 'Identifier') {
          continue
        }

        if (
          assignmentExpression.left.object.name === 'exports' &&
          assignmentExpression.left.property.type === 'Identifier'
        ) {
          // This is for handling exports like
          // exports.Link = ...

          if (!names.includes(assignmentExpression.left.property.name)) {
            names.push(assignmentExpression.left.property.name)
          }
        } else if (
          assignmentExpression.left.object.name === 'module' &&
          assignmentExpression.left.property.type === 'Identifier' &&
          assignmentExpression.left.property.name === 'exports' &&
          assignmentExpression.right.type === 'ObjectExpression'
        ) {
          // This is for handling exports like
          // module.exports = { Link: ... }

          assignmentExpression.right.properties.forEach((property) => {
            if (
              property.type === 'Property' &&
              property.key.type === 'Identifier'
            ) {
              if (!names.includes(property.key.name)) {
                names.push(property.key.name)
              }
            }
          })
        }

        continue
      }
    }
  }
}

async function transformClientModule(
  code: string,
  body: Program['body'],
  url: string,
  clientEntryFiles: Record<string, string>,
): Promise<string> {
  const names: string[] = []

  // This will insert the names into the `names` array
  await parseExportNamesIntoNames(code, body, names)
  console.log('transformClientModule names', names)

  // entryRecord will be undefined for dev, because clientEntryFiles will just
  // be an empty object. See rscWorker.ts, where we do rscTransformPlugin({})
  const entryRecord = Object.entries(clientEntryFiles).find(
    ([_key, value]) => value === url,
  )

  const loadId = normalizePath(
    entryRecord
      ? path.join(getPaths().web.distRsc, 'assets', `${entryRecord[0]}.mjs`)
      : url,
  )

  let newSrc =
    'import {registerClientReference} from "react-server-dom-webpack/server";\n'

  for (const name of names) {
    if (name === 'default') {
      newSrc += 'export default registerClientReference(function() {'
      newSrc +=
        'throw new Error(' +
        JSON.stringify(
          'Attempted to call the default export of ' +
            url +
            " from the server but it's on the client. It's not possible to " +
            'invoke a client function from the server, it can only be ' +
            'rendered as a Component or passed to props of a Client Component.',
        ) +
        ');'
    } else {
      newSrc += 'export const ' + name + ' = '
      newSrc += 'registerClientReference(function() {'
      newSrc +=
        'throw new Error(' +
        JSON.stringify(
          'Attempted to call ' +
            name +
            '() from the server but ' +
            name +
            ' is on the client. ' +
            "It's not possible to invoke a client function from the server, it can " +
            'only be rendered as a Component or passed to props of a Client Component.',
        ) +
        ');'
    }

    newSrc += `},${JSON.stringify(loadId)},${JSON.stringify(name)})\n;`
  }

  return newSrc
}
