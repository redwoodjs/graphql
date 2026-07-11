import fs from 'fs'
import path from 'path'

import { format } from 'prettier'
import parserBabel from 'prettier/parser-babel'
import tempy from 'tempy'

export const formatCode = async (code: string) => {
  return format(code, {
    parser: 'babel-ts',
    plugins: [parserBabel],
  })
}

export const createProjectMock = () => {
  const tempDir = tempy.directory()
  // add fake redwood.toml
  fs.closeSync(fs.openSync(path.join(tempDir, 'redwood.toml'), 'w'))

  return tempDir
}
