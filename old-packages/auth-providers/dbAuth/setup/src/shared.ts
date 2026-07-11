import fs from 'node:fs'
import path from 'node:path'

import { getDMMF, getSchema } from '@prisma/internals'
import execa from 'execa'

import { getPaths } from '@redwoodjs/cli-helpers'
import { processPagesDir } from '@redwoodjs/project-config'

export const libPath = getPaths().api.lib.replace(getPaths().base, '')
export const functionsPath = getPaths().api.functions.replace(
  getPaths().base,
  '',
)

export const getModelNames = async () => {
  const datamodel = await getSchema(getPaths().api.dbSchema)
  const schema = await getDMMF({ datamodel })

  return schema.datamodel.models.map((model) => model.name)
}

export const hasModel = async (name: string) => {
  if (!name) {
    return false
  }

  // Support PascalCase, camelCase, kebab-case, UPPER_CASE, and lowercase model
  // names
  const modelName = name.replace(/[_-]/g, '').toLowerCase()
  const modelNames = (await getModelNames()).map((name) => name.toLowerCase())

  if (modelNames.includes(modelName)) {
    return true
  }

  return false
}

export async function addModels(models: string) {
  const isDirectory = fs.statSync(getPaths().api.dbSchema).isDirectory()

  if (isDirectory) {
    fs.writeFileSync(path.join(getPaths().api.dbSchema, 'user.prisma'), models)
  } else {
    fs.appendFileSync(getPaths().api.dbSchema, models)
  }
}

export function hasAuthPages() {
  const routes = fs.readFileSync(getPaths().web.routes, 'utf-8')

  // If the user already has a route for /login, /signin, or /signup, we
  // assume auth pages are already set up
  if (/path={?['"]\/(login|signin|signup)['"]}? /i.test(routes)) {
    return true
  }

  return processPagesDir().some((page) => {
    if (
      page.importName === 'LoginPage' ||
      page.importName === 'LogInPage' ||
      page.importName === 'SigninPage' ||
      page.importName === 'SignInPage' ||
      page.importName === 'SignupPage' ||
      page.importName === 'SignUpPage'
    ) {
      return true
    }

    return false
  })
}

export function generateAuthPagesTask(generatingUserModel: boolean) {
  return {
    title: 'Adding dbAuth pages...',
    task: async () => {
      const rwjsPaths = getPaths()

      const args = ['rw', 'g', 'dbAuth']

      if (generatingUserModel) {
        args.push(
          '--username-label',
          'username',
          '--password-label',
          'password',
        )
      }

      await execa('yarn', args, {
        stdio: 'inherit',
        shell: true,
        cwd: rwjsPaths.base,
      })
    },
  }
}
