import path from 'path'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main',
)

import { beforeAll, afterAll, test, expect } from 'vitest'

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
})
afterAll(() => {
  delete process.env.RWJS_CWD
})

import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

import {
  findApiServerFunctions,
  findCells,
  findDirectoryNamedModules,
  findGraphQLSchemas,
  findPages,
  isCellFile,
  isFileInsideFolder,
} from '../files'

const cleanPaths = (p) => {
  return ensurePosixPath(path.relative(FIXTURE_PATH, p))
}

test('finds all the cells', () => {
  const paths = findCells()
  const p = paths.map(cleanPaths)

  expect(p).toMatchInlineSnapshot(`
    [
      "web/src/components/NumTodosCell/NumTodosCell.js",
      "web/src/components/NumTodosTwoCell/NumTodosTwoCell.js",
      "web/src/components/TodoListCell/TodoListCell.tsx",
    ]
  `)
})

test('finds directory named modules', () => {
  const paths = findDirectoryNamedModules()
  const p = paths.map(cleanPaths)

  expect(p).toMatchInlineSnapshot(`
    [
      "web/src/graphql/graphql.ts",
      "api/src/directives/requireAuth/requireAuth.js",
      "api/src/directives/skipAuth/skipAuth.js",
      "api/src/functions/healthz/healthz.js",
      "api/src/functions/nested/nested.ts",
      "api/src/services/todos/todos.js",
      "web/src/components/AddTodo/AddTodo.js",
      "web/src/components/AddTodoControl/AddTodoControl.js",
      "web/src/components/Check/Check.js",
      "web/src/components/TableCell/TableCell.js",
      "web/src/components/TodoItem/TodoItem.js",
      "web/src/layouts/SetLayout/SetLayout.js",
      "web/src/pages/BarPage/BarPage.tsx",
      "web/src/pages/FatalErrorPage/FatalErrorPage.js",
      "web/src/pages/FooPage/FooPage.tsx",
      "web/src/pages/HomePage/HomePage.tsx",
      "web/src/pages/NotFoundPage/NotFoundPage.js",
      "web/src/pages/PrivatePage/PrivatePage.tsx",
      "web/src/pages/TypeScriptPage/TypeScriptPage.tsx",
      "web/src/pages/admin/EditUserPage/EditUserPage.jsx",
    ]
  `)
})

test('finds all the page files', () => {
  const paths = findPages()
  const p = paths.map(cleanPaths)

  expect(p).toMatchInlineSnapshot(`
    [
      "web/src/pages/BarPage/BarPage.tsx",
      "web/src/pages/FatalErrorPage/FatalErrorPage.js",
      "web/src/pages/FooPage/FooPage.tsx",
      "web/src/pages/HomePage/HomePage.tsx",
      "web/src/pages/NotFoundPage/NotFoundPage.js",
      "web/src/pages/PrivatePage/PrivatePage.tsx",
      "web/src/pages/TypeScriptPage/TypeScriptPage.tsx",
      "web/src/pages/admin/EditUserPage/EditUserPage.jsx",
    ]
  `)
})

test('find the graphql schema files', () => {
  const paths = findGraphQLSchemas()
  const p = paths.map(cleanPaths)

  expect(p[0]).toMatchInlineSnapshot(`"api/src/graphql/currentUser.sdl.ts"`)
  expect(p[1]).toMatchInlineSnapshot(`"api/src/graphql/todos.sdl.js"`)
})

test('find api functions', () => {
  const paths = findApiServerFunctions()
  const p = paths.map(cleanPaths)

  expect(p).toMatchInlineSnapshot(`
    [
      "api/src/functions/graphql.js",
      "api/src/functions/healthz/healthz.js",
      "api/src/functions/nested/nested.ts",
      "api/src/functions/x/index.js",
    ]
  `)
})

test('isFileInsideFolder works correctly (esp on windows)', () => {
  expect(
    isFileInsideFolder(
      path.join(FIXTURE_PATH, 'web/src/components/TableCell/TableCell.js'),
      getPaths().web.base,
    ),
  ).toBe(true)

  expect(
    isFileInsideFolder(
      path.join(FIXTURE_PATH, 'web/src/pages/NotFoundPage/NotFoundPage.js'),
      getPaths().web.pages,
    ),
  ).toBe(true)

  expect(
    isFileInsideFolder(
      path.join(FIXTURE_PATH, 'web/src/pages/NotFoundPage/NotFoundPage.js'),
      getPaths().api.base,
    ),
  ).toBe(false)

  expect(
    isFileInsideFolder(
      path.join(FIXTURE_PATH, 'api/src/functions/healthz/healthz.js'),
      getPaths().api.functions,
    ),
  ).toBe(true)
})

test('isCellFile detects cells correctly', () => {
  const invalidCell = isCellFile(
    path.join(FIXTURE_PATH, 'web/src/components/TableCell/TableCell.js'),
  )

  const validCell = isCellFile(
    path.join(FIXTURE_PATH, 'web/src/components/TodoListCell/TodoListCell.tsx'),
  )

  const notACell = isCellFile(
    path.join(FIXTURE_PATH, 'api/src/services/todos/DoesNotExist.js'),
  )

  expect(invalidCell).toBe(false)
  expect(validCell).toBe(true)
  expect(notACell).toBe(false)
})
