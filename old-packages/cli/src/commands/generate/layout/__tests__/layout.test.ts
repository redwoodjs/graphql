globalThis.__dirname = __dirname
import path from 'path'

import { describe, test, it, expect } from 'vitest'

// Load shared mocks
import '../../../../lib/test'

import * as layout from '../layout'

describe('Single Word default files', async () => {
  const singleWordDefaultFiles = await layout.files({
    name: 'App',
    tests: true,
    stories: true,
  })

  it('returns exactly 3 files', () => {
    expect(Object.keys(singleWordDefaultFiles).length).toEqual(3)
  })

  it('creates a single word layout component', () => {
    expect(
      singleWordDefaultFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/AppLayout/AppLayout.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a single word layout test', () => {
    expect(
      singleWordDefaultFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/AppLayout/AppLayout.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a single word layout stories', () => {
    expect(
      singleWordDefaultFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/AppLayout/AppLayout.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('Multi word default files', async () => {
  const multiWordDefaultFiles = await layout.files({
    name: 'SinglePage',
    tests: true,
    stories: true,
  })

  it('creates a multi word layout component', () => {
    expect(
      multiWordDefaultFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/SinglePageLayout/SinglePageLayout.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a multi word layout test', () => {
    expect(
      multiWordDefaultFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/SinglePageLayout/SinglePageLayout.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a multi word layout test', () => {
    expect(
      multiWordDefaultFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/SinglePageLayout/SinglePageLayout.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('JS Files', async () => {
  const javascriptFiles = await layout.files({
    name: 'JavascriptPage',
    javascript: true,
    tests: true,
    stories: true,
  })

  it('creates JS layout components if javascript = true', () => {
    expect(
      javascriptFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/JavascriptPageLayout/JavascriptPageLayout.jsx',
        )
      ],
    ).not.toBeUndefined()
    expect(
      javascriptFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/JavascriptPageLayout/JavascriptPageLayout.test.jsx',
        )
      ],
    ).not.toBeUndefined()
  })
})

test('trims Layout from end of name', async () => {
  const files = await layout.files({
    name: 'BazingaLayout',
    tests: true,
    stories: true,
  })

  const layoutCode =
    files[
      path.normalize(
        '/path/to/project/web/src/layouts/BazingaLayout/BazingaLayout.jsx',
      )
    ]

  expect(layoutCode).not.toBeUndefined()
  expect(
    layoutCode.split('\n').includes('export default BazingaLayout'),
  ).toBeTruthy()
})

test('Does not trim Layout from beginning of name', async () => {
  const files = await layout.files({
    name: 'LayoutForBazinga',
    tests: true,
    stories: true,
  })

  const layoutCode =
    files[
      path.normalize(
        '/path/to/project/web/src/layouts/LayoutForBazingaLayout/LayoutForBazingaLayout.jsx',
      )
    ]

  expect(layoutCode).not.toBeUndefined()
  expect(
    layoutCode.split('\n').includes('export default LayoutForBazingaLayout'),
  ).toBeTruthy()
})

test('Does not trim Layout from middle of name', async () => {
  const files = await layout.files({
    name: 'MyLayoutForBazinga',
    tests: true,
    stories: true,
  })

  const layoutCode =
    files[
      path.normalize(
        '/path/to/project/web/src/layouts/MyLayoutForBazingaLayout/MyLayoutForBazingaLayout.jsx',
      )
    ]

  expect(layoutCode).not.toBeUndefined()
  expect(
    layoutCode.split('\n').includes('export default MyLayoutForBazingaLayout'),
  ).toBeTruthy()
})

test('Only trims Layout once', async () => {
  const files = await layout.files({
    name: 'BazingaLayoutLayout',
    tests: true,
    stories: true,
  })

  const layoutCode =
    files[
      path.normalize(
        '/path/to/project/web/src/layouts/BazingaLayoutLayout/BazingaLayoutLayout.jsx',
      )
    ]

  expect(layoutCode).not.toBeUndefined()
  expect(
    layoutCode.split('\n').includes('export default BazingaLayoutLayout'),
  ).toBeTruthy()
})

describe('TS files', async () => {
  const typescriptFiles = await layout.files({
    name: 'TypescriptPage',
    typescript: true,
    tests: true,
    stories: true,
  })

  it('creates TS layout components if typescript = true', () => {
    expect(
      typescriptFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/TypescriptPageLayout/TypescriptPageLayout.tsx',
        )
      ],
    ).not.toBeUndefined()
    expect(
      typescriptFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/TypescriptPageLayout/TypescriptPageLayout.test.tsx',
        )
      ],
    ).not.toBeUndefined()
  })
})

test("doesn't include storybook file when --stories is set to false", async () => {
  const withoutStoryFiles = await layout.files({
    name: 'withoutStories',
    javascript: true,
    tests: true,
    stories: false,
  })

  expect(Object.keys(withoutStoryFiles)).toEqual([
    path.normalize(
      '/path/to/project/web/src/layouts/WithoutStoriesLayout/WithoutStoriesLayout.test.jsx',
    ),
    path.normalize(
      '/path/to/project/web/src/layouts/WithoutStoriesLayout/WithoutStoriesLayout.jsx',
    ),
  ])
})

test("doesn't include test file when --tests is set to false", async () => {
  const withoutTestFiles = await layout.files({
    name: 'withoutTests',
    tests: false,
    stories: true,
  })

  expect(Object.keys(withoutTestFiles)).toEqual([
    path.normalize(
      '/path/to/project/web/src/layouts/WithoutTestsLayout/WithoutTestsLayout.stories.jsx',
    ),
    path.normalize(
      '/path/to/project/web/src/layouts/WithoutTestsLayout/WithoutTestsLayout.jsx',
    ),
  ])
})

test('JavaScript: includes skip link when --skipLink is set to true', async () => {
  const withSkipLinkFilesJS = await layout.files({
    name: 'A11y',
    skipLink: true,
  })

  expect(
    withSkipLinkFilesJS[
      path.normalize(
        '/path/to/project/web/src/layouts/A11yLayout/A11yLayout.jsx',
      )
    ],
  ).toMatchSnapshot()
})

test('TypeScript: includes skip link when --skipLink is set to true', async () => {
  const withSkipLinkFilesTS = await layout.files({
    name: 'A11y',
    skipLink: true,
    typescript: true,
  })

  expect(
    withSkipLinkFilesTS[
      path.normalize(
        '/path/to/project/web/src/layouts/A11yLayout/A11yLayout.tsx',
      )
    ],
  ).toMatchSnapshot()
})
