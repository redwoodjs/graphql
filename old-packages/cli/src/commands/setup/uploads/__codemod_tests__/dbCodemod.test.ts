import path from 'node:path'

import { describe, it, expect } from 'vitest'

import { runTransform } from '../../../../lib/runTransform'

describe('Db codemod', () => {
  it('Handles the default db case', async () => {
    await matchTransformSnapshot('dbCodemod', 'defaultDb')
  })

  it('will throw an error if the db file has the old format', async () => {
    const transformResult = await runTransform({
      transformPath: path.join(__dirname, '../dbCodemod.ts'), // Use TS here!
      targetPaths: [
        path.join(__dirname, '../__testfixtures__/oldFormat.input.ts'),
      ],
    })

    expect(transformResult.error).toContain('ERR_OLD_FORMAT')
  })
})
