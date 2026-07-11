vi.mock('fs', async () => ({ ...memfsFs, default: { ...memfsFs } }))
vi.mock('node:fs', async () => ({ ...memfsFs, default: { ...memfsFs } }))
vi.mock('execa')
// The jscodeshift parts are tested by another test
vi.mock('../../../../../../lib/runTransform', () => ({
  runTransform: () => ({}),
}))

vi.mock('listr2', () => ({
  Listr: Listr2Mock,
}))

import type fs from 'node:fs'
import path from 'node:path'

import { vol, fs as memfsFs } from 'memfs'
import { vi, expect, it, describe, beforeAll, afterAll } from 'vitest'

import { Listr2Mock } from '../../../../../../__tests__/Listr2Mock.js'
import { handler } from '../trustedDocumentsHandler.js'

// Set up RWJS_CWD
let original_RWJS_CWD: string | undefined
const APP_PATH = '/redwood-app'

const tomlFixtures: Record<string, string> = {}

beforeAll(async () => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = APP_PATH

  const actualFs = await vi.importActual<typeof fs>('fs')
  const tomlFixturesPath = path.join(__dirname, '__fixtures__', 'toml')

  tomlFixtures.default = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'default.toml'),
    'utf-8',
  )

  tomlFixtures.fragments = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'fragments.toml'),
    'utf-8',
  )

  tomlFixtures.fragmentsNoSpaceEquals = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'fragments_no_space_equals.toml'),
    'utf-8',
  )

  tomlFixtures.trustedDocsAlreadySetup = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'trusted_docs_already_setup.toml'),
    'utf-8',
  )

  tomlFixtures.trustedDocsNoSpaceEquals = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'trusted_docs_no_space_equals.toml'),
    'utf-8',
  )

  tomlFixtures.trustedDocsFragmentsAlreadySetup = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'trusted_docs_fragments_already_setup.toml'),
    'utf-8',
  )

  tomlFixtures.trustedDocsCommentedGraphql = actualFs.readFileSync(
    path.join(tomlFixturesPath, 'trusted_docs_commented_graphql.toml'),
    'utf-8',
  )
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
  vi.resetAllMocks()
  vi.resetModules()
})

// Silence console.info
console.info = vi.fn()

describe('Trusted documents setup', () => {
  it('runs all tasks', async () => {
    vol.fromJSON(
      { 'redwood.toml': '', 'api/src/functions/graphql.js': '' },
      APP_PATH,
    )

    await handler({ force: false })

    expect(Listr2Mock.executedTaskTitles).toMatchInlineSnapshot(`
    [
      "Update Redwood Project Configuration to enable GraphQL Trusted Documents ...",
      "Generating Trusted Documents store ...",
      "Configuring the GraphQL Handler to use a Trusted Documents store ...",
    ]
  `)
  })

  describe('Project toml configuration updates', () => {
    describe('default toml where no graphql or trusted documents is setup', () => {
      it('updates the toml file with graphql and trusted documents enabled', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.default,
            'api/src/functions/graphql.js': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toMatchSnapshot()
      })
    })
    describe('default toml where graphql fragments are already setup', () => {
      it('updates the toml file with graphql and trusted documents enabled and keeps fragments', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.fragments,
            'api/src/functions/graphql.ts': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toMatchSnapshot()
      })
    })
    describe('default toml where graphql fragments are already setup using no spaces', () => {
      it('updates the toml file with graphql and trusted documents enabled and keeps fragments', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.fragmentsNoSpaceEquals,
            'api/src/functions/graphql.js': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toMatchSnapshot()
      })
    })
    describe('default toml where graphql trusted documents are already setup', () => {
      it('makes no changes as trusted documents are already setup', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.trustedDocsAlreadySetup,
            'api/src/functions/graphql.js': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toEqual(
          tomlFixtures.trustedDocsAlreadySetup,
        )
      })
    })
    describe('default toml where graphql trusted documents are already setup using no spaces', () => {
      it('makes no changes as trusted documents are already setup', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.trustedDocsNoSpaceEquals,
            'api/src/functions/graphql.js': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toEqual(
          tomlFixtures.trustedDocsNoSpaceEquals,
        )
      })
    })
    describe('default toml where graphql trusted documents and fragments are already setup', () => {
      it('makes no changes as trusted documents are already setup', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.trustedDocsFragmentsAlreadySetup,
            'api/src/functions/graphql.js': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toEqual(
          tomlFixtures.trustedDocsFragmentsAlreadySetup,
        )
      })
    })
    describe('toml where graphql section is commented out', () => {
      it('adds a new section with `trustedDocuments = true`', async () => {
        vol.fromJSON(
          {
            'redwood.toml': tomlFixtures.trustedDocsCommentedGraphql,
            'api/src/functions/graphql.js': '',
          },
          APP_PATH,
        )

        await handler({ force: false })

        expect(vol.toJSON()[APP_PATH + '/redwood.toml']).toMatchSnapshot()
      })
    })
  })
})
