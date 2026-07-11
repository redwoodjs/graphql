import fs from 'fs'
import path from 'path'

import { SourceMapGenerator } from 'source-map'

import { getPaths, processPagesDir } from '@redwoodjs/project-config'

import {
  getCellGqlQuery,
  fileToAst,
  getDefaultExportLocation,
  getNamedExports,
} from '../ast'
import { findCells, findDirectoryNamedModules } from '../files'
import { parseGqlQueryToAst } from '../gql'
import { getJsxElements } from '../jsx'

import {
  generateTypeDefGraphQLApi,
  generateTypeDefGraphQLWeb,
} from './graphqlCodeGen'
import { writeTemplate } from './templates'

// TODO:
// Common return format for CLI output:
// ['type', 'relative path to base']

// Note for contributors:
//
// The functions in this file generate type definitions of which there are two types:
//
// 1. Mirror types: Create a virtual directory that allows us to type
// cells and directory named modules.
// 2. Types based on contents of other files
//
// When generating a new type definition that targets a particular side,
// you must prefix the generated filename
// with "web-" or "api-" to target inclusion for that side,
// or use "all-" for both. This is controlled by the user's "tsconfig.json"
// file.

/**
 * Generate all the types for a RedwoodJS project
 * and return the generated path to files, so they're logged
 */
export const generateTypeDefs = async () => {
  // Return all the paths so they can be printed
  const { typeDefFiles: gqlApiTypeDefFiles, errors: apiErrors } =
    await generateTypeDefGraphQLApi()
  const { typeDefFiles: gqlWebTypeDefFiles, errors: webErrors } =
    await generateTypeDefGraphQLWeb()

  return {
    typeDefFiles: [
      ...generateMirrorDirectoryNamedModules(),
      ...generateMirrorCells(),
      ...generateTypeDefRouterPages(),
      ...generateTypeDefCurrentUser(),
      ...generateTypeDefRouterRoutes(),
      ...generateTypeDefGlobImports(),
      ...generateTypeDefGlobalContext(),
      ...generateTypeDefScenarios(),
      ...generateTypeDefTestMocks(),
      ...generateStubStorybookTypes(),
      ...generateViteClientTypesDirective(),
      ...gqlApiTypeDefFiles,
      ...gqlWebTypeDefFiles,
    ],
    errors: [...apiErrors, ...webErrors],
  }
}

export const generateMirrorDirectoryNamedModules = () => {
  const rwjsPaths = getPaths()
  return findDirectoryNamedModules().map((p) =>
    generateMirrorDirectoryNamedModule(p, rwjsPaths),
  )
}

export const mirrorPathForDirectoryNamedModules = (
  p: string,
  rwjsPaths = getPaths(),
) => {
  return [
    path.join(
      rwjsPaths.generated.types.mirror,
      path.relative(rwjsPaths.base, path.dirname(p)),
    ),
    'index.d.ts',
  ]
}

export const generateMirrorDirectoryNamedModule = (
  p: string,
  rwjsPaths = getPaths(),
) => {
  const [mirrorDir, typeDef] = mirrorPathForDirectoryNamedModules(p, rwjsPaths)
  fs.mkdirSync(mirrorDir, { recursive: true })

  const typeDefPath = path.join(mirrorDir, typeDef)
  const { name } = path.parse(p)

  writeTemplate(
    'templates/mirror-directoryNamedModule.d.ts.template',
    typeDefPath,
    { name },
  )

  // We add a source map to allow "go to definition" to avoid ending in the .d.ts file
  // We do this for the web side only
  if (p.startsWith(rwjsPaths.web.src)) {
    try {
      // Get the line and column where the default export is defined
      const fileContents = fileToAst(p)
      const defaultExportLocation = getDefaultExportLocation(fileContents) ?? {
        line: 1,
        column: 0,
      }

      // Generate a source map that points to the definition of the default export
      const map = new SourceMapGenerator({
        file: 'index.d.ts',
      })
      map.addMapping({
        generated: {
          line: 4,
          column: 0,
        },
        source: path.relative(path.dirname(typeDefPath), p),
        original: defaultExportLocation,
      })

      fs.writeFileSync(
        `${typeDefPath}.map`,
        JSON.stringify(map.toJSON(), undefined, 2),
      )
    } catch (error) {
      console.error(
        "Couldn't generate a definition map for directory named module at path:",
        p,
      )
      console.error(error)
    }
  }

  return typeDefPath
}

export const generateMirrorCells = () => {
  const rwjsPaths = getPaths()
  return findCells().map((p) => generateMirrorCell(p, rwjsPaths))
}

export const mirrorPathForCell = (p: string, rwjsPaths = getPaths()) => {
  const mirrorDir = path.join(
    rwjsPaths.generated.types.mirror,
    path.relative(rwjsPaths.base, path.dirname(p)),
  )

  fs.mkdirSync(mirrorDir, { recursive: true })
  return [mirrorDir, 'index.d.ts']
}

export const generateMirrorCell = (p: string, rwjsPaths = getPaths()) => {
  const [mirrorDir, typeDef] = mirrorPathForCell(p, rwjsPaths)
  fs.mkdirSync(mirrorDir, { recursive: true })

  const typeDefPath = path.join(mirrorDir, typeDef)
  const { name } = path.parse(p)

  const fileContents = fileToAst(p)
  const cellQuery = getCellGqlQuery(fileContents)

  if (cellQuery) {
    const gqlDoc = parseGqlQueryToAst(cellQuery)[0]

    writeTemplate('templates/mirror-cell.d.ts.template', typeDefPath, {
      name,
      queryResultType: `${gqlDoc?.name}`,
      queryVariablesType: `${gqlDoc?.name}Variables`,
    })
  } else {
    // If for some reason we can't parse the query, generated the mirror cell anyway
    writeTemplate('templates/mirror-cell.d.ts.template', typeDefPath, {
      name,
      queryResultType: 'any',
      queryVariablesType: 'any',
    })
  }

  // We add a source map to allow "go to definition" to avoid ending in the .d.ts file
  // Unlike pages, layouts, components etc. there is no clear definition location so we link
  // to the Success component
  try {
    // Get the location of the Success component
    const exportedComponents = getNamedExports(fileContents)
    const successComponent = exportedComponents.find(
      (x) => x.name === 'Success',
    )
    if (successComponent === undefined) {
      throw new Error('No Success component found')
    }

    // Generate the map
    const map = new SourceMapGenerator({
      file: 'index.d.ts',
    })
    map.addMapping({
      generated: {
        line: 12,
        column: 0,
      },
      source: path.relative(path.dirname(typeDefPath), p),
      original: successComponent.location,
    })
    fs.writeFileSync(
      `${typeDefPath}.map`,
      JSON.stringify(map.toJSON(), undefined, 2),
    )
  } catch (error) {
    console.error("Couldn't generate a definition map for cell at path:", p)
    console.error(error)
  }

  return typeDefPath
}

const writeTypeDefIncludeFile = (
  template: string,
  values: Record<string, unknown> = {},
) => {
  const rwjsPaths = getPaths()
  const typeDefPath = path.join(
    rwjsPaths.generated.types.includes,
    template.replace('.template', ''),
  )

  const templateFilename = path.join('templates', template)
  writeTemplate(templateFilename, typeDefPath, values)
  return [typeDefPath]
}

export const generateTypeDefRouterRoutes = () => {
  const ast = fileToAst(getPaths().web.routes)
  let hasRootRoute = false
  const routes = getJsxElements(ast, 'Route').filter((x) => {
    // All generated "routes" should have a "name" and "path" prop-value
    const isValidRoute =
      typeof x.props?.path !== 'undefined' &&
      typeof x.props?.name !== 'undefined'

    if (isValidRoute && x.props.path === '/') {
      hasRootRoute = true
    }

    return isValidRoute
  })

  // Generate declaration mapping for improved go-to-definition behaviour
  try {
    const typeDefPath = path.join(
      getPaths().generated.types.includes,
      'web-routerRoutes.d.ts',
    )

    const map = new SourceMapGenerator({
      file: 'web-routerRoutes.d.ts',
    })

    // Start line is based on where in the template the
    // `    ${name}: (params?: RouteParams<"${path}"> & QueryParams) => "${path}"`
    // line is defined
    const startLine = 7

    // Map the location of the default export for each page
    for (let i = 0; i < routes.length; i++) {
      map.addMapping({
        generated: {
          line: startLine + i,
          column: 4,
        },
        source: path.relative(path.dirname(typeDefPath), getPaths().web.routes),
        original: routes[i].location,
      })
    }

    fs.writeFileSync(
      `${typeDefPath}.map`,
      JSON.stringify(map.toJSON(), undefined, 2),
    )
  } catch (error) {
    console.error(
      "Couldn't generate a definition map for web-routerRoutes.d.ts:",
    )
    console.error(error)
  }

  if (!hasRootRoute) {
    routes.push({
      name: 'splashPage route',
      location: { line: -1, column: -1 },
      props: {
        path: '/',
        name: 'home',
      },
    })
  }

  return writeTypeDefIncludeFile('web-routerRoutes.d.ts.template', { routes })
}

export const generateTypeDefRouterPages = () => {
  const pages = processPagesDir()

  // Generate declaration map for better go-to-definition behaviour
  try {
    const typeDefPath = path.join(
      getPaths().generated.types.includes,
      'web-routesPages.d.ts',
    )

    const map = new SourceMapGenerator({
      file: 'web-routesPages.d.ts',
    })

    // Start line is based on where in the template the `  const ${importName}: typeof ${importName}Type` are defined
    const startLine = pages.length + 5

    // Map the location of the default export for each page
    for (let i = 0; i < pages.length; i++) {
      const fileContents = fileToAst(pages[i].path)
      const defaultExportLocation = getDefaultExportLocation(fileContents) ?? {
        line: 1,
        column: 0,
      }
      map.addMapping({
        generated: {
          line: startLine + i,
          column: 0,
        },
        source: path.relative(path.dirname(typeDefPath), pages[i].path),
        original: defaultExportLocation,
      })
    }

    fs.writeFileSync(
      `${typeDefPath}.map`,
      JSON.stringify(map.toJSON(), undefined, 2),
    )
  } catch (error) {
    console.error(
      "Couldn't generate a definition map for web-routesPages.d.ts:",
    )
    console.error(error)
  }

  return writeTypeDefIncludeFile('web-routesPages.d.ts.template', { pages })
}

export const generateTypeDefCurrentUser = () => {
  return writeTypeDefIncludeFile('all-currentUser.d.ts.template')
}

export const generateTypeDefScenarios = () => {
  return writeTypeDefIncludeFile('api-scenarios.d.ts.template')
}

export const generateTypeDefTestMocks = () => {
  return [
    writeTypeDefIncludeFile('api-test-globals.d.ts.template'),
    writeTypeDefIncludeFile('web-test-globals.d.ts.template'),
  ].flat()
}

export const generateTypeDefGlobImports = () => {
  return writeTypeDefIncludeFile('api-globImports.d.ts.template')
}

export const generateTypeDefGlobalContext = () => {
  return writeTypeDefIncludeFile('api-globalContext.d.ts.template')
}
/**
 * Typescript does not preserve triple slash directives when outputting js or d.ts files.
 * This is a work around so that *.svg, *.png, etc. imports have types.
 */
export const generateViteClientTypesDirective = () => {
  const viteClientDirective = `/// <reference types="vite/client" />`
  const redwoodProjectPaths = getPaths()

  const viteClientDirectivePath = path.join(
    redwoodProjectPaths.generated.types.includes,
    'web-vite-client.d.ts',
  )
  fs.writeFileSync(viteClientDirectivePath, viteClientDirective)

  return [viteClientDirectivePath]
}

function generateStubStorybookTypes() {
  const stubStorybookTypesFileContent = `\
declare module '@storybook/react' {
  export type Meta<T = any> = any
  export type StoryObj<T = any> = any
}
`

  const redwoodProjectPaths = getPaths()

  const packageJson = JSON.parse(
    fs.readFileSync(
      path.join(redwoodProjectPaths.base, 'package.json'),
      'utf-8',
    ),
  )

  const hasCliStorybookVite = Object.keys(
    packageJson['devDependencies'],
  ).includes('@redwoodjs/cli-storybook-vite')

  if (hasCliStorybookVite) {
    return []
  }

  const stubStorybookTypesFilePath = path.join(
    redwoodProjectPaths.generated.types.includes,
    'web-storybook.d.ts',
  )
  fs.writeFileSync(stubStorybookTypesFilePath, stubStorybookTypesFileContent)

  return [stubStorybookTypesFilePath]
}
