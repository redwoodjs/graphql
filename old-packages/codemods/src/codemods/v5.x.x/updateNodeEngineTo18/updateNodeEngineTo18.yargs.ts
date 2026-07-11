import task from 'tasuku'

import { updateNodeEngineTo18 } from './updateNodeEngineTo18'

export const command = 'update-node-engine-to-18'

export const description =
  '(v4.x.x->v5.x.x) Updates `engines.node` to `"=18.x"` in your project\'s root package.json'

export const handler = () => {
  task(
    'Updating `engines.node` to `"=18.x"` in root package.json',
    async ({ setError }) => {
      try {
        await updateNodeEngineTo18()
      } catch (e: any) {
        setError('Failed to codemod your project \n' + e?.message)
      }
    },
  )
}
