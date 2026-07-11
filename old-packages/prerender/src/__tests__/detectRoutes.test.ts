import { vi, describe, it, expect } from 'vitest'

import type { RWRoute } from '@redwoodjs/structure/dist/model/RWRoute'

import { detectPrerenderRoutes } from '../detection'

vi.mock('@redwoodjs/project-config', () => {
  return {
    getPaths: vi.fn(() => {
      return {
        base: '/mock/path',
        web: `/mock/path/web`,
      }
    }),
    processPagesDir: vi.fn(() => []),
  }
})

// Mock route detection, tested in @redwoodjs/structure separately

let mockedRoutes: Partial<RWRoute>[] = []
vi.mock('@redwoodjs/structure', () => {
  return {
    getProject: vi.fn(() => {
      return {
        getRouter: vi.fn(() => {
          return {
            routes: mockedRoutes,
          }
        }),
      }
    }),
  }
})

const expectPresence = (output, expectedOutput) => {
  expect(output).toContainEqual(expect.objectContaining(expectedOutput))
}

describe('Detecting routes', () => {
  it('Should correctly detect routes with prerender prop', () => {
    mockedRoutes = [
      { name: 'home', path: '/', prerender: true },
      { name: 'private', path: '/private', prerender: false },
      { name: 'about', path: '/about', prerender: true },
    ]
    const output = detectPrerenderRoutes()
    expect(output.length).toBe(2)
    expectPresence(output, { name: 'home', path: '/' })
    expectPresence(output, { name: 'about', path: '/about' })

    expect(output).not.toContainEqual(
      expect.objectContaining({ name: 'private', path: '/private' }),
    )
  })

  it('Should render notFoundPage as 404.html', () => {
    mockedRoutes = [
      {
        name: undefined,
        path: undefined,
        prerender: true,
        isNotFound: true,
      },
    ]

    const output = detectPrerenderRoutes()
    expect(output.length).toBe(1)
    expect(output[0].name).toBe('404')
    expect(output[0].path).toBe('/404')
  })

  it('Should also allow routes with params', () => {
    mockedRoutes = [
      {
        name: 'taskDetail',
        path: '/task/${id}',
        hasParameters: true,
        prerender: true,
      },
    ]

    const output = detectPrerenderRoutes()
    expect(output.length).toBe(1)
  })

  it('Should return required keys', () => {
    mockedRoutes = [
      {
        name: 'tasks',
        path: '/tasks',
        hasParameters: false,
        prerender: true,
        page: {
          filePath: '/mocked_path/tasks',
        },
      },
      {
        name: 'kittens',
        path: '/kittens',
        hasParameters: false,
        prerender: true,
        page: {
          filePath: '/mocked_path/Kittens.tsx',
        },
      },
    ]

    const output = detectPrerenderRoutes()

    expectPresence(output, {
      name: 'tasks',
      path: '/tasks',
      filePath: '/mocked_path/tasks',
    })

    expectPresence(output, {
      name: 'kittens',
      path: '/kittens',
      filePath: '/mocked_path/Kittens.tsx',
    })
  })
})
