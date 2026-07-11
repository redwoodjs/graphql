import path from 'path'

import execa from 'execa'
import task from 'tasuku'

import { getPaths } from '@redwoodjs/project-config'

import isTSProject from '../../../lib/isTSProject'
import runTransform from '../../../lib/runTransform'

export const command = 'update-auth0-to-v2'

export const description =
  '(v4.x.x->v5.x.x) Updates the web-side auth.{ts,js} file to the v2 SDK'

export const handler = () => {
  task('Updating Auth0 to v2', async ({ setOutput }) => {
    const authFile = isTSProject ? 'auth.ts' : 'auth.js'

    try {
      await execa.command('yarn up @auth0/auth0-spa-js@^2', {
        cwd: getPaths().web.base,
      })
    } catch {
      console.error(
        "Couldn't update @auth0/auth0-spa-js; you'll have to upgrade it manually to the latest v2.x.x version",
      )
    }

    await runTransform({
      transformPath: path.join(__dirname, 'updateAuth0ToV2.js'),
      targetPaths: [path.join(getPaths().web.src, authFile)],
    })

    setOutput('All done! Run `yarn rw lint --fix` to prettify your code')
  })
}
