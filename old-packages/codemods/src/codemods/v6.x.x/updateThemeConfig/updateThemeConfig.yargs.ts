import path from 'path'

import fg from 'fast-glob'
import type { TaskInnerAPI } from 'tasuku'
import task from 'tasuku'

import { getPaths } from '@redwoodjs/project-config'

import runTransform from '../../../lib/runTransform'

export const command = 'update-theme-config'
export const description =
  '(v5.x.x->v6.x.x) Converts mantine and chakra UI configs to use ESM syntax'

export const handler = () => {
  task('Update Theme Config', async ({ setOutput }: TaskInnerAPI) => {
    const targetPaths = fg.sync('{chakra,mantine}.config.{js,jsx,tsx,ts}', {
      cwd: getPaths().web.config,
      absolute: true,
    })

    await runTransform({
      transformPath: path.join(__dirname, 'updateThemeConfig.js'),
      targetPaths,
    })

    setOutput('All done! Run `yarn rw lint --fix` to prettify your code')
  })
}
