import fs from 'fs'
import path from 'path'

import * as babel from '@babel/core'
import type {
  ListrTaskWrapper,
  ListrRenderer,
  ListrGetRendererClassFromValue,
} from 'listr2'
import { Listr } from 'listr2'
import { format } from 'prettier'

import { colors } from './colors.js'
import { getPaths } from './paths.js'

// TODO: Move this into `generateTemplate` when all templates have TS support
/*
 * Convert a generated TS template file into JS.
 */
export const transformTSToJS = (filename: string, content: string) => {
  if (!content) {
    return content
  }

  const babelFileResult = babel.transform(content, {
    filename,
    // If you ran `yarn rw generate` in `./web` transformSync would import the `.babelrc.js` file,
    // in `./web`? despite us setting `configFile: false`.
    cwd: process.env.NODE_ENV === 'test' ? undefined : getPaths().base,
    configFile: false,
    plugins: [
      [
        '@babel/plugin-transform-typescript',
        {
          isTSX: true,
          allExtensions: true,
        },
      ],
    ],
    retainLines: true,
  })

  if (!babelFileResult?.code) {
    console.error(colors.error(`Could not transform ${filename} to JS`))

    process.exit(1)
  }

  return prettify(filename.replace(/\.ts(x)?$/, '.js$1'), babelFileResult.code)
}

/**
 * This returns the config present in `prettier.config.js` of a Redwood project.
 */
export const getPrettierOptions = async () => {
  try {
    const { default: options } = await import(
      `file://${path.join(getPaths().base, 'prettier.config.js')}`
    )

    if (options.tailwindConfig?.startsWith('.')) {
      // Make this work with --cwd
      options.tailwindConfig = path.join(
        process.env.RWJS_CWD ?? process.cwd(),
        options.tailwindConfig,
      )
    }

    return options
  } catch {
    return undefined
  }
}

export const prettify = async (
  templateFilename: string,
  renderedTemplate: string,
): Promise<string> => {
  // We format .js and .css templates, we need to tell prettier which parser
  // we're using.
  // https://prettier.io/docs/en/options.html#parser
  const parser = {
    '.css': 'css',
    '.js': 'babel',
    '.ts': 'babel-ts',
    '.tsx': 'babel-ts',
  }[path.extname(templateFilename.replace('.template', ''))]

  if (typeof parser === 'undefined') {
    return renderedTemplate
  }

  const prettierOptions = await getPrettierOptions()

  return format(renderedTemplate, {
    ...prettierOptions,
    parser,
  })
}

export type ExistingFiles = 'OVERWRITE' | 'SKIP' | 'FAIL'

export const writeFile = <Renderer extends typeof ListrRenderer>(
  target: string,
  contents: string,
  { existingFiles = 'FAIL' }: { existingFiles?: ExistingFiles } = {},
  // TODO: Remove type cast by finding all places `writeFile` is used and
  // making sure a proper task is passed in
  task: ListrTaskWrapper<never, Renderer, Renderer> = {} as ListrTaskWrapper<
    never,
    Renderer,
    Renderer
  >,
) => {
  const { base } = getPaths()
  task.title = `Writing \`./${path.relative(base, target)}\``
  const exists = fs.existsSync(target)

  if (exists && existingFiles === 'FAIL') {
    throw new Error(`${target} already exists.`)
  }

  if (exists && existingFiles === 'SKIP') {
    task.skip(`Skipping update of \`./${path.relative(base, target)}\``)
    return
  }

  const filename = path.basename(target)
  const targetDir = target.replace(filename, '')
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(target, contents)
  task.title = `Successfully wrote file \`./${path.relative(base, target)}\``
}

/**
 * Creates a list of tasks that write files to the disk.
 *
 * @param files - {[filepath]: contents}
 */
export const writeFilesTask = <Renderer extends typeof ListrRenderer>(
  files: Record<string, string>,
  options: { existingFiles: ExistingFiles },
) => {
  const { base } = getPaths()

  return new Listr(
    Object.keys(files).map((file) => {
      const contents = files[file]

      return {
        title: `...waiting to write file \`./${path.relative(base, file)}\`...`,
        task: (
          _ctx: never,
          task: ListrTaskWrapper<
            never,
            ListrGetRendererClassFromValue<Renderer>,
            ListrGetRendererClassFromValue<Renderer>
          >,
        ) => {
          return writeFile(file, contents, options, task)
        },
      }
    }),
  )
}
