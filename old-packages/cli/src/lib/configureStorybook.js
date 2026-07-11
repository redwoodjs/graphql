import path from 'path'

import fse from 'fs-extra'
import prettier from 'prettier'

import { merge } from './merge'
import {
  interleave,
  concatUnique,
  keepBoth,
  keepBothStatementParents,
} from './merge/strategy'
import { isTypeScriptProject } from './project'

import { getPaths, transformTSToJS, writeFile } from '.'

/**
 * Extends the Storybook configuration file with the new configuration file
 * @param {string} newConfigPath - The path to the new configuration file
 */
export default async function extendStorybookConfiguration(
  newConfigPath = undefined,
) {
  const webPaths = getPaths().web
  const ts = isTypeScriptProject()
  const sbPreviewConfigPath =
    webPaths.storybookPreviewConfig ??
    `${webPaths.storybook}/preview.${ts ? 'tsx' : 'js'}`
  const read = (path) => fse.readFileSync(path, { encoding: 'utf-8' })

  if (!fse.existsSync(sbPreviewConfigPath)) {
    // If the Storybook preview config file doesn't exist, create it from the template
    const templateContent = read(
      path.resolve(__dirname, 'templates', 'storybook.preview.tsx.template'),
    )
    const storybookPreviewContent = ts
      ? templateContent
      : await transformTSToJS(sbPreviewConfigPath, templateContent)

    writeFile(sbPreviewConfigPath, storybookPreviewContent)
  }

  const storybookPreviewContent = read(sbPreviewConfigPath)

  if (newConfigPath) {
    // If the new config file path is provided, merge it with the Storybook preview config file
    const newConfigTemplate = read(newConfigPath)
    const newConfigContent = ts
      ? newConfigTemplate
      : await transformTSToJS(newConfigPath, newConfigTemplate)

    const merged = await merge(storybookPreviewContent, newConfigContent, {
      ImportDeclaration: interleave,
      ArrayExpression: concatUnique,
      ObjectExpression: concatUnique,
      ArrowFunctionExpression: keepBothStatementParents,
      FunctionDeclaration: keepBoth,
    })

    const pConfig = await prettier.resolveConfig(sbPreviewConfigPath)
    const formatted = await prettier.format(merged, {
      parser: ts ? 'babel-ts' : 'babel',
      ...pConfig,
    })

    writeFile(sbPreviewConfigPath, formatted, { overwriteExisting: true })
  }
}
