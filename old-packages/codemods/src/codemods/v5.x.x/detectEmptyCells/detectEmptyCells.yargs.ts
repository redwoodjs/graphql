import task from 'tasuku'

import { detectEmptyCells } from './detectEmptyCells'

export const command = 'detect-empty-cells'

export const description =
  '(v4.x.x->v5.x.x) Detects Cells susceptible to the new Empty behavior'

export const handler = () => {
  task(
    'Detecting Cells susceptible to the new Empty behavior',
    async (taskContext) => {
      try {
        await detectEmptyCells(taskContext)
      } catch (e: any) {
        taskContext.setError(
          'Failed to detect cells susceptible to the new Empty behavior in your project \n' +
            e?.message,
        )
      }
    },
  )
}
