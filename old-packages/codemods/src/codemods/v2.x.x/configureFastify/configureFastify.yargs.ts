import fs from 'fs'
import path from 'path'

import { fetch } from '@whatwg-node/fetch'
import fg from 'fast-glob'
import task from 'tasuku'

import { getPaths } from '@redwoodjs/project-config'

import prettify from '../../../lib/prettify'
import runTransform from '../../../lib/runTransform'

export const command = 'configure-fastify'
export const description =
  '(v2.x.x->v2.x.x) Updates api side’s server.config.js to configure Fastify'

export const handler = () => {
  task('Configure Fastify', async ({ setOutput }) => {
    const [API_SERVER_CONFIG_PATH] = fg.sync('server.config.{js,ts}', {
      cwd: getPaths().api.base,
      absolute: true,
    })

    if (fs.existsSync(API_SERVER_CONFIG_PATH)) {
      await runTransform({
        transformPath: path.join(__dirname, 'configureFastify.js'),
        targetPaths: [API_SERVER_CONFIG_PATH],
      })

      // The transform generates two extra semicolons for some reason:
      //
      // ```js
      // module.exports = { config };;
      // ```
      //
      // They don't show up in tests cause we run prettier. Let's do the same here.
      fs.writeFileSync(
        API_SERVER_CONFIG_PATH,
        await prettify(fs.readFileSync(API_SERVER_CONFIG_PATH, 'utf-8')),
      )

      setOutput('All done!')
    } else {
      const res = await fetch(
        'https://raw.githubusercontent.com/redwoodjs/redwood/main/packages/create-redwood-app/template/api/server.config.js',
      )
      const text = await res.text()

      const NEW_API_SERVER_CONFIG_PATH = path.join(
        getPaths().api.base,
        'server.config.js',
      )

      fs.writeFileSync(NEW_API_SERVER_CONFIG_PATH, await prettify(text))

      setOutput(
        'Done! No server.config.js found, so we updated your project to use the latest version.',
      )
    }
  })
}
