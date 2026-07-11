/* eslint-env vitest */

// Include at the top of your tests. Automatically mocks out the file system
//
// import { loadComponentFixture } from 'src/lib/test'
//
// test('true is true', () => {
//   expect('some output').toEqual(loadComponentFixture('component', 'filename.js'))
// })

import path from 'path'

import fs from 'fs-extra'
import { vi } from 'vitest'

import './mockTelemetry'

vi.mock('@redwoodjs/internal/dist/generate/generate', () => {
  return {
    generate: () => {
      return { errors: [] }
    },
  }
})

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const path = require('path')
  const originalProjectConfig = await importOriginal()
  return {
    ...originalProjectConfig,
    getPaths: () => {
      const BASE_PATH = '/path/to/project'
      return {
        base: BASE_PATH,
        api: {
          dataMigrations: path.join(BASE_PATH, './api/prisma/dataMigrations'),
          db: path.join(globalThis.__dirname, 'fixtures'), // this folder
          dbSchema: path.join(
            globalThis.__dirname,
            'fixtures',
            'schema.prisma',
          ), // this folder
          generators: path.join(BASE_PATH, './api/generators'),
          src: path.join(BASE_PATH, './api/src'),
          jobs: path.join(BASE_PATH, './api/src/jobs'),
          services: path.join(BASE_PATH, './api/src/services'),
          directives: path.join(BASE_PATH, './api/src/directives'),
          graphql: path.join(BASE_PATH, './api/src/graphql'),
          functions: path.join(BASE_PATH, './api/src/functions'),
        },
        web: {
          base: path.join(BASE_PATH, './web'),
          config: path.join(BASE_PATH, './web/config'),
          src: path.join(BASE_PATH, './web/src'),
          generators: path.join(BASE_PATH, './web/generators'),
          routes: path.join(BASE_PATH, 'web/src/Routes.js'),
          components: path.join(BASE_PATH, '/web/src/components'),
          layouts: path.join(BASE_PATH, '/web/src/layouts'),
          pages: path.join(BASE_PATH, '/web/src/pages'),
          app: path.join(BASE_PATH, '/web/src/App.js'),
        },
        scripts: path.join(BASE_PATH, 'scripts'),
        generated: {
          base: path.join(BASE_PATH, '.redwood'),
          schema: path.join(BASE_PATH, '.redwood/schema.graphql'),
          types: {
            includes: path.join(BASE_PATH, '.redwood/types/includes'),
            mirror: path.join(BASE_PATH, '.redwood/types/mirror'),
          },
        },
      }
    },
  }
})

vi.mock('@redwoodjs/cli-helpers', async (importOriginal) => {
  const originalCliHelpers = await importOriginal()

  return {
    ...originalCliHelpers,
    isTypeScriptProject: () => false,
  }
})

vi.mock('./project', () => ({
  isTypeScriptProject: () => false,
  sides: () => ['web', 'api'],
}))

globalThis.__prettierPath = path.resolve(
  __dirname,
  './__tests__/fixtures/prettier.config.js',
)

vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

export const generatorsRootPath = path.join(
  __dirname,
  '..',
  'commands',
  'generate',
)

/**
 * Loads the fixture for a generator by assuming a lot of the path structure
 * automatically:
 *
 *   `loadGeneratorFixture('scaffold', 'NamePage.js')`
 *
 * will return the contents of:
 *
 *   `cli/src/commands/generate/scaffold/__tests__/fixtures/NamePage.js`
 */
export const loadGeneratorFixture = (generator, name) => {
  return loadFixture(
    path.join(
      __dirname,
      '..',
      'commands',
      'generate',
      generator,
      '__tests__',
      'fixtures',
      name,
    ),
  )
}

/**
 * Returns the contents of a text file in a `fixtures` directory
 */
export const loadFixture = (filepath) => {
  return fs.readFileSync(filepath).toString()
}
