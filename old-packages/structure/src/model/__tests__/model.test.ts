/* eslint-disable @typescript-eslint/no-unused-expressions */
import { basename, resolve } from 'path'

import { describe, it, expect } from 'vitest'

import { DefaultHost } from '../../hosts'
import { URL_file } from '../../x/URL'
import { RWProject } from '../RWProject'

describe('Redwood Project Model', () => {
  it('can process example-todo-main', async () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })

    const pageNames = new Set(project.pages.map((p) => p.basenameNoExt))
    expect(pageNames).toEqual(
      new Set([
        'FatalErrorPage',
        'HomePage',
        'NotFoundPage',
        'PrivatePage',
        'TypeScriptPage',
        'EditUserPage',
        'FooPage',
        'BarPage',
      ]),
    )
    for (const page of project.pages) {
      page.basenameNoExt
      page.route?.id
    }
    expect(
      project.sdls.map((s) => s.name).sort((a, b) => (a < b ? -1 : 1)),
    ).toEqual(['currentUser', 'todos'])

    for (const c of project.components) {
      c.basenameNoExt
    }
    project.components.length
    project.components.map((c) => c.basenameNoExt)
    project.functions.length
    project.services.length
    project.sdls.length
    const ds = await project.collectDiagnostics()
    ds.length
    const uri = URL_file(projectRoot, 'api/src/graphql/todos.sdl.js')
    const node = await project.findNode(uri)
    expect(node).toBeDefined()
    expect(node?.id).toEqual(uri)
    if (node) {
      const info = await node.collectIDEInfo()
      info.length
      info
    }
  })

  it('example-todo-main-with-errors', async () => {
    const projectRoot = getFixtureDir('example-todo-main-with-errors')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const ds = await project.collectDiagnostics()
    expect(ds.length).toBeGreaterThan(0)
    // const diagnosticCodes = new Set(ds.map((d) => d.diagnostic.code))
    // expect(diagnosticCodes).toEqual(
    //   new Set([RWError.NOTFOUND_PAGE_NOT_DEFINED])
    // )
    const dss = await project.router.collectDiagnostics()
    expect(dss.length).toBeGreaterThan(0)
  })
})

describe('Cells', () => {
  it('Correctly determines a Cell component vs a normal component', () => {
    const projectRoot = getFixtureDir('example-todo-main-with-errors')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const cells = project.cells
    expect(cells).toHaveLength(1)
    expect(cells.map((cell) => basename(cell.filePath))).not.toContain(
      'TableCell.js',
    )
  })

  it('Can get the operation name of the QUERY', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const cell = project.cells.find((x) => x.uri.endsWith('TodoListCell.tsx'))
    expect(cell?.queryOperationName).toMatch('TodoListCell_GetTodos')
  })

  it('Warns you when you do not supply a name to QUERY', async () => {
    const projectRoot = getFixtureDir('example-todo-main-with-errors')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })

    const cell = project.cells.find((x) => x.uri.endsWith('TodoListCell.js'))
    const x = await cell?.collectDiagnostics()
    expect(x).not.toBeUndefined()
    expect(x?.map((e) => e.diagnostic.message)).toContain(
      'We recommend that you name your query operation',
    )
  })
})

describe('Redwood Page detection', () => {
  it('detects pages', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes
    const pages = routes.map((r) => r.page).sort()
    const pageConstants = pages.map((p) => p?.constName)
    // Note: Pages can be duplicated if used by multiple routes, we use a Set
    expect(pageConstants).toEqual([
      'HomePage',
      'TypeScriptPage',
      'FooPage',
      'BarPage',
      'PrivatePage',
      'PrivatePage',
      'PrivatePage',
      'NotFoundPage',
      undefined,
    ])
  })
})

describe('Redwood Route detection', () => {
  it('detects the page identifier for a route', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes

    const pageIdentifiers = routes.map((r) => r.page_identifier_str)

    expect(pageIdentifiers.length).toBe(9)
    expect(pageIdentifiers).toMatchSnapshot()
  })
  it('detects routes with the prerender prop', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes

    const prerenderRoutes = routes
      .filter((r) => r.prerender)
      // Make it a little easier to read by only keeping the attributes we're
      // interested in
      .map(({ name, path }) => ({ name, path }))

    expect(prerenderRoutes.length).toBe(8)
    expect(prerenderRoutes).toContainEqual({ name: 'home', path: '/' })
    expect(prerenderRoutes).toContainEqual({
      name: 'typescriptPage',
      path: '/typescript',
    })
    expect(prerenderRoutes).toContainEqual({
      name: 'someOtherPage',
      path: '/somewhereElse',
    })
    expect(prerenderRoutes).toContainEqual({ name: 'fooPage', path: '/foo' })
    expect(prerenderRoutes).toContainEqual({ name: 'barPage', path: '/bar' })
    expect(prerenderRoutes).toContainEqual({
      name: 'privatePage',
      path: '/private-page',
    })
  })
  it('detects authenticated routes', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes

    const authenticatedRoutes = routes
      .filter((r) => r.isPrivate)
      .map(({ name, path, unauthenticated, roles }) => ({
        name,
        path,
        unauthenticated,
        roles,
      }))

    expect(authenticatedRoutes.length).toBe(3)
  })

  it('detects name and path for an authenticated route', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes

    const authenticatedRoutes = routes
      .filter((r) => r.isPrivate)
      .map(({ name, path, unauthenticated, roles }) => ({
        name,
        path,
        unauthenticated,
        roles,
      }))

    expect(authenticatedRoutes[1].name).toBe('privatePageAdmin')
    expect(authenticatedRoutes[1].path).toBe('/private-page-admin')
    expect(authenticatedRoutes[1].unauthenticated).toBe('home')
    expect(authenticatedRoutes[1].roles).toBeTypeOf('string')
    expect(authenticatedRoutes[1].roles).toContain('admin')
  })

  it('detects roles for an authenticated route when roles is a string of a single role', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes

    const authenticatedRoutes = routes
      .filter((r) => r.isPrivate)
      .map(({ name, path, unauthenticated, roles }) => ({
        name,
        path,
        unauthenticated,
        roles,
      }))

    expect(authenticatedRoutes[1].name).toBe('privatePageAdmin')
    expect(authenticatedRoutes[1].path).toBe('/private-page-admin')
    expect(authenticatedRoutes[1].unauthenticated).toBe('home')
    expect(authenticatedRoutes[1].roles).toBeTypeOf('string')
    expect(authenticatedRoutes[1].roles).toContain('admin')
  })

  it('detects roles for an authenticated route when roles is an array of a roles', () => {
    const projectRoot = getFixtureDir('example-todo-main')
    const project = new RWProject({ projectRoot, host: new DefaultHost() })
    const routes = project.getRouter().routes

    const authenticatedRoutes = routes
      .filter((r) => r.isPrivate)
      .map(({ name, path, unauthenticated, roles }) => ({
        name,
        path,
        unauthenticated,
        roles,
      }))

    expect(authenticatedRoutes[2].name).toBe('privatePageAdminSuper')
    expect(authenticatedRoutes[2].path).toBe('/private-page-admin-super')
    expect(authenticatedRoutes[2].unauthenticated).toBe('home')
    expect(authenticatedRoutes[2].roles).toBeInstanceOf(Array)
    expect(authenticatedRoutes[2].roles).toContain('owner')
    expect(authenticatedRoutes[2].roles).toContain('superuser')
    expect(authenticatedRoutes[2].roles).not.toContain('member')
  })
})

function getFixtureDir(
  name:
    | 'example-todo-main-with-errors'
    | 'example-todo-main'
    | 'empty-project'
    | 'test-project',
) {
  return resolve(__dirname, `../../../../../__fixtures__/${name}`)
}
