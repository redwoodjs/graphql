import path from 'path'

import fg from 'fast-glob'
import type { TaskInnerAPI } from 'tasuku'
import task from 'tasuku'

import runTransform from '../../../lib/runTransform'

export const command = 'convert-js-to-jsx'
export const description =
  '(v5.x.x->v6.x.x) Converts web components from .js to .jsx'

export const handler = () => {
  task('Convert Js To Jsx', async ({ setOutput }: TaskInnerAPI) => {
    await runTransform({
      transformPath: path.join(__dirname, 'convertJsToJsx.js'),
      // All files in web/src that are .js
      targetPaths: fg.sync('web/src/**/*.js'),
    })

    setOutput(
      'All done! Your file contents have not been changed just the extension.',
    )
  })
}
