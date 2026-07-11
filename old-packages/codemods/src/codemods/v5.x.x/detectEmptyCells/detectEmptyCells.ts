import type { TaskInnerAPI } from 'tasuku'

import {
  findCells,
  fileToAst,
  getCellGqlQuery,
  parseGqlQueryToAst,
} from '../../../lib/cells'

async function detectEmptyCells(taskContext: TaskInnerAPI) {
  const warnings: string[] = []

  const cellPaths = findCells()

  const susceptibleCells = cellPaths.filter((cellPath) => {
    const fileContents = fileToAst(cellPath)
    const cellQuery = getCellGqlQuery(fileContents)

    if (!cellQuery) {
      return false
    }

    let fields: ReturnType<typeof parseGqlQueryToAst>[0]['fields']

    try {
      fields = parseGqlQueryToAst(cellQuery)[0].fields
    } catch {
      warnings.push(cellPath)
      return
    }

    return fields.length > 1
  })

  if (susceptibleCells.length === 0 && warnings.length === 0) {
    taskContext.setOutput(
      "None of your project's Cells are susceptible to the new `isDataEmpty` behavior.",
    )
    return
  }

  const message: string[] = []

  if (susceptibleCells.length > 0) {
    message.push(
      [
        'You have Cells that are susceptible to the new `isDataEmpty` behavior:',
        '',
        susceptibleCells.map((c) => `• ${c}`).join('\n'),
        '',
      ].join('\n'),
    )
  }

  if (warnings.length > 0) {
    message.push(
      [
        [
          message.length > 0 && '→',
          `The following Cell(s) could not be parsed:`,
        ]
          .filter(Boolean)
          .join(' '),
        '',
        warnings.map((c) => `• ${c}`).join('\n'),
        '',
        "You'll have to audit them manually.",
        '',
      ].join('\n'),
    )
  }

  message.push(
    [
      'The new behavior is documented in detail on the forums: https://community.redwoodjs.com/t/redwood-v5-0-0-rc-is-now-available/4715.',
      "It's most likely what you want, but consider whether it affects you.",
      "If you'd like to revert to the old behavior, you can override the `isDataEmpty` function.",
    ].join('\n'),
  )

  const taskContextMethod = warnings.length > 0 ? 'setWarning' : 'setOutput'

  taskContext[taskContextMethod](message.join('\n'))
}

export { detectEmptyCells }
