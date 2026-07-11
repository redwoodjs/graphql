import { transform } from '@babel/core'

import { getPaths } from '@redwoodjs/project-config'

import prettify from './prettify'

const ts2js = (file: string) => {
  const result = transform(file, {
    cwd: getPaths().base,
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

  if (result?.code) {
    return prettify(result.code)
  }

  return null
}

export default ts2js
