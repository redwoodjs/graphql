vi.mock('fs')
vi.mock('node:fs', async () => {
  const memfs = await import('memfs')
  return {
    ...memfs.fs,
    default: memfs.fs,
  }
})

import { vol } from 'memfs'
import { vi, beforeAll, afterAll, it, expect } from 'vitest'

import { setTomlSetting } from '../project.js'

// Set up RWJS_CWD
let original_RWJS_CWD: string | undefined
const FIXTURE_PATH = '/redwood-app'

beforeAll(() => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = FIXTURE_PATH
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
  vi.restoreAllMocks()
  vi.resetModules()
})

it('should add `fragments = true` to empty redwood.toml', () => {
  vol.fromJSON({ 'redwood.toml': '' }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', 'true')

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toMatch(
    /fragments = true/,
  )
})

it('should skip redwood.toml update if fragments are already enabled', () => {
  const toml = '[graphql]\nfragments = true'
  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(toml)
})

it('should skip redwood.toml update if fragments are already enabled (with no spaces)', () => {
  const toml = '[graphql]\nfragments=true'
  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(toml)
})

it('should skip redwood.toml update if fragments are already enabled, together with other settings', async () => {
  const toml = `
[graphql]
foo = "bar"
fragments = true
`
  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(toml)
})

it('should update redwood.toml even if `fragments = true` exists for other sections', async () => {
  const toml = `
[notGraphql]
  fragments = true
`
  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(
    toml + '\n[graphql]\n  fragments = true',
  )
})

it('should add `fragments = true` to existing [graphql] section', async () => {
  const toml = `
[graphql]

  isAwesome = true

[browser]
  open = true
`
  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]

  isAwesome = true
  fragments = true

[browser]
  open = true
`)
})

it("should not indent `fragments = true` if other settings aren't", async () => {
  const toml = `
[graphql]
isAwesome = true

[browser]
open = true
`
  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]
isAwesome = true
fragments = true

[browser]
open = true
`)
})

it('should handle when [graphql] is last section in redwood.toml', async () => {
  const toml = `
[graphql]
  isAwesome = true`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(
    toml + '\n  fragments = true',
  )
})

it('should add to end of existing section, even with blank lines in section', async () => {
  const toml = `
[graphql]
  isAwesome = true
  foo = "bar"

  trustedDocuments = true

[browser]
  open = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]
  isAwesome = true
  foo = "bar"

  trustedDocuments = true
  fragments = true

[browser]
  open = true
`)
})

it("should add to end of existing section, also when it's the last section", async () => {
  const toml = `
[graphql]
  isAwesome = true
  foo = "bar"

  trustedDocuments = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(
    toml + '  fragments = true\n',
  )
})

it('should add to end of existing empty section', async () => {
  const toml = `
[graphql]
[browser]
open = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]
fragments = true
[browser]
open = true
`)
})

it('should handle when [graphql] is empty and last section in redwood.toml', async () => {
  const toml = `
[browser]
open = true
[graphql]
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
fragments = true
`)
})

it('should update existing setting if available', async () => {
  const toml = `
[browser]
open = true
[graphql]
fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
fragments = true
`)
})

it('should update existing setting if available, with no spaces', async () => {
  const toml = '[graphql]\nfragments=false'

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(
    '[graphql]\nfragments = true',
  )
})

it('should keep existing indentation when updating existing setting', async () => {
  const toml = `
[browser]
open = true
[graphql]
  isAwesome = true
  foo = "bar"

    fragments =false
trustedDocuments = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
  isAwesome = true
  foo = "bar"

    fragments = true
trustedDocuments = true
`)
})

it('should uncomment and update existing commented setting value', async () => {
  const toml = `
[browser]
open = true
[graphql]
# fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
fragments = true
`)
})

it('should uncomment and update existing commented setting value, only if no uncommented setting exists', async () => {
  const toml = `
[browser]
open = true
[graphql]
# fragments = false
fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
# fragments = false
fragments = true
`)
})

it('should add new setting if current is commented out, with section comments', async () => {
  const toml = `
# settings related to GraphQL
[graphql]
# fragments = false

# control browser behavior
[browser]
open = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
# settings related to GraphQL
[graphql]
fragments = true

# control browser behavior
[browser]
open = true
`)
})

it('should add new setting if current is commented out, with settings comments', async () => {
  const toml = `
[browser]
  # open a new browser tab when running \`yarn rw dev\`
  open = true
[graphql]
  # enable trusted documents aka possible types
  trustedDocuments = true
  # enable fragments support
  # fragments = false
[web]
  # Start the web server on port 8910
  port = 8910
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
  # open a new browser tab when running \`yarn rw dev\`
  open = true
[graphql]
  # enable trusted documents aka possible types
  trustedDocuments = true
  # enable fragments support
  fragments = true
[web]
  # Start the web server on port 8910
  port = 8910
`)
})

it('should add new setting if current is commented out, with more settings in section after', async () => {
  const toml = `
[browser]
  # open a new browser tab when running \`yarn rw dev\`
  open = true
[graphql]
  # enable trusted documents aka possible types
  trustedDocuments = true
  # enable fragments support
  # fragments = false

  isAwesome = true
[web]
  # Start the web server on port 8910
  port = 8910
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
  # open a new browser tab when running \`yarn rw dev\`
  open = true
[graphql]
  # enable trusted documents aka possible types
  trustedDocuments = true
  # enable fragments support
  fragments = true

  isAwesome = true
[web]
  # Start the web server on port 8910
  port = 8910
`)
})

it('should update the last commented setting', async () => {
  const toml = `
[browser]
  # open a new browser tab when running \`yarn rw dev\`
  open = true
[graphql]
  # enable trusted documents aka possible types
  trustedDocuments = true
  # enable fragments support
  # fragments = maybe-not
  # fragments = maybe
  # fragments = absolutely-not

  isAwesome = true
[web]
  # Start the web server on port 8910
  port = 8910
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
  # open a new browser tab when running \`yarn rw dev\`
  open = true
[graphql]
  # enable trusted documents aka possible types
  trustedDocuments = true
  # enable fragments support
  # fragments = maybe-not
  # fragments = maybe
  fragments = true

  isAwesome = true
[web]
  # Start the web server on port 8910
  port = 8910
`)
})

it('should handle indentation before comment', async () => {
  const toml = `
[browser]
open = true
[graphql]
  # fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
  fragments = true
`)
})

it('should handle indentation inside comment', async () => {
  const toml = `
[browser]
open = true
[graphql]
#  fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
  fragments = true
`)
})

// Feel free to update this test case if you want another behavior for spacing.
// I just wrote it to document current behavior, not because we need to forever
// keep this behavior
it('should use comment indentation if other lines before are less indented', async () => {
  const toml = `
[browser]
open = true
[graphql]
trustedDocuments = true
#  fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
trustedDocuments = true
  fragments = true
`)
})

// Feel free to update this test case if you want another behavior for spacing.
// I just wrote it to document current behavior, not because we need to forever
// keep this behavior
it('should use comment indentation if other lines after are less indented', async () => {
  const toml = `
[browser]
open = true
[graphql]
#  fragments = false
trustedDocuments = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
  fragments = true
trustedDocuments = true
`)
})

it('should use indentation of actual value, even with commented value before', async () => {
  const toml = `
[browser]
open = true
[graphql]
  # fragments = false
fragments = false
  trustedDocuments = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
  # fragments = false
fragments = true
  trustedDocuments = true
`)
})

it('should use indentation of actual value, even with commented value after', async () => {
  const toml = `
[browser]
open = true
[graphql]
  trustedDocuments = true
fragments = false
  # fragments = false
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[browser]
open = true
[graphql]
  trustedDocuments = true
fragments = true
  # fragments = false
`)
})

it('should not care about commented settings in other sections', async () => {
  const toml = `
[graphql]
[browser]
  # fragments = false
  open = true
`

  vol.fromJSON({ 'redwood.toml': toml }, FIXTURE_PATH)

  setTomlSetting('graphql', 'fragments', true)

  expect(vol.toJSON()[FIXTURE_PATH + '/redwood.toml']).toEqual(`
[graphql]
fragments = true
[browser]
  # fragments = false
  open = true
`)
})
