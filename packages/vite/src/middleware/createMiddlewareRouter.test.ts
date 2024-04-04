import type { ViteDevServer } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMiddlewareRouter } from './register'

vi.mock('@redwoodjs/project-config', async () => {
  return {
    getPaths: () => {
      return {
        web: {
          base: '/proj/web',
          dist: '/proj/web/dist',
          distEntryServer: '/proj/web/dist/entry-server.mjs',
          entryServer: '/proj/web/entry-server.tsx',
        },
      }
    },
  }
})

const distRegisterMwMock = vi.fn()
vi.mock('/proj/web/dist/entry-server.mjs', () => {
  return {
    registerMiddleware: distRegisterMwMock,
  }
})

describe('createMiddlewareRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Should load using vite dev server, and load from entry-server source', async () => {
    const mockVite = {
      ssrLoadModule: vi.fn().mockReturnValue({
        registerMiddleware: () => {
          return []
        },
      }),
    } as unknown as ViteDevServer

    await createMiddlewareRouter(mockVite)

    expect(mockVite.ssrLoadModule).toHaveBeenCalledWith(
      '/proj/web/entry-server.tsx',
    )
  })

  it('Should load import from distEntryServer for prod', async () => {
    distRegisterMwMock.mockReturnValue([])
    await createMiddlewareRouter()
    expect(distRegisterMwMock).toHaveBeenCalled()
  })

  it('(async) should return a router with middleware handlers', async () => {
    // Testing async case
    distRegisterMwMock.mockResolvedValue([
      [vi.fn(), '/bazinga'],
      [vi.fn(), '/kittens'],
      vi.fn(),
    ])

    const result = await createMiddlewareRouter()

    expect(result.prettyPrint()).toMatchInlineSnapshot(`
      "└── (empty root node)
          ├── /
          │   ├── bazinga (GET)
          │   └── kittens (GET)
          └── * (GET)
      "
    `)
    expect(distRegisterMwMock).toHaveBeenCalled()
  })

  it('(sync) should return a router with middleware handlers', async () => {
    // Testing sync case
    distRegisterMwMock.mockReturnValue([
      [vi.fn(), '/bazinga'],
      [vi.fn(), '/kittens'],
      vi.fn(),
    ])

    const result = await createMiddlewareRouter()

    expect(result.prettyPrint()).toMatchInlineSnapshot(`
      "└── (empty root node)
          ├── /
          │   ├── bazinga (GET)
          │   └── kittens (GET)
          └── * (GET)
      "
    `)
    expect(distRegisterMwMock).toHaveBeenCalled()
  })
})
