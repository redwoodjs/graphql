vi.mock('fs', async () => ({ ...memfsFs, default: { ...memfsFs } }))
vi.mock('node:fs', async () => ({ ...memfsFs, default: { ...memfsFs } }))
vi.mock('execa')
// The jscodeshift parts are tested by another test
vi.mock('../../../../../../lib/runTransform', () => {
  return {
    runTransform: () => {
      return {}
    },
  }
})

import { vol, fs as memfsFs } from 'memfs'
import { vi, beforeAll, afterAll, test, expect } from 'vitest'

import { Listr2Mock } from '../../../../../../__tests__/Listr2Mock'
import { handler } from '../fragmentsHandler'

vi.mock('listr2', () => ({
  Listr: Listr2Mock,
}))

// Set up RWJS_CWD
let original_RWJS_CWD: string | undefined
const FIXTURE_PATH = '/redwood-app'

beforeAll(() => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = FIXTURE_PATH
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
  vi.resetAllMocks()
  vi.resetModules()
})

test('all tasks are being called', async () => {
  vol.fromJSON({ 'redwood.toml': '', 'web/src/App.tsx': '' }, FIXTURE_PATH)

  await handler({ force: false })

  expect(Listr2Mock.executedTaskTitles).toMatchInlineSnapshot(`
    [
      "Update Redwood Project Configuration to enable GraphQL Fragments",
      "Generate possibleTypes.ts",
      "Import possibleTypes in App.tsx",
      "Add possibleTypes to the GraphQL cache config",
    ]
  `)
})

test('redwood.toml update is skipped if fragments are already enabled', async () => {
  vol.fromJSON(
    {
      'redwood.toml': '[graphql]\nfragments = true',
      'web/src/App.tsx': '',
    },
    FIXTURE_PATH,
  )

  await handler({ force: false })

  expect(Listr2Mock.executedTaskTitles).toMatchInlineSnapshot(`
    [
      "Generate possibleTypes.ts",
      "Import possibleTypes in App.tsx",
      "Add possibleTypes to the GraphQL cache config",
    ]
  `)

  expect(Listr2Mock.skippedTaskTitles).toMatchInlineSnapshot(`
    [
      "GraphQL Fragments are already enabled.",
    ]
  `)
})

test('redwood.toml update is skipped if fragments are already enabled, together with other settings', async () => {
  const toml = `
[graphql]
foo = "bar"
fragments = true
`
  vol.fromJSON({ 'redwood.toml': toml, 'web/src/App.tsx': '' }, FIXTURE_PATH)

  await handler({ force: false })

  expect(Listr2Mock.skippedTaskTitles).toMatchInlineSnapshot(`
    [
      "GraphQL Fragments are already enabled.",
    ]
  `)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(toml)
})

test('redwood.toml is updated even if `fragments = true` exists for other sections', async () => {
  const toml = `
[notGraphql]
  fragments = true
`
  vol.fromJSON({ 'redwood.toml': toml, 'web/src/App.tsx': '' }, FIXTURE_PATH)

  await handler({ force: false })

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(
    toml + '\n[graphql]\n  fragments = true',
  )
})

test('`fragments = true` is added to existing [graphql] section', async () => {
  const toml = `
[graphql]

  isAwesome = true

[browser]
  open = true
`
  vol.fromJSON({ 'redwood.toml': toml, 'web/src/App.tsx': '' }, FIXTURE_PATH)

  await handler({ force: false })

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]

  isAwesome = true
  fragments = true

[browser]
  open = true
`)
})

test("`fragments = true` is not indented if other settings aren't", async () => {
  const toml = `
[graphql]
isAwesome = true

[browser]
open = true
`
  vol.fromJSON({ 'redwood.toml': toml, 'web/src/App.tsx': '' }, FIXTURE_PATH)

  await handler({ force: false })

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]
isAwesome = true
fragments = true

[browser]
open = true
`)
})

test('[graphql] is last section in redwood.toml', async () => {
  const toml = `
[graphql]
  isAwesome = true`

  vol.fromJSON({ 'redwood.toml': toml, 'web/src/App.tsx': '' }, FIXTURE_PATH)

  await handler({ force: false })

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(
    toml + '\n  fragments = true',
  )
})
