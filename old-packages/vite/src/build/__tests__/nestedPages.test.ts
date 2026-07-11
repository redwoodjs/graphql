import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

import {
  test,
  describe,
  beforeEach,
  afterAll,
  beforeAll,
  it,
  expect,
  vi,
} from 'vitest'

import { getPaths } from '@redwoodjs/project-config'

import { transform, prebuildWebFile } from '../build.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURE_PATH = path.join(__dirname, 'fixtures/nestedPages')

test('transform', async () => {
  vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
    return '<Router><Route path="/" page={HomePage} name="home" /></Router>'
  })
  vi.spyOn(fs, 'existsSync').mockImplementationOnce(() => true)

  const transformed = await transform('Router.jsx')
  expect(transformed).toEqual(
    '/* @__PURE__ */ React.createElement(Router, null, /* @__PURE__ */ React.createElement(Route, { path: "/", page: HomePage, name: "home" }));\n',
  )
})

describe('Nested pages transforms', () => {
  let outputWithStaticImports: string | null | undefined
  let outputNoStaticImports: string | null | undefined

  beforeEach(() => {
    process.env.RWJS_CWD = FIXTURE_PATH
  })

  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  beforeAll(async () => {
    process.env.RWJS_CWD = FIXTURE_PATH

    const routesFile = getPaths().web.routes
    const prerenderResult = await prebuildWebFile(routesFile, {
      forPrerender: true,
      forJest: true,
    })
    outputWithStaticImports = prerenderResult?.code

    const buildResult = await prebuildWebFile(routesFile, {
      // If we don't set forJest,  this is simulating a vite build
      // @MARK: How did we manage to compile JSX without presets before?
      forJest: true,
    })
    outputNoStaticImports = buildResult?.code
  })

  it('Imports layouts correctly', () => {
    // Note avoid checking the full require path because windows paths have unusual slashes
    expect(outputWithStaticImports).toContain(
      'var _AdminLayout = _interopRequireDefault(require(',
    )
    expect(outputWithStaticImports).toContain(
      'var _MainLayout = _interopRequireDefault(require(',
    )

    expect(outputNoStaticImports).toContain(
      'var _AdminLayout = _interopRequireDefault(require(',
    )
    expect(outputNoStaticImports).toContain(
      'var _MainLayout = _interopRequireDefault(require(',
    )
  })

  it('Handles when imports from a page include non-default imports too', () => {
    // Because we import import EditJobPage, 👉 { NonDefaultExport } from 'src/pages/Jobs/EditJobPage'

    expect(outputWithStaticImports).toContain('var _EditJobPage = require(')
    expect(outputWithStaticImports).toContain(
      'console.log(_EditJobPage.NonDefaultExport)',
    )

    expect(outputWithStaticImports).toContain(`const EditJobPage = {
  name: "EditJobPage",
  prerenderLoader: name => require("./pages/Jobs/EditJobPage/EditJobPage"),
  LazyComponent: (0, _react.lazy)(() => import("./pages/Jobs/EditJobPage/EditJobPage"))
};`)

    // Check that NonDefaultExport is still imported
    expect(outputNoStaticImports).toContain(
      'var _EditJobPage = _interopRequireWildcard',
    )
    expect(outputNoStaticImports).toContain(
      'console.log(_EditJobPage.NonDefaultExport)',
    )

    expect(outputNoStaticImports)
      .toContain(`(0, _jsxRuntime.jsx)(_router.Route, {
        path: "/jobs/{id:Int}/edit",
        page: _EditJobPage["default"],
        name: "editJob"`)

    // Should not generate a loader, because page was explicitly imported
    // @TODO check this again
    expect(outputNoStaticImports).not.toMatch(
      /import\(.*"\.\/pages\/Jobs\/EditJobPage\/EditJobPage"\)/,
    )
  })

  // LoginPage and HomePage not imported in Routes.js
  describe('pages without explicit import', () => {
    it('Adds loaders for non-nested pages', () => {
      expect(outputWithStaticImports).toContain(
        `const LoginPage = {
  name: "LoginPage",
  prerenderLoader: name => require("./pages/LoginPage/LoginPage"),
  LazyComponent: (0, _react.lazy)(() => import("./pages/LoginPage/LoginPage"))
}`,
      )

      expect(outputWithStaticImports).toContain(
        `const HomePage = {
  name: "HomePage",
  prerenderLoader: name => require("./pages/HomePage/HomePage"),
  LazyComponent: (0, _react.lazy)(() => import("./pages/HomePage/HomePage"))
}`,
      )
    })

    it('dynamic build imports: Adds loaders for non-nested pages that reads from globalThis in prerenderLoader', () => {
      expect(outputNoStaticImports).toContain(
        `const LoginPage = {
  name: "LoginPage",
  prerenderLoader: name => ({
    default: globalThis.__REDWOOD__PRERENDER_PAGES[name]
  }),
  LazyComponent: (0, _react.lazy)(() => import("./pages/LoginPage/LoginPage"))
}`,
      )

      expect(outputNoStaticImports).toContain(
        `const HomePage = {
  name: "HomePage",
  prerenderLoader: name => ({
    default: globalThis.__REDWOOD__PRERENDER_PAGES[name]
  }),
  LazyComponent: (0, _react.lazy)(() => import("./pages/HomePage/HomePage"))
}`,
      )
    })
  })

  describe('pages with explicit import', () => {
    describe('static prerender imports', () => {
      it('Uses the user specified name for nested page', () => {
        // Import statement: import NewJobPage from 'src/pages/Jobs/NewJobPage'
        expect(outputWithStaticImports).toContain(
          `const NewJobPage = {
  name: "NewJobPage",
  prerenderLoader: name => require("./pages/Jobs/NewJobPage/NewJobPage"),
  LazyComponent: (0, _react.lazy)(() => import("./pages/Jobs/NewJobPage/NewJobPage"))
}`,
        )
      })

      it('Uses the user specified custom default export import name for nested page', () => {
        // Import statement: import BazingaJobProfilePageWithFunnyName from 'src/pages/Jobs/JobProfilePage'
        expect(outputWithStaticImports).toContain(
          `const BazingaJobProfilePageWithFunnyName = {
  name: "BazingaJobProfilePageWithFunnyName",
  prerenderLoader: name => require("./pages/Jobs/JobProfilePage/JobProfilePage"),
  LazyComponent: (0, _react.lazy)(() => import("./pages/Jobs/JobProfilePage/JobProfilePage"))
}`,
        )
      })

      it('Removes explicit imports when prerendering', () => {
        expect(outputWithStaticImports).not.toContain(
          `var _NewJobPage = _interopRequireDefault`,
        )

        expect(outputWithStaticImports).not.toContain(
          `var _JobProfilePage = _interopRequireDefault`,
        )
      })

      it('Keeps using the user specified name when generating React component', () => {
        // Generate react component still uses the user specified name
        expect(outputWithStaticImports)
          .toContain(`(0, _jsxRuntime.jsx)(_router.Route, {
        path: "/job-profiles/{id:Int}",
        page: BazingaJobProfilePageWithFunnyName,
        name: "jobProfile"
      })`)
      })
    })

    describe('dynamic build imports', () => {
      it('Directly uses the import when page is explicitly imported', () => {
        // Explicit import uses the specified import
        // Has statement: import BazingaJobProfilePageWithFunnyName from 'src/pages/Jobs/JobProfilePage'

        // @MARK: am not sure this is correct
        // Double check please!

        expect(outputNoStaticImports)
          .toContain(`(0, _jsxRuntime.jsx)(_router.Route, {
        path: "/job-profiles/{id:Int}",
        page: _JobProfilePage["default"],
        name: "jobProfile"
      })`)
      })

      it("Uses the LazyComponent for a page that isn't imported", () => {
        expect(outputNoStaticImports).toContain(`const HomePage = {
  name: "HomePage",
  prerenderLoader: name => ({
    default: globalThis.__REDWOOD__PRERENDER_PAGES[name]
  }),
  LazyComponent: (0, _react.lazy)(() => import("./pages/HomePage/HomePage"))
}`)
        expect(outputNoStaticImports)
          .toContain(`(0, _jsxRuntime.jsx)(_router.Route, {
        path: "/",
        page: HomePage,
        name: "home"
      })`)
      })

      it('Should NOT add a LazyComponent for pages that have been explicitly loaded', () => {
        expect(outputNoStaticImports).not.toContain(`const JobsJobPage = {
  name: "JobsJobPage"`)

        expect(outputNoStaticImports).not.toContain(`const JobsNewJobPage = {
  name: "JobsNewJobPage"`)

        expect(outputNoStaticImports)
          .toContain(`(0, _jsxRuntime.jsx)(_router.Route, {
        path: "/jobs",
        page: _JobsPage["default"],
        name: "jobs"
      })`)
      })
    })
  })
})
