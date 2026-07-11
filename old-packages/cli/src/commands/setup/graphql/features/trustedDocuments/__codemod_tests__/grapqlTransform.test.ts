import { describe, test } from 'vitest'

describe('trusted-documents graphql handler transform', () => {
  test('Default handler', async () => {
    await matchFolderTransform('graphqlTransform', 'graphql', {
      useJsCodeshift: true,
    })
  })

  test('Handler with the store already set up', async () => {
    await matchFolderTransform('graphqlTransform', 'alreadySetUp', {
      useJsCodeshift: true,
    })
  })
})
