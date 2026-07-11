import path from 'path'

import { beforeEach, test, expect, afterAll } from 'vitest'

import { findWebFiles } from '@redwoodjs/internal/dist/files.js'
import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

import { prebuildWebFiles, prebuildWebFile, cleanWebBuild } from '../build.js'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../__fixtures__/example-todo-main',
)

const cleanPaths = (p) => {
  return ensurePosixPath(path.relative(FIXTURE_PATH, p))
}

beforeEach(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
  cleanWebBuild()
})
afterAll(() => {
  delete process.env.RWJS_CWD
})

test('web files are prebuilt (no prerender)', async () => {
  const webFiles = findWebFiles()
  const prebuiltFiles = await prebuildWebFiles(webFiles, {
    forJest: true,
  })

  const relativePaths = prebuiltFiles
    .filter((x) => typeof x !== 'undefined')
    .map(cleanPaths)
    .sort()

  // Builds non-nested functions
  expect(relativePaths).toMatchInlineSnapshot(`
    [
      ".redwood/prebuild/web/src/App.js",
      ".redwood/prebuild/web/src/Routes.js",
      ".redwood/prebuild/web/src/components/AddTodo/AddTodo.js",
      ".redwood/prebuild/web/src/components/AddTodoControl/AddTodoControl.js",
      ".redwood/prebuild/web/src/components/Check/Check.js",
      ".redwood/prebuild/web/src/components/NumTodosCell/NumTodosCell.js",
      ".redwood/prebuild/web/src/components/NumTodosTwoCell/NumTodosTwoCell.js",
      ".redwood/prebuild/web/src/components/TableCell/TableCell.js",
      ".redwood/prebuild/web/src/components/TodoItem/TodoItem.js",
      ".redwood/prebuild/web/src/components/TodoListCell/TodoListCell.tsx",
      ".redwood/prebuild/web/src/graphql/fragment-masking.js",
      ".redwood/prebuild/web/src/graphql/gql.js",
      ".redwood/prebuild/web/src/graphql/graphql.js",
      ".redwood/prebuild/web/src/graphql/index.js",
      ".redwood/prebuild/web/src/layouts/SetLayout/SetLayout.js",
      ".redwood/prebuild/web/src/pages/BarPage/BarPage.tsx",
      ".redwood/prebuild/web/src/pages/FatalErrorPage/FatalErrorPage.js",
      ".redwood/prebuild/web/src/pages/FooPage/FooPage.tsx",
      ".redwood/prebuild/web/src/pages/HomePage/HomePage.tsx",
      ".redwood/prebuild/web/src/pages/NotFoundPage/NotFoundPage.js",
      ".redwood/prebuild/web/src/pages/PrivatePage/PrivatePage.tsx",
      ".redwood/prebuild/web/src/pages/TypeScriptPage/TypeScriptPage.tsx",
      ".redwood/prebuild/web/src/pages/admin/EditUserPage/EditUserPage.jsx",
    ]
  `)
})

test('Check routes are imported with require when staticImports flag is enabled', async () => {
  const routesFile = getPaths().web.routes

  const built = await prebuildWebFile(routesFile, {
    forPrerender: true,
    forJest: true,
  })
  const prerendered = built?.code

  /* Check that imports have the form
   `const HomePage = {
     name: "HomePage",
     loader: () => require("` 👈 Uses a require statement
     */
  expect(prerendered).toContain(`const HomePage = {`)
  expect(prerendered).toContain(`const BarPage = {`)

  /*
    👇 Foo page is an explicitly imported page in the source
    const FooPage = {
      name: "FooPage",
      loader: () => require(
    */
  expect(prerendered).toContain(`const FooPage = {`)
  expect(prerendered).not.toContain(
    `var _FooPage = _interopRequireDefault(require(`,
  )
})

test('Check routes are imported with "import" when staticImports flag is NOT passed', async () => {
  const routesFile = getPaths().web.routes

  const built = await prebuildWebFile(routesFile, {
    forJest: true,
  })
  const withoutStaticImports = built?.code

  /* Check that imports have the form
   `const HomePage = {
     name: "HomePage",
     loader: () => import("` 👈 Uses an (async) import statement
     */

  expect(withoutStaticImports).toContain(`const HomePage = {`)
  expect(withoutStaticImports).toContain(`const BarPage = {`)

  /*
    👇 Foo page is an explicitly imported page, so it should
    import FooPage from "...";
  */
  expect(withoutStaticImports).not.toContain(`const FooPage = {`)
  expect(withoutStaticImports).toContain(
    `var _FooPage = _interopRequireDefault(require(`,
  )
})
