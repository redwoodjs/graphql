import fs from 'fs'
import path from 'path'

import pascalcase from 'pascalcase'

import { transformTSToJS } from '../lib/index.js'
import { getPaths } from '../lib/paths.js'
import { isTypeScriptProject } from '../lib/project.js'

interface FilesArgs {
  basedir: string
  webAuthn: boolean
}

/**
 * Get the api side file paths and file contents to write
 *
 * Example return value:
 * ```json
 * {
 *   "/Users/tobbe/dev/rw-app/api/src/lib/auth.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/lib/helperFunctions.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/functions/auth.ts": "<file content>"
 * }
 * ```
 */
export const apiSideFiles = async ({ basedir, webAuthn }: FilesArgs) => {
  const apiSrcPath = getPaths().api.src
  const apiBaseTemplatePath = path.join(basedir, 'templates', 'api')
  const templateDirectories = fs.readdirSync(apiBaseTemplatePath)

  let filesRecord: Record<string, string> = {}

  for (const dir of templateDirectories) {
    const templateFiles = fs.readdirSync(path.join(apiBaseTemplatePath, dir))
    const filePaths = templateFiles
      .filter((fileName) => {
        const fileNameParts = fileName.split('.')
        // Remove all webAuthn files. We'll handle those in the next step
        return fileNameParts.length <= 3 || fileNameParts.at(-3) !== 'webAuthn'
      })
      .map((fileName) => {
        // remove "template" from the end, and change from {ts,tsx} to {js,jsx} for
        // JavaScript projects
        let outputFileName = fileName.replace(/\.template$/, '')
        if (!isTypeScriptProject()) {
          outputFileName = outputFileName.replace(/\.ts(x?)$/, '.js$1')
        }

        if (!webAuthn) {
          return { templateFileName: fileName, outputFileName }
        }

        // Insert "webAuthn." before the second to last part
        const webAuthnFileName = fileName
          .split('.')
          .reverse()
          .map((part, i) => (i === 1 ? 'webAuthn.' + part : part))
          .reverse()
          .join('.')

        // Favor the abc.xyz.webAuthn.ts.template file if it exists, otherwise
        // just go with the "normal" filename
        if (templateFiles.includes(webAuthnFileName)) {
          return { templateFileName: webAuthnFileName, outputFileName }
        } else {
          return { templateFileName: fileName, outputFileName }
        }
      })
      .map((f) => {
        const templateFilePath = path.join(
          apiBaseTemplatePath,
          dir,
          f.templateFileName,
        )
        const outputFilePath = path.join(apiSrcPath, dir, f.outputFileName)

        return { templateFilePath, outputFilePath }
      })

    for (const paths of filePaths) {
      const content = fs.readFileSync(paths.templateFilePath, 'utf8')

      filesRecord = {
        ...filesRecord,
        [paths.outputFilePath]: isTypeScriptProject()
          ? content
          : await transformTSToJS(paths.outputFilePath, content),
      }
    }
  }

  return filesRecord
}

/**
 * Loops through the keys in `filesRecord` and generates unique file paths if
 * they conflict with existing files
 *
 * Given this input:
 * ```json
 * {
 *   "/Users/tobbe/dev/rw-app/api/src/lib/auth.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/lib/helperFunctions.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/lib/supertokens.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/functions/auth.ts": "<file content>"
 * }
 * ```
 *
 * You could get this output, depending on what existing files there are
 * ```json
 * {
 *   "/Users/tobbe/dev/rw-app/api/src/lib/supertokensAuth3.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/lib/supertokensHelperFunctions.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/lib/supertokens2.ts": "<file content>",
 *   "/Users/tobbe/dev/rw-app/api/src/functions/auth.ts": "<file content>"
 * }
 * ```
 */
export function generateUniqueFileNames(
  filesRecord: Record<string, string>,
  provider: string,
) {
  const newFilesRecord: Record<string, string> = {}

  Object.keys(filesRecord).forEach((fullPath) => {
    let newFullPath = fullPath
    let i = 1
    while (fs.existsSync(newFullPath)) {
      const nameParts = path.basename(fullPath).split('.')

      if (nameParts[0] === provider) {
        // api/lib/supertokens.ts -> api/lib/supertokens2.ts

        const newFileName =
          provider + (i + 1) + '.' + nameParts.slice(1).join('.')

        newFullPath = path.join(path.dirname(fullPath), newFileName)
      } else {
        // api/lib/auth.ts -> api/lib/supertokensAuth.ts
        // (potentially) -> api/lib/supertokensAuth2.ts depending on what
        // files already exists
        const count = i > 1 ? i : ''

        const newFileName =
          provider +
          pascalcase(nameParts[0]) +
          count +
          '.' +
          nameParts.slice(1).join('.')

        newFullPath = path.join(path.dirname(fullPath), newFileName)
      }

      i++
    }

    newFilesRecord[newFullPath] = filesRecord[fullPath]
  })

  return newFilesRecord
}
