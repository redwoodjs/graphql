import path from 'path'

import pluginTester from 'babel-plugin-tester'
import { vi, describe, beforeEach, afterAll } from 'vitest'

import type projectConfig from '@redwoodjs/project-config'

import plugin from '../babel-plugin-redwood-prerender-media-imports'

let mockDistDir
let mockSrcDir

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal<typeof projectConfig>()
  return {
    ...originalProjectConfig,
    getPaths: () => {
      return {
        web: {
          dist: mockDistDir,
          src: mockSrcDir,
        },
      }
    },
  }
})

vi.mock('../utils', () => {
  return {
    convertToDataUrl: (assetPath) => {
      return `data:image/jpg;base64,xxx-mock-b64-${assetPath}`
    },
  }
})

describe('Vite bundler', () => {
  beforeEach(() => {
    mockDistDir = path.resolve(__dirname, './__fixtures__/viteDistDir')
    mockSrcDir = path.resolve(__dirname, './__fixtures__/viteSrcDir')
  })

  describe('Should replace larger imports based on generated manifest', () => {
    pluginTester({
      plugin,
      pluginName: 'babel-plugin-redwood-prerender-media-imports',
      filepath: path.resolve(
        __dirname,
        './__fixtures__/viteSrcDir/pages/HomePage/HomePage.js',
      ),
      tests: [
        {
          title: 'Handle jpgs',
          code: `import img1 from '../../components/Post/Posts/image1.jpg'`,
          output: `const img1 = 'assets/image1-hash.jpg'`,
        },
        {
          title: 'Handle jpegs',

          code: `import img2 from './image2.jpeg'`,
          output: `const img2 = 'assets/image2-hash.jpeg'`,
        },
        {
          title: 'Handle pngs',

          code: `import img3 from './image3.png'`,
          output: `const img3 = 'assets/image3-hash.png'`,
        },
        {
          title: 'Handle bmps',
          code: `import img4 from './image4.bmp'`,
          output: `const img4 = 'assets/image4-hash.bmp'`,
        },
        {
          title: 'Handle pdfs',
          code: `import pdfDoc from '../../pdf/invoice.pdf'`,
          output: `const pdfDoc = 'assets/invoice-7d64ed28.pdf'`,
        },
        {
          title: 'Handle gifs',
          code: `import nyanCat from './funny.gif'`,
          output: `const nyanCat = 'assets/funny-hash.gif'`,
        },
      ],
    })

    afterAll(() => {
      vi.clearAllMocks()
    })
  })

  describe('Should replace small img sources with blank data url', () => {
    // These imports aren't in the manifest
    // which simulates that they were handled by the url loader
    pluginTester({
      plugin,
      // disable formatter for this test
      formatResult: (r) => r,
      pluginName: 'babel-plugin-redwood-prerender-media-imports',
      filepath: path.resolve(
        __dirname,
        './__fixtures__/viteSrcDir/pages/HomePage/HomePage.js',
      ),
      tests: [
        {
          title: 'Url loaded image',
          code: `import img1 from './small.jpg'`,
          output: `const img1 = "data:image/jpg;base64,xxx-mock-b64-small.jpg";`,
        },
      ],
    })

    afterAll(() => {
      vi.clearAllMocks()
    })
  })
})
