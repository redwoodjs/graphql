vi.mock('fs-extra')

import path from 'path'

import fs from 'fs-extra'
import { vol } from 'memfs'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import '../../../../lib/test'
import { getPaths } from '../../../../lib'
import { updateApiURLTask } from '../helpers'
// Mock telemetry and other things

vi.mock('../../../../lib', async (importOriginal) => {
  const { printSetupNotes } = await importOriginal()

  return {
    printSetupNotes,
    getPaths: () => {
      return {
        base: path.resolve(
          path.join(
            __dirname,
            '../../../../../../../__fixtures__/example-todo-main',
          ),
        ),
      }
    },
    getConfig: () => ({
      web: {
        port: 8910,
      },
    }),
    writeFilesTask: (fileNameToContentMap) => {
      const keys = Object.keys(fileNameToContentMap)
      expect(keys.length).toBe(1)
      // Need to escape path.sep on Windows, otherwise the backslash (that
      // path.sep is on Windows) together with the 'n' in "netlify" will be
      // interpreted as a new-line. And need to use double backslashes, so
      // that one "survives" into the regexp
      expect(keys[0]).toMatch(new RegExp(`\\${path.sep}netlify.toml$`))
      for (const key of keys) {
        fs.writeFileSync(key, fileNameToContentMap[key])
      }
    },
  }
})

const REDWOOD_TOML_PATH = path.join(getPaths().base, 'redwood.toml')

beforeEach(() => {
  vol.fromJSON({
    [REDWOOD_TOML_PATH]: `[web]
  title = "Redwood App"
  port = 8910
  apiUrl = "/.redwood/functions" # you can customize graphql and dbAuth urls individually too: see https://redwoodjs.com/docs/app-configuration-redwood-toml#api-paths
  includeEnvironmentVariables = [] # any ENV vars that should be available to the web side, see https://redwoodjs.com/docs/environment-variables#web
[api]
  port = 8911
[browser]
  open = true
`,
  })
})

describe('netlify', () => {
  it('should call the handler without error', async () => {
    const netlify = await import('../providers/netlify')

    let error = undefined
    try {
      await netlify.handler({ force: true })
    } catch (err) {
      error = err
    }
    expect(error).toBeUndefined()
    const filesystem = vol.toJSON()
    const netlifyTomlPath = Object.keys(filesystem).find((path) =>
      path.endsWith('netlify.toml'),
    )
    expect(netlifyTomlPath).toBeDefined()
    expect(filesystem[netlifyTomlPath]).toMatchSnapshot()
  })

  it('Should update redwood.toml apiUrl', () => {
    updateApiURLTask('/.netlify/functions').task()

    expect(fs.readFileSync(REDWOOD_TOML_PATH, 'utf8')).toMatch(
      /apiUrl = "\/.netlify\/functions"/,
    )
  })

  it('should add netlify.toml', async () => {
    const netlify = await import('../providers/netlify')
    await netlify.handler({ force: true })

    const filesystem = vol.toJSON()
    const netlifyTomlPath = Object.keys(filesystem).find((path) =>
      path.endsWith('netlify.toml'),
    )
    expect(netlifyTomlPath).toBeDefined()
    expect(filesystem[netlifyTomlPath]).toMatchSnapshot()
  })
})
