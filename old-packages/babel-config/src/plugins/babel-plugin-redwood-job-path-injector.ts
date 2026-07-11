import fsPath from 'node:path'

import type { PluginObj, types as babelTypes } from '@babel/core'

import { getPaths } from '@redwoodjs/project-config'

// This plugin is responsible for injecting the import path and name of a job
// into the object that is passed to createJob. This is later used by adapters
// and workers to import the job.

export default function ({ types }: { types: typeof babelTypes }): PluginObj {
  const paths = getPaths()
  return {
    name: 'babel-plugin-redwood-job-path-injector',
    visitor: {
      ExportNamedDeclaration(path, state) {
        // Extract the variable declaration from the export
        const declaration = path.node.declaration
        if (!declaration) {
          return
        }
        if (declaration.type !== 'VariableDeclaration') {
          return
        }
        // Extract the variable declarator from the declaration
        const declarator = declaration.declarations[0]
        if (!declarator) {
          return
        }
        if (declarator.type !== 'VariableDeclarator') {
          return
        }

        // Confirm that the init it a call expression
        const init = declarator.init
        if (!init) {
          return
        }
        if (init.type !== 'CallExpression') {
          return
        }
        // Confirm that the callee is a member expression
        const callee = init.callee
        if (!callee) {
          return
        }
        if (callee.type !== 'MemberExpression') {
          return
        }
        // The object is imported and so could be aliased so lets check the property
        const property = callee.property
        if (!property) {
          return
        }
        if (property.type !== 'Identifier') {
          return
        }
        if (property.name !== 'createJob') {
          return
        }

        // From this point on we're confident that we're looking at a createJob call
        // so let's start throwing errors if we don't find what we expect

        // Extract the variable name from the declarator
        const id = declarator.id
        if (!id) {
          return
        }
        if (id.type !== 'Identifier') {
          return
        }

        const filepath = state.file.opts.filename
        if (!filepath) {
          throw new Error('No file path was found in the state')
        }

        const importName = id.name
        const importPath = fsPath.relative(paths.api.jobs, filepath)
        const importPathWithoutExtension = importPath.replace(/\.[^/.]+$/, '')

        // Get the first argument of the call expression
        const firstArg = init.arguments[0]
        if (!firstArg) {
          throw new Error('No first argument found in the createJob call')
        }
        // confirm it's an object expression
        if (firstArg.type !== 'ObjectExpression') {
          throw new Error(
            'The first argument of the createJob call is not an object expression',
          )
        }
        // Add a property to the object expression
        firstArg.properties.push(
          types.objectProperty(
            types.identifier('path'),
            types.stringLiteral(importPathWithoutExtension),
          ),
        )
        firstArg.properties.push(
          types.objectProperty(
            types.identifier('name'),
            types.stringLiteral(importName),
          ),
        )
      },
    },
  }
}
