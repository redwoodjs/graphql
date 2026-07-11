globalThis.__dirname = __dirname

globalThis.mockFs = false
let mockFiles = {}

vi.mock('fs', async (importOriginal) => {
  const originalFs = await importOriginal()

  return {
    default: {
      ...originalFs,
      existsSync: (...args) => {
        if (mockFiles[args[0]]) {
          return true
        }

        return originalFs.existsSync.apply(null, args)
      },
      readFileSync: (path) => {
        if (mockFiles[path]) {
          return mockFiles[path]
        }

        return originalFs.readFileSync
      },
    },
  }
})

vi.mock('fs-extra', async (importOriginal) => {
  const originalFsExtra = await importOriginal()

  return {
    default: {
      ...originalFsExtra,
      existsSync: (...args) => {
        if (!globalThis.mockFs) {
          return originalFsExtra.existsSync.apply(null, args)
        }
        return false
      },
      mkdirSync: (...args) => {
        if (!globalThis.mockFs) {
          return originalFsExtra.mkdirSync.apply(null, args)
        }
      },
      writeFileSync: (target, contents) => {
        if (!globalThis.mockFs) {
          return originalFsExtra.writeFileSync.call(null, target, contents)
        }
      },
      readFileSync: (path) => {
        if (!globalThis.mockFs) {
          return originalFsExtra.readFileSync.call(null, path)
        }

        const mockedContent = mockFiles[path]

        return mockedContent || originalFsExtra.readFileSync.call(null, path)
      },
    },
  }
})

import path from 'path'

import fs from 'fs-extra'
import { vi, describe, it, test, expect, beforeEach, afterEach } from 'vitest'

import '../../../../lib/mockTelemetry'

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const path = require('path')
  const originalProjectConfig = await importOriginal()
  return {
    getPaths: () => {
      const BASE_PATH = '/path/to/project'

      return {
        base: BASE_PATH,
        web: {
          generators: path.join(BASE_PATH, './web/generators'),
          routes: path.join(BASE_PATH, 'web/src/Routes.js'),
          pages: path.join(BASE_PATH, '/web/src/pages'),
        },
      }
    },
    getConfig: () => ({}),
    ensurePosixPath: originalProjectConfig.ensurePosixPath,
    resolveFile: originalProjectConfig.resolveFile,
  }
})

vi.mock('@redwoodjs/cli-helpers', async (importOriginal) => {
  const originalCliHelpers = await importOriginal()

  return {
    ...originalCliHelpers,
    isTypeScriptProject: () => false,
  }
})

vi.mock('@redwoodjs/internal/dist/generate/generate', () => {
  return {
    generate: () => {
      return { errors: [] }
    },
  }
})

import { ensurePosixPath } from '@redwoodjs/project-config'

import { getPaths } from '../../../../lib'
import { pathName } from '../../helpers'
import * as page from '../page'

describe('Single world files', async () => {
  const singleWordFiles = await page.files({
    name: 'Home',
    tests: true,
    stories: true,
    ...page.paramVariants(pathName(undefined, 'home')),
  })

  it('returns exactly 3 files', () => {
    expect(Object.keys(singleWordFiles).length).toEqual(3)
  })

  it('creates a page component', () => {
    expect(
      singleWordFiles[
        path.normalize('/path/to/project/web/src/pages/HomePage/HomePage.jsx')
      ],
    ).toMatchSnapshot()
  })

  it('creates a page test', () => {
    expect(
      singleWordFiles[
        path.normalize(
          '/path/to/project/web/src/pages/HomePage/HomePage.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a page story', () => {
    expect(
      singleWordFiles[
        path.normalize(
          '/path/to/project/web/src/pages/HomePage/HomePage.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('multiWorldFiles', async () => {
  const multiWordFiles = await page.files({
    name: 'ContactUs',
    tests: true,
    stories: true,
    ...page.paramVariants(pathName(undefined, 'contact-us')),
  })

  it('creates a page component', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/pages/ContactUsPage/ContactUsPage.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a test for a component with multiple words for a name', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/pages/ContactUsPage/ContactUsPage.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a page story', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/pages/ContactUsPage/ContactUsPage.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('Plural word files', async () => {
  const pluralWordFiles = await page.files({
    name: 'Cats',
    tests: true,
    stories: true,
    ...page.paramVariants(pathName(undefined, 'cats')),
  })

  test('creates a page component with a plural word for name', () => {
    expect(
      pluralWordFiles[
        path.normalize('/path/to/project/web/src/pages/CatsPage/CatsPage.jsx')
      ],
    ).toMatchSnapshot()
  })
})

describe('paramFiles', async () => {
  const paramFiles = await page.files({
    name: 'Post',
    tests: true,
    stories: true,
    ...page.paramVariants(pathName('{id}', 'post')),
  })

  it('creates a page component with params', () => {
    expect(
      paramFiles[
        path.normalize('/path/to/project/web/src/pages/PostPage/PostPage.jsx')
      ],
    ).toMatchSnapshot()
  })

  it('creates a test for page component with params', () => {
    expect(
      paramFiles[
        path.normalize(
          '/path/to/project/web/src/pages/PostPage/PostPage.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('No test files', async () => {
  const noTestsFiles = await page.files({
    name: 'NoTests',
    tests: false,
    stories: true,
    ...page.paramVariants(pathName(undefined, 'no-tests')),
  })

  it('doesnt create a test for page component when tests=false', () => {
    expect(Object.keys(noTestsFiles)).toEqual([
      path.normalize(
        '/path/to/project/web/src/pages/NoTestsPage/NoTestsPage.stories.jsx',
      ),
      path.normalize(
        '/path/to/project/web/src/pages/NoTestsPage/NoTestsPage.jsx',
      ),
    ])
  })
})

describe('No stories files', async () => {
  const noStoriesFiles = await page.files({
    name: 'NoStories',
    tests: true,
    stories: false,
    ...page.paramVariants(pathName(undefined, 'no-stories')),
  })

  it('doesnt create a story for page component when stories=false', () => {
    expect(Object.keys(noStoriesFiles)).toEqual([
      path.normalize(
        '/path/to/project/web/src/pages/NoStoriesPage/NoStoriesPage.test.jsx',
      ),
      path.normalize(
        '/path/to/project/web/src/pages/NoStoriesPage/NoStoriesPage.jsx',
      ),
    ])
  })
})

test('creates a single-word route name', () => {
  const names = ['Home', 'home']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: '/' })).toEqual([
      '<Route path="/" page={HomePage} name="home" />',
    ])
  })
})

test('creates a camelCase route name for lowercase words', () => {
  const names = ['FooBar', 'foo_bar', 'foo-bar', 'fooBar']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: 'foo-bar' })).toEqual([
      '<Route path="foo-bar" page={FooBarPage} name="fooBar" />',
    ])
  })
})

test('creates a camelCase route name for uppercase words', () => {
  const names = ['FOO_BAR', 'FOO-BAR']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: 'foo-bar' })).toEqual([
      '<Route path="foo-bar" page={FOOBARPage} name="fooBar" />',
    ])
  })
})

test('creates a camelCase route name for uppercase and lowercase mixed words', () => {
  const names = ['FOOBar', 'FOO-Bar', 'FOO_Bar']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: 'foo-bar' })).toEqual([
      '<Route path="foo-bar" page={FOOBarPage} name="fooBar" />',
    ])
  })
})

test('creates a camelCase route name for multiple word names', () => {
  const names = ['AbTest', 'abTest', 'ab-test', 'ab_test']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: 'foo-bar' })).toEqual([
      '<Route path="foo-bar" page={AbTestPage} name="abTest" />',
    ])
  })
})

test('creates a camelCase route name for multiple words with uppercase character after special character', () => {
  const names = ['ABtest', 'aBtest', 'a-Btest', 'a_Btest']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: 'foo-bar' })).toEqual([
      '<Route path="foo-bar" page={ABtestPage} name="aBtest" />',
    ])
  })
})

test('creates a camelCase route name for multiple words starting with uppercase characters', () => {
  const names = ['ABTest', 'AB_test', 'AB-test']

  names.forEach((name) => {
    expect(page.routes({ name: name, path: 'foo-bar' })).toEqual([
      '<Route path="foo-bar" page={ABTestPage} name="abTest" />',
    ])
  })
})

test('creates a path equal to passed path', () => {
  expect(page.routes({ name: 'FooBar', path: 'fooBar-baz' })).toEqual([
    '<Route path="fooBar-baz" page={FooBarPage} name="fooBar" />',
  ])
})

test('paramVariants returns empty strings for no params', () => {
  const emptyParams = {
    propParam: '',
    propValueParam: '',
    argumentParam: '',
    paramName: '',
    paramValue: '',
    paramType: '',
  }
  expect(page.paramVariants()).toEqual(emptyParams)
  expect(page.paramVariants('')).toEqual(emptyParams)
  expect(page.paramVariants('/')).toEqual(emptyParams)
  expect(page.paramVariants('/post/edit')).toEqual(emptyParams)
})

test('paramVariants finds the param and type in the middle of the path', () => {
  expect(page.paramVariants('/post/{id:Int}/edit')).toEqual({
    propParam: '{ id }',
    propValueParam: 'id={42}',
    argumentParam: '{ id: 42 }',
    paramName: 'id',
    paramValue: 42,
    paramType: 'number',
  })
})

test('paramVariants handles boolean type', () => {
  expect(page.paramVariants('/post/edit/{debug:Boolean}')).toEqual({
    propParam: '{ debug }',
    propValueParam: 'debug={true}',
    argumentParam: '{ debug: true }',
    paramName: 'debug',
    paramValue: true,
    paramType: 'boolean',
  })
})

test('paramVariants paramType defaults to string', () => {
  expect(page.paramVariants('/posts/{id}')).toEqual({
    propParam: '{ id }',
    propValueParam: "id={'42'}",
    argumentParam: "{ id: '42' }",
    paramName: 'id',
    paramValue: '42',
    paramType: 'string',
  })
})

describe('handler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    console.info.mockRestore()
    console.log.mockRestore()
  })

  test('file generation', async () => {
    mockFiles = {
      [getPaths().web.routes]: [
        "import { Router, Route } from '@redwoodjs/router'",
        '',
        'const Routes = () => {',
        '  return (',
        '    <Router>',
        '      <Route path="/about" page={AboutPage} name="about" />',
        '      <Route notfound page={NotFoundPage} />',
        '    </Router>',
        '  )',
        '}',
        '',
        'export default Routes',
      ].join('\n'),
    }

    const spy = vi.spyOn(fs, 'writeFileSync')

    globalThis.mockFs = true

    await page.handler({
      name: 'HomePage', // 'Page' should be trimmed from name
      path: '',
      force: false,
      tests: true,
      stories: true,
    })

    expect(spy).toHaveBeenCalled()

    spy.mock.calls.forEach((calls) => {
      const testOutput = {
        // Because windows paths are different, we need to normalise before snapshotting
        filePath: ensurePosixPath(calls[0]),
        fileContent: calls[1],
      }
      expect(testOutput).toMatchSnapshot()
    })

    globalThis.mockFs = false
    spy.mockRestore()
  })

  test('file generation with route params', async () => {
    mockFiles = {
      [getPaths().web.routes]: [
        "import { Router, Route } from '@redwoodjs/router'",
        '',
        'const Routes = () => {',
        '  return (',
        '    <Router>',
        '      <Route path="/about" page={AboutPage} name="about" />',
        '      <Route notfound page={NotFoundPage} />',
        '    </Router>',
        '  )',
        '}',
        '',
        'export default Routes',
      ].join('\n'),
    }

    const spy = vi.spyOn(fs, 'writeFileSync')
    globalThis.mockFs = true

    await page.handler({
      name: 'post',
      path: '{id}',
      force: false,
      tests: true,
      stories: true,
    })

    expect(spy).toHaveBeenCalled()

    spy.mock.calls.forEach((calls) => {
      const testOutput = {
        filePath: ensurePosixPath(calls[0]),
        fileContent: calls[1],
      }
      expect(testOutput).toMatchSnapshot()
    })

    globalThis.mockFs = false
    spy.mockRestore()
  })
})

describe('TS Files', async () => {
  const typescriptFiles = await page.files({
    name: 'TSFiles',
    typescript: true,
    tests: true,
    stories: true,
    ...page.paramVariants(pathName(undefined, 'typescript')),
  }) //?

  it('generates typescript pages', () => {
    expect(
      typescriptFiles[
        path.normalize(
          '/path/to/project/web/src/pages/TSFilesPage/TSFilesPage.tsx',
        )
      ],
    ).toMatchSnapshot()

    expect(
      typescriptFiles[
        path.normalize(
          '/path/to/project/web/src/pages/TSFilesPage/TSFilesPage.stories.tsx',
        )
      ],
    ).toMatchSnapshot()

    expect(
      typescriptFiles[
        path.normalize(
          '/path/to/project/web/src/pages/TSFilesPage/TSFilesPage.test.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('TS Params', async () => {
    const typescriptParamFiles = await page.files({
      name: 'TSParamFiles',
      typescript: true,
      tests: true,
      stories: true,
      ...page.paramVariants(pathName('{id}', 'typescript-param')),
    })

    expect(
      typescriptParamFiles[
        path.normalize(
          '/path/to/project/web/src/pages/TSParamFilesPage/TSParamFilesPage.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('TS Params with type', async () => {
    const typescriptParamTypeFiles = await page.files({
      name: 'TSParamTypeFiles',
      typescript: true,
      tests: false,
      stories: false,
      ...page.paramVariants(
        pathName('/bazinga-ts/{id:Int}', 'typescript-param-with-type'),
      ),
    })

    expect(
      typescriptParamTypeFiles[
        path.normalize(
          '/path/to/project/web/src/pages/TSParamTypeFilesPage/TSParamTypeFilesPage.tsx',
        )
      ],
    ).toMatchSnapshot()
  })
})
