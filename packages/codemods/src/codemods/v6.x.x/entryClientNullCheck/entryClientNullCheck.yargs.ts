import path from 'path'

import fg from 'fast-glob'
import type { TaskInnerAPI } from 'tasuku'
import task from 'tasuku'

import { getPaths } from '@redwoodjs/project-config'

import runTransform from '../../../lib/runTransform'

export const command = 'entry-client-null-check'
export const description = '(v6.x.x->v6.x.x) Converts world to bazinga'

export const handler = () => {
  task('Entry Client Null Check', async ({ setOutput }: TaskInnerAPI) => {
    await runTransform({
      transformPath: path.join(__dirname, 'entryClientNullCheck.js'),
      targetPaths: fg.sync('entry.client.{jsx,tsx}', {
        cwd: getPaths().web.src,
        absolute: true,
      }),
    })

    setOutput('All done! Run `yarn rw lint --fix` to prettify your code')
  })
}
