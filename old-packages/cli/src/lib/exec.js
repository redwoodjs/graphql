import path from 'path'

import {
  getWebSideDefaultBabelConfig,
  registerApiSideBabelHook,
} from '@redwoodjs/babel-config'
import { getPaths } from '@redwoodjs/project-config'

export async function runScriptFunction({
  path: scriptPath,
  functionName,
  args,
}) {
  const script = require(scriptPath)
  const returnValue = await script[functionName](args)

  try {
    const { db } = require(path.join(getPaths().api.lib, 'db'))
    db.$disconnect()
  } catch (e) {
    // silence
  }

  return returnValue
}

export async function configureBabel() {
  const {
    overrides: _overrides,
    plugins: webPlugins,
    ...otherWebConfig
  } = getWebSideDefaultBabelConfig()

  // Import babel config for running script
  registerApiSideBabelHook({
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          alias: {
            $api: getPaths().api.base,
            $web: getPaths().web.base,
            api: getPaths().api.base,
            web: getPaths().web.base,
          },
          loglevel: 'silent', // to silence the unnecessary warnings
        },
        'exec-$side-module-resolver',
      ],
    ],
    overrides: [
      {
        test: ['./api/'],
        plugins: [
          [
            'babel-plugin-module-resolver',
            {
              alias: {
                src: getPaths().api.src,
              },
              loglevel: 'silent',
            },
            'exec-api-src-module-resolver',
          ],
        ],
      },
      {
        test: ['./web/'],
        plugins: [
          ...webPlugins,
          [
            'babel-plugin-module-resolver',
            {
              alias: {
                src: getPaths().web.src,
              },
              loglevel: 'silent',
            },
            'exec-web-src-module-resolver',
          ],
        ],
        ...otherWebConfig,
      },
    ],
  })
}
