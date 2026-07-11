import path from 'path'

import type { PluginObj, types } from '@babel/core'
import fg from 'fast-glob'

import { importStatementPath } from '@redwoodjs/project-config'

/**
 * This babel plugin will search for import statements that include star `**`
 * in the source part of the statement is a glob, the files that are matched are imported,
 * and appended to an object.
 *
 * @example:
 * Given a directory "src/services" that contains "a.js" and "b.ts", "nested/c.js",
 * will produce the following results:
 * ```js
 * import services from 'src/services/**\/*.{js,ts}'
 * console.log(services)
 * // services.a = require('src/services/a.js')
 * // services.b = require('src/services/b.ts')
 * // services.nested_c = require('src/services/nested/c.js')
 * ```
 */
export default function (
  { types: t }: { types: typeof types },
  { projectIsEsm = false }: { projectIsEsm?: boolean } = {},
): PluginObj {
  return {
    name: 'babel-plugin-redwood-import-dir',
    visitor: {
      ImportDeclaration(p, state: { file?: any }) {
        // This code will only run when we find an import statement that includes a `**`.
        if (!p.node.source.value.includes('**')) {
          return
        }

        const nodes = []
        // import <node.specifiers[0].local.name> from <node.source.value>
        // + let importName = {}
        const importName = p.node.specifiers[0].local.name
        nodes.push(
          t.variableDeclaration('let', [
            t.variableDeclarator(
              t.identifier(importName),
              t.objectExpression([]),
            ),
          ]),
        )

        const importGlob = importStatementPath(p.node.source.value)
        const cwd = path.dirname(state.file.opts.filename)
        const dirFiles = fg
          .sync(importGlob, { cwd })
          .filter((n) => !n.includes('.test.')) // ignore `*.test.*` files.
          .filter((n) => !n.includes('.scenarios.')) // ignore `*.scenarios.*` files.
          .filter((n) => !n.includes('.d.ts'))

        const staticGlob = importGlob.split('*')[0]
        const filePathToVarName = (filePath: string) => {
          return filePath
            .replace(staticGlob, '')
            .replace(/\.(js|ts)$/, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
        }

        for (const filePath of dirFiles) {
          const { dir: fileDir, name: fileName } = path.parse(filePath)
          const filePathWithoutExtension = fileDir + '/' + fileName
          const fpVarName = filePathToVarName(filePath)

          // + import * as <importName>_<fpVarName> from <filePathWithoutExtension>
          // import * as a from './services/a
          nodes.push(
            t.importDeclaration(
              [
                t.importNamespaceSpecifier(
                  t.identifier(importName + '_' + fpVarName),
                ),
              ],
              t.stringLiteral(
                projectIsEsm
                  ? `${filePathWithoutExtension}.js`
                  : filePathWithoutExtension,
              ),
            ),
          )

          // + <importName>.<fpVarName> = <importName_fpVarName>
          // services.a = a
          nodes.push(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(
                  t.identifier(importName),
                  t.identifier(fpVarName),
                ),
                t.identifier(importName + '_' + fpVarName),
              ),
            ),
          )
        }

        for (const node of nodes) {
          p.insertBefore(node)
        }

        // - import importName from "dirPath"
        p.remove()
      },
    },
  }
}
