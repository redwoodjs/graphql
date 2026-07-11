import path from 'path'

import fg from 'fast-glob'
import type { TaskInnerAPI } from 'tasuku'
import task from 'tasuku'

import { getPaths } from '@redwoodjs/project-config'

import runTransform from '../../../lib/runTransform'

export const command = 'replace-component-svgs'
export const description =
  '(v5.x.x->v6.x.x) Converts imported SVGs used as components to React components'

export const handler = () => {
  task('Replace Component Svgs', async ({ setOutput }: TaskInnerAPI) => {
    const targetPaths = fg.sync('**/*.{js,jsx,tsx}', {
      cwd: getPaths().web.src,
      absolute: true,
    })

    await runTransform({
      transformPath: path.join(__dirname, 'replaceComponentSvgs.js'),
      targetPaths,
    })

    setOutput('All done! Run `yarn rw lint --fix` to prettify your code')
  })
}
