import fs from 'fs/promises'
import path from 'path'

import { transform as svgrTransform } from '@svgr/core'
import type { API, FileInfo, StringLiteral } from 'jscodeshift'
import pascalcase from 'pascalcase'

import { getPaths } from '@redwoodjs/project-config'

/**
 * @param svgFilePath Full path to the existing svg file
 * @param outputPath Full path to the output file
 * @param componentName Name of the React component to generate inside the output file
 * @param typescript Whether to generate TypeScript code
 */
async function convertSvgToReactComponent(
  svgFilePath: string,
  outputPath: string,
  componentName: string,
  typescript: boolean,
) {
  const svgContents = await fs.readFile(svgFilePath, 'utf-8')

  const jsCode = await svgrTransform(
    svgContents,
    {
      jsxRuntime: 'automatic',
      plugins: ['@svgr/plugin-jsx'],
      typescript,
    },
    {
      componentName: componentName,
    },
  )

  await fs.writeFile(outputPath, jsCode)

  console.log()
  console.log(`SVG converted to React component: ${outputPath}`)
}

export default async function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const root = j(file.source)

  // If the input file is TypeScript, we'll generate TypeScript SVG components
  const isTS = file.path.endsWith('.tsx')

  // Find all import declarations with "*.svg" import
  const svgImports = root.find(j.ImportDeclaration).filter((path) => {
    const importPath = path.node.source.value as string
    return importPath.endsWith('.svg')
  })

  // This is if you directly export from svg:
  // e.g. export { default as X } from './X.svg'
  const svgNamedExports = root.find(j.ExportNamedDeclaration).filter((path) => {
    const source = path.value.source
    return Boolean(
      source &&
        typeof source.value === 'string' &&
        source.value.endsWith('.svg'),
    )
  })

  const svgsToConvert: {
    filePath: string
    importSourcePath: StringLiteral
  }[] = []

  const importOrExportStatementsWithSvg = [
    ...svgImports.paths(),
    ...svgNamedExports.paths(),
  ]
  // Process each import declaration
  importOrExportStatementsWithSvg.forEach((declaration) => {
    const specifiers = declaration.node.specifiers

    // Process each import specifier
    specifiers?.forEach((specifier) => {
      // The name of the improted SVG, assigned based on whether you are
      // importing or exporting directly
      let svgName = ''

      if (specifier.type === 'ExportSpecifier') {
        svgName = specifier.exported.name
      } else if (specifier.type === 'ImportDefaultSpecifier') {
        if (!specifier.local) {
          // Un-freaking-likely, skip if it happens
          return
        }

        svgName = specifier.local.name
      }

      const sourcePath = declaration.node.source?.value as string

      if (!sourcePath) {
        // Note sure how this is possible.... but TS tells me to do this
        // I guess because most export statements don't have a source?
        return
      }

      const currentFolder = path.dirname(file.path)

      let pathToSvgFile = path.resolve(currentFolder, sourcePath)

      if (sourcePath.startsWith('src/')) {
        pathToSvgFile = sourcePath.replace('src/', getPaths().web.src + '/')
      }

      // Find the JSX elements that use the default import specifier
      // e,g, <MySvg />
      const svgsUsedAsComponent = root.findJSXElements(svgName)

      // Used as a render prop
      // <Component icon={MySvg} />
      const svgsUsedAsRenderProp = root.find(j.JSXExpressionContainer, {
        expression: {
          type: 'Identifier',
          name: svgName,
        },
      })

      // a) exported from another file e.g. export { default as MySvg } from './X.svg'
      // b) imported from another file e.g. import MySvg from './X.svg', then exported export { MySvg }
      const svgsReexported = root.find(j.ExportSpecifier).filter((path) => {
        return (
          path.value.local?.name === svgName ||
          path.value.exported.name === svgName
        )
      })

      // Concat all of them, and loop over once
      const selectedSvgs = [
        ...svgsUsedAsComponent.paths(),
        ...svgsUsedAsRenderProp.paths(),
        ...svgsReexported.paths(),
      ]

      selectedSvgs.forEach(() => {
        svgsToConvert.push({
          filePath: pathToSvgFile,
          importSourcePath: declaration.node.source as StringLiteral, // imports are all strings in this case
        })
      })
    })
  })

  if (svgsToConvert.length > 0) {
    // if there are any svgs used as components, or render props, convert the svg to a react component
    await Promise.all(
      svgsToConvert.map(async (svg) => {
        const svgFileNameWithoutExtension = path.basename(
          svg.filePath,
          path.extname(svg.filePath),
        )

        const componentName = pascalcase(svgFileNameWithoutExtension)

        const newFileName = `${componentName}SVG`

        // The absolute path to the new file
        const outputPath = path.join(
          path.dirname(svg.filePath),
          `${newFileName}.${isTS ? 'tsx' : 'jsx'}`,
        )

        try {
          await convertSvgToReactComponent(
            svg.filePath,
            outputPath,
            componentName,
            isTS,
          )
        } catch (error: any) {
          console.error(
            `Error converting ${svg.filePath} to React component: ${error.message}`,
          )

          // Don't proceed if SVGr fails
          return
        }

        // If SVGr is successful, change the import path
        // '../../bazinga.svg' -> '../../BazingaSVG'
        // Use extname, incase ext casing does not match
        svg.importSourcePath.value = svg.importSourcePath.value.replace(
          `${svgFileNameWithoutExtension}${path.extname(svg.filePath)}`,
          newFileName,
        )
      }),
    )
  }

  return root.toSource()
}
