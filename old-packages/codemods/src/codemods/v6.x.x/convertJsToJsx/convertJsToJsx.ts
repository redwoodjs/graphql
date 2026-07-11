import fs from 'fs'

import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift
  const ast = j(file.source)

  const containsJSX =
    ast.find(j.JSXElement).length !== 0 ||
    ast.find(j.JSXFragment).length !== 0 ||
    ast.find(j.JSXText).length !== 0

  if (containsJSX) {
    fs.renameSync(
      file.path,
      file.path.substring(0, file.path.lastIndexOf('.')) + '.jsx',
    )
  }

  // NOTE:
  // We deliberately don't return a value here, as we do not want to transform the source
  // See more here: https://github.com/facebook/jscodeshift
}
