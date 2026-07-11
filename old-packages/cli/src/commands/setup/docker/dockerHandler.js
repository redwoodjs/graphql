import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'

import { writeFile } from '@redwoodjs/cli-helpers'
import { getConfig, getConfigPath, getPaths } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import c from '../../../lib/colors'

export async function handler({ force }) {
  const TEMPLATE_DIR = path.join(__dirname, 'templates')

  let dockerfileTemplateContent = fs.readFileSync(
    path.resolve(TEMPLATE_DIR, 'Dockerfile'),
    'utf-8',
  )
  const dockerComposeDevTemplateContent = fs.readFileSync(
    path.resolve(TEMPLATE_DIR, 'docker-compose.dev.yml'),
    'utf-8',
  )
  const dockerComposeProdTemplateContent = fs.readFileSync(
    path.resolve(TEMPLATE_DIR, 'docker-compose.prod.yml'),
    'utf-8',
  )
  const dockerignoreTemplateContent = fs.readFileSync(
    path.resolve(TEMPLATE_DIR, 'dockerignore'),
    'utf-8',
  )

  const dockerfilePath = path.join(getPaths().base, 'Dockerfile')
  const dockerComposeDevFilePath = path.join(
    getPaths().base,
    'docker-compose.dev.yml',
  )
  const dockerComposeProdFilePath = path.join(
    getPaths().base,
    'docker-compose.prod.yml',
  )
  const dockerignoreFilePath = path.join(getPaths().base, '.dockerignore')

  const tasks = new Listr(
    [
      {
        title: 'Adding the official yarn workspace-tools plugin...',
        task: async (_ctx, task) => {
          const { stdout } = await execa.command('yarn plugin runtime --json', {
            cwd: getPaths().base,
          })

          const hasWorkspaceToolsPlugin = stdout
            .trim()
            .split('\n')
            .map(JSON.parse)
            .some(({ name }) => name === '@yarnpkg/plugin-workspace-tools')

          if (hasWorkspaceToolsPlugin) {
            task.skip(
              'The official yarn workspace-tools plugin is already installed',
            )
            return
          }

          return execa.command('yarn plugin import workspace-tools', {
            cwd: getPaths().base,
          }).stdout
        },
      },
      {
        title: 'Adding @redwoodjs/api-server and @redwoodjs/web-server...',
        task: async (_ctx, task) => {
          const apiServerPackageName = '@redwoodjs/api-server'
          const { dependencies: apiDependencies } = fs.readJSONSync(
            path.join(getPaths().api.base, 'package.json'),
          )
          const hasApiServerPackage =
            Object.keys(apiDependencies).includes(apiServerPackageName)

          const webServerPackageName = '@redwoodjs/web-server'
          const { dependencies: webDependencies } = fs.readJSONSync(
            path.join(getPaths().web.base, 'package.json'),
          )
          const hasWebServerPackage =
            Object.keys(webDependencies).includes(webServerPackageName)

          if (hasApiServerPackage && hasWebServerPackage) {
            task.skip(
              `${apiServerPackageName} and ${webServerPackageName} are already installed`,
            )
            return
          }

          if (!hasApiServerPackage) {
            const apiServerPackageVersion =
              await getVersionOfRedwoodPackageToInstall(apiServerPackageName)

            await execa.command(
              `yarn workspace api add ${apiServerPackageName}@${apiServerPackageVersion}`,
              {
                cwd: getPaths().base,
              },
            )
          }

          if (!hasWebServerPackage) {
            const webServerPackageVersion =
              await getVersionOfRedwoodPackageToInstall(webServerPackageName)

            await execa.command(
              `yarn workspace web add ${webServerPackageName}@${webServerPackageVersion}`,
              {
                cwd: getPaths().base,
              },
            )
          }

          return execa.command(`yarn dedupe`, {
            cwd: getPaths().base,
          }).stdout
        },
      },
      {
        title: 'Adding the Dockerfile and compose files...',
        task: (_ctx, task) => {
          const shouldSkip = [
            dockerfilePath,
            dockerComposeDevFilePath,
            dockerComposeProdFilePath,
            dockerignoreFilePath,
          ].every(fs.existsSync)

          if (!force && shouldSkip) {
            task.skip('The Dockerfile and compose files already exist')
            return
          }

          const config = getConfig()
          const { includeEnvironmentVariables } = config.web

          if (includeEnvironmentVariables.length) {
            const webBuildWithPrerenderStageDelimeter =
              'FROM api_build as web_build_with_prerender\n'
            const webBuildStageDelimeter = 'FROM base as web_build\n'

            const [
              beforeWebBuildWithPrerenderStageDelimeter,
              afterWebBuildWithPrerenderStageDelimeter,
            ] = dockerfileTemplateContent.split(
              webBuildWithPrerenderStageDelimeter,
            )

            const [beforeWebBuildStageDelimeter, afterWebBuildStageDelimeter] =
              afterWebBuildWithPrerenderStageDelimeter.split(
                webBuildStageDelimeter,
              )

            dockerfileTemplateContent = [
              beforeWebBuildWithPrerenderStageDelimeter.trim(),
              webBuildWithPrerenderStageDelimeter,
              ...includeEnvironmentVariables.map((envVar) => `ARG ${envVar}`),
              '',
              beforeWebBuildStageDelimeter.trim(),
              webBuildStageDelimeter,
              ...includeEnvironmentVariables.map((envVar) => `ARG ${envVar}`),
              afterWebBuildStageDelimeter,
            ].join('\n')
          }

          writeFile(
            dockerfilePath,
            dockerfileTemplateContent,
            {
              existingFiles: force ? 'OVERWRITE' : 'SKIP',
            },
            task,
          )
          writeFile(
            dockerComposeDevFilePath,
            dockerComposeDevTemplateContent,
            {
              existingFiles: force ? 'OVERWRITE' : 'SKIP',
            },
            task,
          )
          writeFile(
            dockerComposeProdFilePath,
            dockerComposeProdTemplateContent,
            { existingFiles: force ? 'OVERWRITE' : 'SKIP' },
            task,
          )
          writeFile(
            dockerignoreFilePath,
            dockerignoreTemplateContent,
            {
              existingFiles: force ? 'OVERWRITE' : 'SKIP',
            },
            task,
          )
        },
      },
      {
        title: 'Adding postgres to .gitignore...',
        task: (_ctx, task) => {
          const gitignoreFilePath = path.join(getPaths().base, '.gitignore')
          const gitignoreFileContent = fs.readFileSync(
            gitignoreFilePath,
            'utf-8',
          )

          if (gitignoreFileContent.includes('postgres')) {
            task.skip('postgres is already ignored by git')
            return
          }

          writeFile(
            gitignoreFilePath,
            gitignoreFileContent.concat('\npostgres\n'),
            { existingFiles: 'OVERWRITE' },
          )
        },
      },
      {
        title: 'Adding config to redwood.toml...',
        task: () => {
          const redwoodTomlPath = getConfigPath()
          let configContent = fs.readFileSync(redwoodTomlPath, 'utf-8')

          const browserOpenRegExp = /open\s*=\s*true/
          if (browserOpenRegExp.test(configContent)) {
            configContent = configContent.replace(
              /open\s*=\s*true/,
              'open = false',
            )
          }

          // using string replace here to preserve comments and formatting.
          writeFile(redwoodTomlPath, configContent, {
            existingFiles: 'OVERWRITE',
          })
        },
      },
    ],
    {
      renderer: process.env.NODE_ENV === 'test' ? 'verbose' : 'default',
    },
  )

  try {
    await tasks.run()

    console.log(
      [
        '',
        "We've written four files:",
        '',
        '- ./Dockerfile',
        '- ./.dockerignore',
        '- ./docker-compose.dev.yml',
        '- ./docker-compose.prod.yml',
        '',
        'To start the docker compose dev:',
        '',
        '  docker compose -f docker-compose.dev.yml up ',
        '',
        'Then, connect to the container and migrate your database:',
        '',
        '  docker compose -f ./docker-compose.dev.yml run --rm -it console /bin/bash',
        '  root@...:/home/node/app# yarn rw prisma migrate dev',
        '',
        "We assume you're using Postgres. If you're not, you'll need to make other changes to switch over.",
        "Lastly, ensure you have Docker. If you don't, see https://docs.docker.com/desktop/",
        '',
        "There's a lot in the Dockerfile and there's a reason for every line.",
        'Be sure to check out the docs: https://redwoodjs.com/docs/docker',
      ].join('\n'),
    )
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}

export async function getVersionOfRedwoodPackageToInstall(module) {
  const packageJsonPath = require.resolve('@redwoodjs/cli/package.json', {
    paths: [getPaths().base],
  })
  let { version } = fs.readJSONSync(packageJsonPath)

  const packumentP = await fetch(`https://registry.npmjs.org/${module}`)
  const packument = await packumentP.json()

  // If the version includes a plus, like '4.0.0-rc.428+dd79f1726'
  // (all @canary, @next, and @rc packages do), get rid of everything after the plus.
  if (version.includes('+')) {
    version = version.split('+')[0]
  }

  const versionIsPublished = Object.keys(packument.versions).includes(version)

  // Fallback to canary. This is most likely because it's a new package
  if (!versionIsPublished) {
    version = 'canary'
  }

  return version
}
