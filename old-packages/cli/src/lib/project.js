import path from 'path'

import fs from 'fs-extra'

import { getPaths } from '.'

export const isTypeScriptProject = () => {
  const paths = getPaths()
  return (
    fs.existsSync(path.join(paths.web.base, 'tsconfig.json')) ||
    fs.existsSync(path.join(paths.api.base, 'tsconfig.json'))
  )
}

export const sides = () => {
  const paths = getPaths()

  let sides = []
  if (fs.existsSync(path.join(paths.web.base, 'package.json'))) {
    sides = [...sides, 'web']
  }
  if (fs.existsSync(path.join(paths.api.base, 'package.json'))) {
    sides = [...sides, 'api']
  }
  return sides
}

export const serverFileExists = () => {
  const serverFilePath = path.join(
    getPaths().api.src,
    `server.${isTypeScriptProject() ? 'ts' : 'js'}`,
  )

  return fs.existsSync(serverFilePath)
}
