import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'

import { getPaths, writeFilesTask } from '../../../../lib'

const REDWOOD_TOML_PATH = path.join(getPaths().base, 'redwood.toml')

export const updateApiURLTask = (apiUrl) => {
  return {
    title: 'Updating API URL in redwood.toml...',
    task: () => {
      const redwoodToml = fs.readFileSync(REDWOOD_TOML_PATH).toString()
      let newRedwoodToml = redwoodToml

      if (redwoodToml.match(/apiUrl/)) {
        newRedwoodToml = newRedwoodToml.replace(
          /apiUrl.*/g,
          `apiUrl = "${apiUrl}"`,
        )
      } else if (redwoodToml.match(/\[web\]/)) {
        newRedwoodToml = newRedwoodToml.replace(
          /\[web\]/,
          `[web]\n  apiUrl = "${apiUrl}"`,
        )
      } else {
        newRedwoodToml += `[web]\n  apiUrl = "${apiUrl}"`
      }

      fs.writeFileSync(REDWOOD_TOML_PATH, newRedwoodToml)
    },
  }
}

/**
 * Use this to create checks prior to running setup commands
 * with a better error output
 *
 * @example preRequisiteCheckTask([
    {
      title: 'Checking if xxx is installed...',
      command: ['xxx', ['--version']],
      errorMessage: [
        'Looks like xxx.',
        'Please follow the steps...',
      ],
    },
  ])
 */
export const preRequisiteCheckTask = (preRequisites) => {
  return {
    title: 'Checking pre-requisites',
    task: () =>
      new Listr(
        preRequisites.map((preReq) => {
          return {
            title: preReq.title,
            task: async () => {
              try {
                await execa(...preReq.command)
              } catch (error) {
                error.message = error.message + '\n' + preReq.errorMessage
                throw error
              }
            },
          }
        }),
      ),
  }
}

/**
 *
 * Use this to add files to a users project
 *
 * @example
 * addFilesTask(
 *  files: [ { path: path.join(getPaths().base, 'netlify.toml'), content: NETLIFY_TOML }],
 * )
 */
export const addFilesTask = ({
  files,
  force = false,
  title = 'Adding config',
}) => {
  return {
    title: `${title}...`,
    task: () => {
      let fileNameToContentMap = {}
      files.forEach((fileData) => {
        fileNameToContentMap[fileData.path] = fileData.content
      })
      return writeFilesTask(fileNameToContentMap, { overwriteExisting: force })
    },
  }
}

export const addToGitIgnoreTask = ({ paths }) => {
  return {
    title: 'Updating .gitignore...',
    skip: () => {
      if (!fs.existsSync(path.resolve(getPaths().base, '.gitignore'))) {
        return 'No gitignore present, skipping.'
      }
    },
    task: async (_ctx, task) => {
      const gitIgnore = path.resolve(getPaths().base, '.gitignore')
      const content = fs.readFileSync(gitIgnore).toString()

      if (paths.every((item) => content.includes(item))) {
        task.skip('.gitignore already includes the additions.')
      }

      fs.appendFileSync(gitIgnore, ['\n', '# Deployment', ...paths].join('\n'))
    },
  }
}

export const addToDotEnvTask = ({ lines }) => {
  return {
    title: 'Updating .env...',
    skip: () => {
      if (!fs.existsSync(path.resolve(getPaths().base, '.env'))) {
        return 'No .env present, skipping.'
      }
    },
    task: async (_ctx, task) => {
      const env = path.resolve(getPaths().base, '.env')
      const content = fs.readFileSync(env).toString()

      if (lines.every((line) => content.includes(line.split('=')[0]))) {
        task.skip('.env already includes the additions.')
      }

      fs.appendFileSync(env, lines.join('\n'))
    },
  }
}
