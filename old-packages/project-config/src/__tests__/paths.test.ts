import path from 'path'

import { describe, beforeAll, afterAll, it, expect, test } from 'vitest'

import {
  processPagesDir,
  resolveFile,
  ensurePosixPath,
  importStatementPath,
  getBaseDir,
  getBaseDirFromFile,
  getPaths,
} from '../paths'

const RWJS_CWD = process.env.RWJS_CWD

/**
 * All paths relevant to the redwood stack as defined in
 * {@link ../paths | paths.ts}, relative from project root
 */
const DEFAULT_PATHS = {
  base: [],
  generated: {
    base: ['.redwood'],
    schema: ['.redwood', 'schema.graphql'],
    types: {
      includes: ['.redwood', 'types', 'includes'],
      mirror: ['.redwood', 'types', 'mirror'],
    },
    prebuild: ['.redwood', 'prebuild'],
  },
  scripts: ['scripts'],
  api: {
    base: ['api'],
    dataMigrations: ['api', 'db', 'dataMigrations'],
    db: ['api', 'db'],
    dbSchema: ['api', 'db', 'schema.prisma'],
    functions: ['api', 'src', 'functions'],
    graphql: ['api', 'src', 'graphql'],
    lib: ['api', 'src', 'lib'],
    generators: ['api', 'generators'],
    config: ['api', 'src', 'config'],
    services: ['api', 'src', 'services'],
    directives: ['api', 'src', 'directives'],
    subscriptions: ['api', 'src', 'subscriptions'],
    src: ['api', 'src'],
    dist: ['api', 'dist'],
    types: ['api', 'types'],
    models: ['api', 'src', 'models'],
    mail: ['api', 'src', 'mail'],
    jobs: ['api', 'src', 'jobs'],
    distJobs: ['api', 'dist', 'jobs'],
    jobsConfig: ['api', 'src', 'lib', 'jobs'],
    distJobsConfig: ['api', 'dist', 'lib', 'jobs'],
    logger: ['api', 'src', 'lib', 'logger.ts'],
  },
  web: {
    routes: ['web', 'src', 'Routes.tsx'],
    base: ['web'],
    pages: ['web', 'src', 'pages/'],
    components: ['web', 'src', 'components'],
    layouts: ['web', 'src', 'layouts/'],
    src: ['web', 'src'],
    storybook: ['web', '.storybook'],
    generators: ['web', 'generators'],
    app: ['web', 'src', 'App.tsx'],
    document: ['web', 'src', 'Document'],
    html: ['web', 'src', 'index.html'],
    config: ['web', 'config'],
    viteConfig: ['web', 'vite.config.ts'],
    postcss: ['web', 'config', 'postcss.config.js'],
    storybookConfig: ['web', '.storybook', 'main.js'],
    storybookPreviewConfig: ['web', '.storybook', 'preview.js'],
    storybookManagerConfig: ['web', '.storybook', 'manager.js'],
    dist: ['web', 'dist'],
    distBrowser: ['web', 'dist', 'browser'],
    distRsc: ['web', 'dist', 'rsc'],
    distSsr: ['web', 'dist', 'ssr'],
    distSsrDocument: ['web', 'dist', 'ssr', 'Document.mjs'],
    distSsrEntryServer: ['web', 'dist', 'ssr', 'entry.server.mjs'],
    distRouteHooks: ['web', 'dist', 'ssr', 'routeHooks'],
    distRscEntries: ['web', 'dist', 'rsc', 'entries.mjs'],
    routeManifest: ['web', 'dist', 'ssr', 'route-manifest.json'],
    types: ['web', 'types'],
    entryClient: ['web', 'src', 'entry.client.tsx'], // new vite/stream entry point for client
    entryServer: ['web', 'src', 'entry.server'],
    graphql: ['web', 'src', 'graphql'],
  },
}

/**
 * Recursively traverse {@link DEFAULT_PATHS} and apply path.join
 */
const getExpectedPaths = (baseDir: string, pathsTemplate) =>
  Object.fromEntries(
    Object.entries(pathsTemplate).map(([key, val]) => [
      key,
      val === null
        ? null
        : val instanceof Array
          ? path.join(baseDir, ...val)
          : getExpectedPaths(baseDir, val),
    ]),
  )

const forJavascriptProject = (expectedPaths) =>
  Object.fromEntries(
    Object.entries(expectedPaths).map(([key, val]) => [
      key,
      val instanceof Array
        ? val.map((str) => str.replace(/\.tsx|\.ts/, '.js'))
        : forJavascriptProject(val),
    ]),
  )

describe('paths', () => {
  describe('within empty project', () => {
    const FIXTURE_BASEDIR = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '__fixtures__',
      'empty-project',
    )

    beforeAll(() => {
      process.env.RWJS_CWD = FIXTURE_BASEDIR
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    it('finds the correct base directory', () =>
      expect(getBaseDir()).toBe(FIXTURE_BASEDIR))

    it('finds the correct base directory from a file', () => {
      const projectFilePath = path.join(
        ...[FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages, 'AboutPage'],
      )
      expect(getBaseDirFromFile(projectFilePath)).toBe(FIXTURE_BASEDIR)
    })

    it('gets the correct paths', () => {
      const pathTemplate = structuredClone(DEFAULT_PATHS)

      Object.assign(pathTemplate.api, {
        distJobsConfig: null,
        jobsConfig: null,
      })
      Object.assign(pathTemplate.web, {
        document: null, // this fixture doesnt have a document
        storybookPreviewConfig: null,
        // Vite paths ~ not configured in empty-project
        viteConfig: null,
        entryClient: null,
        entryServer: null,
      })

      const expectedPaths = getExpectedPaths(FIXTURE_BASEDIR, pathTemplate)
      const paths = getPaths()
      expect(paths).toStrictEqual(expectedPaths)
    })

    it('switches windows slashes in import statements', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const inputPath = 'C:\\Users\\Bob\\dev\\Redwood\\UserPage\\UserPage'
      const outputPath = importStatementPath(inputPath)

      Object.defineProperty(process, 'platform', { value: originalPlatform })

      expect(outputPath).toEqual('C:/Users/Bob/dev/Redwood/UserPage/UserPage')
    })

    describe('processPagesDir', () => {
      it('it accurately finds and names the pages', () => {
        const pagesDir = path.join(FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages)

        const pages = processPagesDir(pagesDir)

        expect(pages.length).toEqual(2)

        const fatalErrorPage = pages.find(
          (page) => page.importName === 'FatalErrorPage',
        )
        expect(fatalErrorPage).not.toBeUndefined()
        expect(fatalErrorPage?.importPath).toEqual(
          importStatementPath(
            path.join(pagesDir, 'FatalErrorPage/FatalErrorPage'),
          ),
        )

        const notFoundPage = pages.find(
          (page) => page.importName === 'NotFoundPage',
        )
        expect(notFoundPage).not.toBeUndefined()
        expect(notFoundPage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'NotFoundPage/NotFoundPage')),
        )
      })
    })

    test('resolveFile', () => {
      const p =
        resolveFile(path.join(FIXTURE_BASEDIR, 'web', 'src', 'App')) || ''
      expect(path.extname(p)).toEqual('.tsx')

      const q = resolveFile(
        path.join(FIXTURE_BASEDIR, 'web', 'public', 'favicon'),
      )
      expect(q).toBe(null)
    })

    describe('ensurePosixPath', () => {
      it('Returns unmodified input if not on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'NotWindows' })

        const testPath = 'X:\\some\\weird\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual(testPath)
      })

      it('Transforms paths on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = '..\\some\\relative\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('../some/relative/path')
      })

      it('Handles drive letters', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = 'C:\\some\\full\\path\\to\\file.ext'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('/c/some/full/path/to/file.ext')
      })
    })
  })

  describe('within example-todo-main project', () => {
    const FIXTURE_BASEDIR = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '__fixtures__',
      'example-todo-main',
    )

    beforeAll(() => {
      process.env.RWJS_CWD = FIXTURE_BASEDIR
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    it('finds the correct base directory', () =>
      expect(getBaseDir()).toBe(FIXTURE_BASEDIR))

    it('finds the correct base directory from a file', () => {
      const projectFilePath = path.join(
        ...[FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages, 'AboutPage'],
      )
      expect(getBaseDirFromFile(projectFilePath)).toBe(FIXTURE_BASEDIR)
    })

    it('gets the correct paths', () => {
      const pathTemplate = forJavascriptProject(DEFAULT_PATHS)

      Object.assign(pathTemplate.api, {
        jobsConfig: null,
        distJobsConfig: null,
        logger: null,
      })
      Object.assign(pathTemplate.web, {
        document: null, // this fixture doesn't have a document
        entryClient: null, // doesn't exist in example-todo-main
        entryServer: null, // doesn't exist in example-todo-main
        storybookPreviewConfig: null,
        viteConfig: ['web', 'vite.config.ts'], // although this is a JS project, vite config is TS
      })

      const expectedPaths = getExpectedPaths(FIXTURE_BASEDIR, pathTemplate)
      const paths = getPaths()
      expect(paths).toStrictEqual(expectedPaths)
    })

    it('switches windows slashes in import statements', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const inputPath = 'C:\\Users\\Bob\\dev\\Redwood\\UserPage\\UserPage'
      const outputPath = importStatementPath(inputPath)

      Object.defineProperty(process, 'platform', { value: originalPlatform })

      expect(outputPath).toEqual('C:/Users/Bob/dev/Redwood/UserPage/UserPage')
    })

    describe('processPagesDir', () => {
      it('it accurately finds and names the pages', () => {
        const pagesDir = path.join(FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages)

        const pages = processPagesDir(pagesDir)

        expect(pages.length).toEqual(8)

        const adminEditUserPage = pages.find(
          (page) => page.importName === 'adminEditUserPage',
        )
        expect(adminEditUserPage).not.toBeUndefined()
        expect(adminEditUserPage?.importPath).toEqual(
          importStatementPath(
            path.join(pagesDir, 'admin/EditUserPage/EditUserPage'),
          ),
        )

        const barPage = pages.find((page) => page.importName === 'BarPage')
        expect(barPage).not.toBeUndefined()
        expect(barPage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'BarPage/BarPage')),
        )

        const fatalErrorPage = pages.find(
          (page) => page.importName === 'FatalErrorPage',
        )
        expect(fatalErrorPage).not.toBeUndefined()
        expect(fatalErrorPage?.importPath).toEqual(
          importStatementPath(
            path.join(pagesDir, 'FatalErrorPage/FatalErrorPage'),
          ),
        )

        const fooPage = pages.find((page) => page.importName === 'FooPage')
        expect(fooPage).not.toBeUndefined()
        expect(fooPage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'FooPage/FooPage')),
        )

        const homePage = pages.find((page) => page.importName === 'HomePage')
        expect(homePage).not.toBeUndefined()
        expect(homePage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'HomePage/HomePage')),
        )

        const notFoundPage = pages.find(
          (page) => page.importName === 'NotFoundPage',
        )
        expect(notFoundPage).not.toBeUndefined()
        expect(notFoundPage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'NotFoundPage/NotFoundPage')),
        )

        const typeScriptPage = pages.find(
          (page) => page.importName === 'TypeScriptPage',
        )
        expect(typeScriptPage).not.toBeUndefined()
        expect(typeScriptPage?.importPath).toEqual(
          importStatementPath(
            path.join(pagesDir, 'TypeScriptPage/TypeScriptPage'),
          ),
        )

        const privatePage = pages.find(
          (page) => page.importName === 'PrivatePage',
        )
        expect(privatePage).not.toBeUndefined()
        expect(privatePage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'PrivatePage/PrivatePage')),
        )
      })
    })

    test('resolveFile', () => {
      const p =
        resolveFile(path.join(FIXTURE_BASEDIR, 'web', 'src', 'App')) || ''
      expect(path.extname(p)).toEqual('.js')

      const q = resolveFile(
        path.join(FIXTURE_BASEDIR, 'web', 'public', 'favicon'),
      )
      expect(q).toBe(null)
    })

    describe('ensurePosixPath', () => {
      it('Returns unmodified input if not on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'NotWindows' })

        const testPath = 'X:\\some\\weird\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual(testPath)
      })

      it('Transforms paths on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = '..\\some\\relative\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('../some/relative/path')
      })

      it('Handles drive letters', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = 'C:\\some\\full\\path\\to\\file.ext'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('/c/some/full/path/to/file.ext')
      })
    })
  })

  describe('within example-todo-main-with-errors project', () => {
    const FIXTURE_BASEDIR = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '__fixtures__',
      'example-todo-main-with-errors',
    )

    beforeAll(() => {
      process.env.RWJS_CWD = FIXTURE_BASEDIR
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    it('finds the correct base directory', () =>
      expect(getBaseDir()).toBe(FIXTURE_BASEDIR))

    it('finds the correct base directory from a file', () => {
      const projectFilePath = path.join(
        ...[FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages, 'AboutPage'],
      )
      expect(getBaseDirFromFile(projectFilePath)).toBe(FIXTURE_BASEDIR)
    })

    it('gets the correct paths', () => {
      const pathTemplate = forJavascriptProject(DEFAULT_PATHS)

      Object.assign(pathTemplate.api, {
        jobsConfig: null,
        distJobsConfig: null,
        logger: null,
      })
      Object.assign(pathTemplate.web, {
        app: null,
        document: null, // this fixture doesnt have a document
        entryClient: null,
        entryServer: null,
        viteConfig: null, // no vite config in example-todo-main-with-errors
        storybookPreviewConfig: null,
      })

      const expectedPaths = getExpectedPaths(FIXTURE_BASEDIR, pathTemplate)
      const paths = getPaths()
      expect(paths).toStrictEqual(expectedPaths)
    })

    it('switches windows slashes in import statements', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const inputPath = 'C:\\Users\\Bob\\dev\\Redwood\\UserPage\\UserPage'
      const outputPath = importStatementPath(inputPath)

      Object.defineProperty(process, 'platform', { value: originalPlatform })

      expect(outputPath).toEqual('C:/Users/Bob/dev/Redwood/UserPage/UserPage')
    })

    describe('processPagesDir', () => {
      it('it accurately finds and names the pages', () => {
        const pagesDir = path.join(FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages)

        const pages = processPagesDir(pagesDir)

        expect(pages.length).toEqual(3)

        const fatalErrorPage = pages.find(
          (page) => page.importName === 'FatalErrorPage',
        )
        expect(fatalErrorPage).not.toBeUndefined()
        expect(fatalErrorPage?.importPath).toEqual(
          importStatementPath(
            path.join(pagesDir, 'FatalErrorPage/FatalErrorPage'),
          ),
        )

        const homePage = pages.find((page) => page.importName === 'HomePage')
        expect(homePage).not.toBeUndefined()
        expect(homePage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'HomePage/HomePage')),
        )

        const notFoundPage = pages.find(
          (page) => page.importName === 'NotFoundPage',
        )
        expect(notFoundPage).not.toBeUndefined()
        expect(notFoundPage?.importPath).toEqual(
          importStatementPath(path.join(pagesDir, 'NotFoundPage/NotFoundPage')),
        )
      })
    })

    test('resolveFile', () => {
      const p =
        resolveFile(path.join(FIXTURE_BASEDIR, 'web', 'src', 'index')) || ''
      expect(path.extname(p)).toEqual('.js')

      const q = resolveFile(
        path.join(FIXTURE_BASEDIR, 'web', 'public', 'favicon'),
      )
      expect(q).toBe(null)
    })

    describe('ensurePosixPath', () => {
      it('Returns unmodified input if not on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'NotWindows' })

        const testPath = 'X:\\some\\weird\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual(testPath)
      })

      it('Transforms paths on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = '..\\some\\relative\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('../some/relative/path')
      })

      it('Handles drive letters', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = 'C:\\some\\full\\path\\to\\file.ext'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('/c/some/full/path/to/file.ext')
      })
    })
  })

  describe('within test project', () => {
    const FIXTURE_BASEDIR = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '__fixtures__',
      'test-project',
    )

    beforeAll(() => {
      process.env.RWJS_CWD = FIXTURE_BASEDIR
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    it('finds the correct base directory', () => {
      expect(getBaseDir()).toBe(FIXTURE_BASEDIR)
    })

    it('finds the correct base directory from a file', () => {
      const projectFilePath = path.join(
        ...[FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages, 'AboutPage'],
      )
      expect(getBaseDirFromFile(projectFilePath)).toBe(FIXTURE_BASEDIR)
    })

    it('gets the correct paths', () => {
      const pathTemplate = structuredClone(DEFAULT_PATHS)

      Object.assign(pathTemplate.api, {
        jobsConfig: null,
        distJobsConfig: null,
      })
      Object.assign(pathTemplate.web, {
        document: null, // this fixture doesn't have a document
        storybookPreviewConfig: null,
        entryServer: null,
      })

      const expectedPaths = getExpectedPaths(FIXTURE_BASEDIR, pathTemplate)
      const paths = getPaths()
      expect(paths).toStrictEqual(expectedPaths)
    })

    it('switches windows slashes in import statements', () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32' })

      const inputPath = 'C:\\Users\\Bob\\dev\\Redwood\\UserPage\\UserPage'
      const outputPath = importStatementPath(inputPath)

      Object.defineProperty(process, 'platform', { value: originalPlatform })

      expect(outputPath).toEqual('C:/Users/Bob/dev/Redwood/UserPage/UserPage')
    })

    describe('processPagesDir', () => {
      it('it accurately finds and names the pages', () => {
        const pagesDir = path.join(FIXTURE_BASEDIR, ...DEFAULT_PATHS.web.pages)

        const pages = processPagesDir(pagesDir)

        expect(pages.length).toEqual(21)

        const pageNames = [
          'AboutPage',
          'BlogPostPage',
          'ContactUsPage',
          'FatalErrorPage',
          'ForgotPasswordPage',
          'HomePage',
          'LoginPage',
          'NotFoundPage',
          'ProfilePage',
          'ResetPasswordPage',
          'SignupPage',
          'WaterfallPage',
        ]

        pageNames.forEach((pageName) => {
          const thisPage = pages.find((page) => page.importName === pageName)
          expect(thisPage).not.toBeUndefined()
          expect(thisPage?.importPath).toEqual(
            importStatementPath(path.join(pagesDir, `${pageName}/${pageName}`)),
          )
        })

        const scaffoldPageNames = ['Contact', 'Post']

        scaffoldPageNames.forEach((pageName) => {
          let page = pages.find(
            (page) => page.importName === `${pageName}Edit${pageName}Page`,
          )
          expect(page).not.toBeUndefined()
          expect(page?.importPath).toEqual(
            importStatementPath(
              path.join(
                pagesDir,
                `${pageName}/Edit${pageName}Page/Edit${pageName}Page`,
              ),
            ),
          )

          page = pages.find(
            (page) => page.importName === `${pageName}New${pageName}Page`,
          )
          expect(page).not.toBeUndefined()
          expect(page?.importPath).toEqual(
            importStatementPath(
              path.join(
                pagesDir,
                `${pageName}/New${pageName}Page/New${pageName}Page`,
              ),
            ),
          )

          page = pages.find(
            (page) => page.importName === `${pageName}${pageName}Page`,
          )
          expect(page).not.toBeUndefined()
          expect(page?.importPath).toEqual(
            importStatementPath(
              path.join(
                pagesDir,
                `${pageName}/${pageName}Page/${pageName}Page`,
              ),
            ),
          )

          page = pages.find(
            (page) => page.importName === `${pageName}${pageName}sPage`,
          )
          expect(page).not.toBeUndefined()
          expect(page?.importPath).toEqual(
            importStatementPath(
              path.join(
                pagesDir,
                `${pageName}/${pageName}sPage/${pageName}sPage`,
              ),
            ),
          )
        })
      })
    })

    test('resolveFile', () => {
      const p =
        resolveFile(path.join(FIXTURE_BASEDIR, 'web', 'src', 'Routes')) || ''
      expect(path.extname(p)).toEqual('.tsx')

      const q = resolveFile(
        path.join(FIXTURE_BASEDIR, 'web', 'public', 'favicon'),
      )
      expect(q).toBe(null)
    })

    describe('ensurePosixPath', () => {
      it('Returns unmodified input if not on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'NotWindows' })

        const testPath = 'X:\\some\\weird\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual(testPath)
      })

      it('Transforms paths on Windows', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = '..\\some\\relative\\path'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('../some/relative/path')
      })

      it('Handles drive letters', () => {
        const originalPlatform = process.platform
        Object.defineProperty(process, 'platform', { value: 'win32' })

        const testPath = 'C:\\some\\full\\path\\to\\file.ext'
        const posixPath = ensurePosixPath(testPath)

        Object.defineProperty(process, 'platform', { value: originalPlatform })

        expect(posixPath).toEqual('/c/some/full/path/to/file.ext')
      })
    })
  })
})
