vi.mock('../../lib', () => ({
  transformTSToJS: (_path: string, data: string) => data,
}))

// mock Telemetry for CLI commands so they don't try to spawn a process
vi.mock('@redwoodjs/telemetry', () => {
  return {
    errorTelemetry: () => vi.fn(),
    timedTelemetry: () => vi.fn(),
  }
})

vi.mock('../../lib/paths', () => {
  return {
    getPaths: vi.fn(),
  }
})

vi.mock('../../lib/project', async () => {
  const { getPaths } = await import('../../lib/paths.js')
  return {
    isTypeScriptProject: vi.fn(),
    getGraphqlPath: () => {
      return getPaths().api.graphql
    },
  }
})

// This will load packages/cli-helpers/__mocks__/fs.js
vi.mock('fs')
vi.mock('node:fs', async () => {
  const memfs = await import('memfs')
  return {
    ...memfs.fs,
    default: memfs.fs,
  }
})

const mockedPathGenerator = (app: string, routes: string) => {
  const basedir = '/mock/setup/path'
  return {
    api: {
      functions: '',
      src: '',
      lib: '',
      graphql: path.join(basedir, 'api/src/functions/graphql.ts'),
    },
    web: {
      src: path.join(basedir, 'web/src'),
      app: path.join(basedir, `web/src/${app}`),
      routes: path.join(basedir, `web/src/${routes}`),
    },
    base: path.join(basedir),
  }
}

import fs from 'fs'
import path from 'path'

import { vol } from 'memfs'
import { vi, afterAll, beforeEach, describe, it, expect, test } from 'vitest'

import { getPaths } from '../../lib/paths.js'
import { isTypeScriptProject } from '../../lib/project.js'
import type { AuthGeneratorCtx } from '../authTasks.js'
import {
  addApiConfig,
  addConfigToWebApp,
  addConfigToRoutes,
  createWebAuth,
  hasAuthProvider,
  removeAuthProvider,
} from '../authTasks.js'

import {
  auth0WebAuthTsTemplate,
  clerkWebAuthTsTemplate,
  customApolloAppTsx,
  customPropsRoutesTsx,
  explicitReturnAppTsx,
  graphqlTs,
  legacyAuthWebAppTsx,
  nonStandardAuthDecoderGraphqlTs,
  routesTsx,
  useAuthRoutesTsx,
  webAppTsx,
  withAuthDecoderGraphqlTs,
  withoutRedwoodApolloAppTsx,
} from './mockFsFiles.js'

function platformPath(filePath: string) {
  return filePath.split('/').join(path.sep)
}

const original_RWJS_CWD = process.env.RWJS_CWD

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
})

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(isTypeScriptProject).mockReturnValue(true)
  vi.mocked(getPaths).mockReturnValue(
    // @ts-expect-error - We are not returning a full set of mock paths here
    mockedPathGenerator('App.tsx', 'Routes.tsx'),
  )

  process.env.RWJS_CWD = getPaths().base

  vol.fromJSON({
    [path.join(getPaths().base, 'redwood.toml')]: '# redwood.toml',
    [path.join(
      getPaths().base,
      platformPath('/templates/web/auth.ts.template'),
    )]: '// web auth template',
    [getPaths().web.app]: webAppTsx,
    [getPaths().api.graphql]: graphqlTs,
    [getPaths().web.routes]: routesTsx,
  })
})

describe('authTasks', () => {
  it('Should update App.{jsx,tsx}, Routes.{jsx,tsx} and add auth.ts (Auth0)', () => {
    const templatePath = path.join(
      getPaths().base,
      platformPath('/templates/web/auth.ts.template'),
    )

    vol.fromJSON({
      ...vol.toJSON(),
      [templatePath]: auth0WebAuthTsTemplate,
    })

    const ctx: AuthGeneratorCtx = {
      provider: 'auth0',
      setupMode: 'FORCE',
      force: false,
    }

    addConfigToWebApp().task(ctx, {} as any)
    createWebAuth(getPaths().base, false).task(ctx)
    addConfigToRoutes().task()

    const authTsPath = path.join(getPaths().web.src, 'auth.ts')

    expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
    expect(fs.readFileSync(authTsPath, 'utf-8')).toMatchSnapshot()
    expect(fs.readFileSync(getPaths().web.routes, 'utf-8')).toMatchSnapshot()
  })

  it('Should update App.{jsx,tsx}, Routes.{jsx,tsx} and add auth.ts (Clerk)', () => {
    const templatePath = path.join(
      getPaths().base,
      platformPath('/templates/web/auth.tsx.template'),
    )

    // NOTE: We reset here because we had to remove the `auth.ts.template`
    // file that would be here as a result of the `beforeEach` above.
    // The previous implementation of this test was mocking the `fs` module to
    // return only `auth.tsx.template` and not the `auth.ts.template` file even
    // though it was on the mock filesystem.
    vol.reset()
    vol.fromJSON({
      [path.join(getPaths().base, 'redwood.toml')]: '# redwood.toml',
      [getPaths().web.app]: webAppTsx,
      [getPaths().api.graphql]: graphqlTs,
      [getPaths().web.routes]: routesTsx,
      [templatePath]: clerkWebAuthTsTemplate,
    })

    const ctx: AuthGeneratorCtx = {
      provider: 'clerk',
      setupMode: 'FORCE',
      force: false,
    }

    addConfigToWebApp().task(ctx, {} as any)
    createWebAuth(getPaths().base, false).task(ctx)
    addConfigToRoutes().task()

    const authTsPath = path.join(getPaths().web.src, 'auth.tsx')

    expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
    expect(fs.readFileSync(authTsPath, 'utf-8')).toMatchSnapshot()
    expect(fs.readFileSync(getPaths().web.routes, 'utf-8')).toMatchSnapshot()
  })

  it('Should update App.tsx for legacy apps', () => {
    vol.fromJSON({
      ...vol.toJSON(),
      [getPaths().web.app]: legacyAuthWebAppTsx,
    })

    const ctx: AuthGeneratorCtx = {
      provider: 'clerk',
      setupMode: 'FORCE',
      force: false,
    }

    addConfigToWebApp().task(ctx, {} as any)

    expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
  })

  describe('Components with props', () => {
    it('Should add useAuth on the same line for single line components, and separate line for multiline components', () => {
      vol.fromJSON({
        ...vol.toJSON(),
        [getPaths().web.app]: customApolloAppTsx,
        [getPaths().web.routes]: customPropsRoutesTsx,
      })

      const ctx: AuthGeneratorCtx = {
        provider: 'clerk',
        setupMode: 'FORCE',
        force: false,
      }

      addConfigToWebApp().task(ctx, {} as any)
      addConfigToRoutes().task()

      expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
      expect(fs.readFileSync(getPaths().web.routes, 'utf-8')).toMatchSnapshot()
    })

    it('Should not add useAuth if one already exists', () => {
      vol.fromJSON({
        ...vol.toJSON(),
        [getPaths().web.app]: customApolloAppTsx,
        [getPaths().web.routes]: useAuthRoutesTsx,
      })

      const ctx: AuthGeneratorCtx = {
        provider: 'clerk',
        setupMode: 'FORCE',
        force: false,
      }

      addConfigToWebApp().task(ctx, {} as any)
      addConfigToRoutes().task()

      expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
      expect(fs.readFileSync(getPaths().web.routes, 'utf-8')).toMatchSnapshot()
    })
  })

  describe('Customized App.js', () => {
    it('Should add auth config when using explicit return', () => {
      vol.fromJSON({
        ...vol.toJSON(),
        [getPaths().web.app]: explicitReturnAppTsx,
      })

      const ctx: AuthGeneratorCtx = {
        provider: 'clerk',
        setupMode: 'FORCE',
        force: false,
      }

      addConfigToWebApp().task(ctx, {} as any)

      expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
    })
  })

  describe('Swapped out GraphQL client', () => {
    it('Should add auth config when app is missing RedwoodApolloProvider', () => {
      vol.fromJSON({
        ...vol.toJSON(),
        [getPaths().web.app]: withoutRedwoodApolloAppTsx,
      })

      const ctx: AuthGeneratorCtx = {
        provider: 'clerk',
        setupMode: 'FORCE',
        force: false,
      }

      const task = { output: '' } as any
      addConfigToWebApp().task(ctx, task)

      expect(task.output).toMatch(/GraphQL.*useAuth/)
      expect(fs.readFileSync(getPaths().web.app, 'utf-8')).toMatchSnapshot()
    })
  })

  describe('addApiConfig', () => {
    it('Adds authDecoder arg to default graphql.ts file', () => {
      addApiConfig({
        replaceExistingImport: true,
        authDecoderImport: "import { authDecoder } from 'test-auth-api'",
      })

      expect(fs.readFileSync(getPaths().api.graphql, 'utf-8')).toMatchSnapshot()
    })

    it("Doesn't add authDecoder arg if one already exists", () => {
      vol.fromJSON({
        ...vol.toJSON(),
        [getPaths().api.graphql]: withAuthDecoderGraphqlTs,
      })

      addApiConfig({
        replaceExistingImport: true,
        authDecoderImport: "import { authDecoder } from 'test-auth-api'",
      })

      expect(fs.readFileSync(getPaths().api.graphql, 'utf-8')).toMatchSnapshot()
    })

    it("Doesn't add authDecoder arg if one already exists, even with a non-standard import name and arg placement", () => {
      vol.fromJSON({
        ...vol.toJSON(),
        [getPaths().api.graphql]: nonStandardAuthDecoderGraphqlTs,
      })

      addApiConfig({
        replaceExistingImport: true,
        authDecoderImport: "import { authDecoder } from 'test-auth-api'",
      })

      expect(fs.readFileSync(getPaths().api.graphql, 'utf-8')).toMatchSnapshot()
    })
  })

  describe('hasAuthProvider', () => {
    test('Single line', () => {
      expect(hasAuthProvider('<AuthProvider')).toBeTruthy()
      expect(hasAuthProvider('<AuthProvider>')).toBeTruthy()
      expect(
        hasAuthProvider(
          '<AuthProvider client={netlifyIdentity} type="netlify">',
        ),
      ).toBeTruthy()
      expect(hasAuthProvider('<AuthProviderFoo')).toBeFalsy()
      expect(hasAuthProvider('</AuthProvider>')).toBeFalsy()
      expect(hasAuthProvider('<FooAuthProvider')).toBeFalsy()
      expect(hasAuthProvider('<FooAuthProvider>')).toBeFalsy()
    })

    test('Legacy auth single line', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider client={netlifyIdentity} type="netlify">
                <RedwoodApolloProvider>
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(hasAuthProvider(content)).toBeTruthy()
    })

    test('Legacy auth multi-line', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider
                client={WebAuthnClient}
                type="dbAuth"
                config={{ fetchConfig: { credentials: 'include' } }}
              >
                <RedwoodApolloProvider
                  graphQLClientConfig={{
                    httpLinkConfig: { credentials: 'include' },
                  }}
                >
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(hasAuthProvider(content)).toBeTruthy()
    })

    test('AuthProvider exists', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider>
                <RedwoodApolloProvider useAuth={useAuth}>
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(hasAuthProvider(content)).toBeTruthy()
    })

    test("AuthProvider doesn't exist", () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(hasAuthProvider(content)).toBeFalsy()
    })
  })

  describe('removeAuthProvider', () => {
    test('Legacy auth single line', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider client={netlifyIdentity} type="netlify">
                <RedwoodApolloProvider>
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(removeAuthProvider(content)).toMatch(`
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `)
    })

    test('Legacy auth single line CRLF', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider client={netlifyIdentity} type="netlify">
                <RedwoodApolloProvider>
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `.replace(/\n/g, '\r\n')

      expect(removeAuthProvider(content)).toMatch(
        `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `.replace(/\n/g, '\r\n'),
      )
    })

    test('Legacy auth multi-line', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider
                client={WebAuthnClient}
                type="dbAuth"
                config={{ fetchConfig: { credentials: 'include' } }}
              >
                <RedwoodApolloProvider
                  graphQLClientConfig={{
                    httpLinkConfig: { credentials: 'include' },
                  }}
                >
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(removeAuthProvider(content)).toMatch(`
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider
                graphQLClientConfig={{
                  httpLinkConfig: { credentials: 'include' },
                }}
              >
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `)
    })

    test('Legacy auth multi-line CRLF', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider
                client={WebAuthnClient}
                type="dbAuth"
                config={{ fetchConfig: { credentials: 'include' } }}
              >
                <RedwoodApolloProvider
                  graphQLClientConfig={{
                    httpLinkConfig: { credentials: 'include' },
                  }}
                >
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `.replace(/\n/g, '\r\n')

      expect(removeAuthProvider(content)).toMatch(
        `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider
                graphQLClientConfig={{
                  httpLinkConfig: { credentials: 'include' },
                }}
              >
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `.replace(/\n/g, '\r\n'),
      )
    })

    test('AuthProvider exists', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider>
                <RedwoodApolloProvider useAuth={useAuth}>
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(removeAuthProvider(content)).toMatch(`
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider useAuth={useAuth}>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `)
    })

    test('AuthProvider exists CRLF', () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <AuthProvider>
                <RedwoodApolloProvider useAuth={useAuth}>
                  <Routes />
                </RedwoodApolloProvider>
              </AuthProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `.replace(/\n/g, '\r\n')

      expect(removeAuthProvider(content)).toMatch(
        `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider useAuth={useAuth}>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `.replace(/\n/g, '\r\n'),
      )
    })

    test("AuthProvider doesn't exist", () => {
      const content = `
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `

      expect(removeAuthProvider(content)).toMatch(`
        const App = () => (
          <FatalErrorBoundary page={FatalErrorPage}>
            <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
              <RedwoodApolloProvider>
                <Routes />
              </RedwoodApolloProvider>
            </RedwoodProvider>
          </FatalErrorBoundary>
        )
      `)
    })
  })

  it('writes an auth.ts file for TS projects', () => {
    const ctx: AuthGeneratorCtx = {
      provider: 'auth0',
      setupMode: 'FORCE',
      force: false,
    }

    // NOTE: The current fs related mocking leaves this file around from previous tests so we
    // must delete it here. This should be fixed in a future refactoring of the entire test suite
    fs.rmSync(path.join(getPaths().base, 'templates/web/auth.tsx.template'))

    createWebAuth(getPaths().base, false).task(ctx)

    expect(
      fs.readFileSync(path.join(getPaths().web.src, 'auth.ts'), 'utf-8'),
    ).toMatchSnapshot()
  })

  it('writes an auth.js file for JS projects', async () => {
    vi.mocked(isTypeScriptProject).mockReturnValue(false)

    vol.fromJSON({
      ...vol.toJSON(),
      [getPaths().web.app]: webAppTsx,
    })

    const ctx: AuthGeneratorCtx = {
      provider: 'auth0',
      setupMode: 'FORCE',
      force: false,
    }
    await createWebAuth(getPaths().base, false).task(ctx)

    expect(
      fs.readFileSync(path.join(getPaths().web.src, 'auth.js'), 'utf-8'),
    ).toMatchSnapshot()
  })
})
