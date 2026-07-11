import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import type { ExecaError } from 'execa'
import execa from 'execa'
import semver from 'semver'

import { isTypeScriptProject, transformTSToJS } from '@redwoodjs/cli-helpers'
import { getPaths } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import c from '../lib/colors'
import type { StorybookYargsOptions } from '../types'

const readFile = (target: fs.PathOrFileDescriptor) =>
  fs.readFileSync(target, { encoding: 'utf8' })

const writeFile = (target: string, contents: any) => {
  const { base } = getPaths()
  if (fs.existsSync(target)) {
    throw new Error(`${target} already exists.`)
  }

  const filename = path.basename(target)
  const targetDir = target.replace(filename, '')
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(target, contents)
  console.log(`Successfully wrote file \`./${path.relative(base, target)}\``)
}

export async function handler({
  build,
  buildDirectory,
  ci,
  open,
  port,
  smokeTest,
}: StorybookYargsOptions) {
  console.log(
    c.bold(
      `\nPlease find documentation and links to provide feedback for this new command at:\n -> https://community.redwoodjs.com/t/7212\n\n`,
    ),
  )

  // We add a stub file to type generation because users don't have Storybook
  // installed when they first start a project. We need to remove the file once
  // they install Storybook so that the real types come through.
  fs.rmSync(
    path.join(getPaths().generated.types.includes, 'web-storybook.d.ts'),
    { force: true },
  )

  // Check for conflicting options
  if (build && smokeTest) {
    throw new Error('Can not provide both "--build" and "--smoke-test"')
  }

  if (build && open) {
    console.warn(
      c.warning(
        'Warning: --open option has no effect when running Storybook build',
      ),
    )
  }

  const cwd = getPaths().web.base
  const staticAssetsFolder = path.join(cwd, 'public')
  const execaOptions: Partial<execa.Options> = {
    stdio: 'inherit',
    shell: true,
    cwd,
  }

  // Create the `MockServiceWorker.js` file. See https://v1.mswjs.io/docs/cli/init
  await execa.command(
    `yarn msw init "${staticAssetsFolder}" --no-save`,
    execaOptions,
  )

  const usingTS = isTypeScriptProject()
  const mainFileName = usingTS ? 'main.ts' : 'main.js'

  const redwoodProjectPaths = getPaths()
  const storybookConfigPath = path.dirname(
    `${redwoodProjectPaths.web.storybook}/${mainFileName}`,
  )

  const storybookMainFilePath = path.join(storybookConfigPath, mainFileName)
  const storybookPreviewBodyFilePath = path.join(
    storybookConfigPath,
    'preview-body.html',
  )

  // Check if the config files exists yet. If they don't, create 'em!
  // Because this path is dependent on whether the project is TS or JS, we
  // check for the appropriate file extension. This means that if a user
  // is using JS and switches to TS, we won't detect it and will create a new
  // `main.ts` file.
  if (!fs.existsSync(storybookMainFilePath)) {
    const isTSProject = isTypeScriptProject()
    console.log(`Storybook's ${mainFileName} not found. Creating it now...`)
    const mainConfigTemplatePath = path.join(
      __dirname,
      'templates/main.ts.template', // The template is TS, and we'll convert it to JS if needed
    )
    const mainConfigContentTS = readFile(mainConfigTemplatePath)
    if (isTSProject) {
      writeFile(storybookMainFilePath, mainConfigContentTS)
    } else {
      const mainConfigContentJS = await transformTSToJS(
        storybookMainFilePath,
        mainConfigContentTS,
      )
      writeFile(storybookMainFilePath, mainConfigContentJS)
    }
    console.log(`${mainFileName} created!`)
  }

  if (!fs.existsSync(storybookPreviewBodyFilePath)) {
    console.log("Storybook's preview-body.html not found. Creating it now...")
    const previewBodyTemplatePath = path.join(
      __dirname,
      'templates/preview-body.html.template',
    )
    const previewBodyConfigContent = readFile(previewBodyTemplatePath)
    writeFile(storybookPreviewBodyFilePath, previewBodyConfigContent)
    console.log('preview-body.html created!')
  }

  let command = ''
  const flags = [`--config-dir "${storybookConfigPath}"`]

  if (build) {
    command = `yarn storybook build ${[
      ...flags,
      `--output-dir "${buildDirectory}"`,
    ]
      .filter(Boolean)
      .join(' ')}`
  } else if (smokeTest) {
    command = `yarn storybook dev ${[
      ...flags,
      `--port ${port}`,
      `--smoke-test`,
      `--ci`,
      `--no-version-updates`,
    ]
      .filter(Boolean)
      .join(' ')}`
  } else {
    command = `yarn storybook dev ${[
      ...flags,
      `--port ${port}`,
      `--no-version-updates`,
      ci && '--ci',
      !open && `--no-open`,
    ]
      .filter(Boolean)
      .join(' ')}`
  }

  const env: Record<string, string> = {}

  if (
    semver.parse(process.version) !== null &&
    semver.lt(process.version, '22.0.0') &&
    semver.gte(process.version, '20.19.0')
  ) {
    env.NODE_OPTIONS = '--no-experimental-require-module'
  }

  try {
    await execa.command(command, { ...execaOptions, env })
  } catch (e) {
    if ((e as ExecaError).signal !== 'SIGINT') {
      console.log(c.error((e as Error).message))
      errorTelemetry(process.argv, (e as Error).message)
    }
    process.exit((e as ExecaError).exitCode ?? 1)
  }
}
