/* eslint-disable camelcase */
globalThis.__dirname = __dirname

import { vol, fs as memfs } from 'memfs'
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest'

import { ensurePosixPath } from '@redwoodjs/project-config'

import * as ogImage from '../ogImage'

vi.mock('fs', () => ({ ...memfs, default: { ...memfs } }))
vi.mock('node:fs', () => ({ ...memfs, default: { ...memfs } }))
vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    getPaths: () => ({
      api: {
        base: '/path/to/project/api',
      },
      web: {
        base: '/path/to/project/web',
        generators: '/path/to/project/web/src/generators',
        pages: '/path/to/project/web/src/pages',
      },
      base: '/path/to/project',
    }),
  }
})

let original_RWJS_CWD

describe('ogImage generator', () => {
  beforeEach(() => {
    original_RWJS_CWD = process.env.RWJS_CWD
    process.env.RWJS_CWD = '/path/to/project'
    vol.fromJSON(
      {
        'redwood.toml': '',
        'web/src/pages/AboutPage/AboutPage.jsx': 'This is the AboutPage',
        'web/src/pages/ContactUsPage/ContactUsPage.jsx':
          'This is the ContactUsPage',
        'web/src/pages/Products/Display/ProductPage/ProductPage.tsx':
          'This is the ProductsPage',
      },
      '/path/to/project',
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    process.env.RWJS_CWD = original_RWJS_CWD
  })

  describe('files', () => {
    test('returns the path to the .jsx template to be written', async () => {
      const files = await ogImage.files({
        pagePath: 'AboutPage/AboutPage',
        typescript: false,
      })
      const filePath = ensurePosixPath(Object.keys(files)[0])

      expect(filePath).toEqual(
        '/path/to/project/web/src/pages/AboutPage/AboutPage.og.jsx',
      )
    })

    test('returns the path to the .tsx template to be written', async () => {
      const files = await ogImage.files({
        pagePath: 'AboutPage/AboutPage',
        typescript: true,
      })
      const filePath = ensurePosixPath(Object.keys(files)[0])

      expect(filePath).toEqual(
        '/path/to/project/web/src/pages/AboutPage/AboutPage.og.tsx',
      )
    })

    test('returns the path to the template when the page is nested in subdirectories', async () => {
      const files = await ogImage.files({
        pagePath: 'Products/Display/ProductPage/ProductPage',
        typescript: true,
      })
      const filePath = ensurePosixPath(Object.keys(files)[0])

      expect(filePath).toEqual(
        '/path/to/project/web/src/pages/Products/Display/ProductPage/ProductPage.og.tsx',
      )
    })

    test('returns the template to be written', async () => {
      const files = await ogImage.files({
        pagePath: 'AboutPage/AboutPage',
        typescript: false,
      })

      expect(Object.values(files)[0]).toMatchSnapshot()
    })
  })

  describe('normalizedPath', () => {
    test('returns an array without a leading "pages" dir', () => {
      expect(ogImage.normalizedPath('pages/AboutPage/AboutPage')).toEqual(
        'AboutPage/AboutPage',
      )
    })

    test('returns an array prepended with a missing page directory', () => {
      expect(ogImage.normalizedPath('AboutPage')).toEqual('AboutPage/AboutPage')
    })

    test('returns an array when page is nested in subdirectories', () => {
      expect(
        ogImage.normalizedPath('Products/Display/ProductPage/ProductPage'),
      ).toEqual('Products/Display/ProductPage/ProductPage')
    })

    test('returns an array including a missing page directory when deeply nested', () => {
      expect(ogImage.normalizedPath('Products/Display/ProductPage')).toEqual(
        'Products/Display/ProductPage/ProductPage',
      )
    })
  })

  describe('validatePath', () => {
    test('does nothing if path to jsx page exists', async () => {
      await expect(
        ogImage.validatePath('AboutPage/AboutPage', 'jsx', { fs: memfs }),
      ).resolves.toEqual(true)
    })

    test('does nothing if path to tsx page exists in nested directory structure', async () => {
      await expect(
        ogImage.validatePath(
          'Products/Display/ProductPage/ProductPage',
          'tsx',
          { fs: memfs },
        ),
      ).resolves.toEqual(true)
    })

    test('does nothing if path to tsx page exists in nested directory structure', async () => {
      const pagePath = 'ContactUsPage/ContactUsPage'
      const ext = 'tsx'
      await expect(
        ogImage.validatePath(pagePath, ext, {
          fs: memfs,
        }),
      ).rejects.toThrow()
    })

    test('throws an error if page does not exist', async () => {
      const pagePath = 'HomePage/HomePage'
      const ext = 'jsx'
      await expect(
        ogImage.validatePath(pagePath, ext, { fs: memfs }),
      ).rejects.toThrow()
    })
  })
})
