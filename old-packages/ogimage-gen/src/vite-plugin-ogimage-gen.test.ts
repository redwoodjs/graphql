import { vol, fs as memfs } from 'memfs'
import type { ConfigEnv } from 'vite'
import { describe, expect, test, vi, beforeAll, afterAll } from 'vitest'

import { ensurePosixPath } from '@redwoodjs/project-config'

import vitePluginOgGen from './vite-plugin-ogimage-gen'

// Memfs mocks the redwood project-config stuff
vi.mock('fs', () => ({ ...memfs, default: { ...memfs } }))
vi.mock('node:fs', () => ({ ...memfs, default: { ...memfs } }))

/**
  +   "ogImage/pages\\About\\AboutPage.og":           "/redwood-app/web/src/pages/About/AboutPage.og.jsx",
  +   "ogImage/pages\\Contact\\ContactPage.og":       "/redwood-app/web/src/pages/Contact/ContactPage.og.jsx",
  +   "ogGen\\pages\\Posts\\PostsPage\\PostsPage.og": "/redwood-app/web/src/pages/Posts/PostsPage/PostsPage.og.tsx",
 */

describe('vitePluginOgGen', () => {
  let original_RWJS_CWD

  beforeAll(() => {
    original_RWJS_CWD = process.env.RWJS_CWD
    process.env.RWJS_CWD = '/redwood-app'
    // Mock the file system using memfs
    vol.fromJSON(
      {
        'redwood.toml': '',
        'web/src/pages/Posts/PostsPage/PostsPage.og.tsx': 'PostsOG',
        'web/src/pages/About/AboutPage.og.jsx': 'AboutOG',
        'web/src/pages/Contact/ContactPage.og.jsx': 'ContactOG',
      },
      '/redwood-app',
    )
  })

  afterAll(() => {
    process.env.RWJS_CWD = original_RWJS_CWD
  })

  test('should generate rollup inputs for all OG components', async () => {
    // Type cast so TS doesn't complain calling config below
    // because config can be of many types!
    const plugin = vitePluginOgGen() as {
      config: (config: any, env: ConfigEnv) => any
    }

    const rollupInputs = plugin.config(
      {},
      {
        isSsrBuild: true,
        command: 'build',
        mode: 'production',
      },
    ).build?.rollupOptions?.input

    const inputKeys = Object.keys(rollupInputs)

    expect(inputKeys).toEqual(
      expect.arrayContaining([
        'ogImage/pages/Posts/PostsPage/PostsPage.og',
        'ogImage/pages/About/AboutPage.og',
        'ogImage/pages/Contact/ContactPage.og',
      ]),
    )

    // For windows, we do the conversion before the test
    expect(
      ensurePosixPath(
        rollupInputs['ogImage/pages/Posts/PostsPage/PostsPage.og'],
      ),
    ).toMatch('/redwood-app/web/src/pages/Posts/PostsPage/PostsPage.og.tsx')

    expect(
      ensurePosixPath(rollupInputs['ogImage/pages/About/AboutPage.og']),
    ).toMatch('/redwood-app/web/src/pages/About/AboutPage.og.jsx')

    expect(
      ensurePosixPath(rollupInputs['ogImage/pages/Contact/ContactPage.og']),
    ).toMatch('/redwood-app/web/src/pages/Contact/ContactPage.og.jsx')
  })

  test('returns the correct Vite plugin object', async () => {
    const expectedPlugin = {
      name: 'rw-vite-plugin-ogimage-gen',
      apply: 'build', // Important!
      config: expect.any(Function),
    }

    const plugin = vitePluginOgGen()

    expect(plugin).toEqual(expectedPlugin)
  })
})
