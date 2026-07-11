import { vi, test, expect } from 'vitest'

import { findApiDistFunctions } from '@redwoodjs/internal/dist/files'

import * as nftPacker from '../packing/nft'

vi.mock('@vercel/nft', () => {
  return {
    nodeFileTrace: vi.fn(),
  }
})

vi.mock('@redwoodjs/internal/dist/files', () => {
  return {
    findApiDistFunctions: () => {
      return [
        '/Users/carmack/dev/redwood/__fixtures__/example-todo-main/api/dist/functions/graphql.js',
        '/Users/carmack/dev/redwood/__fixtures__/example-todo-main/api/dist/functions/healthz/healthz.js',
        '/Users/carmack/dev/redwood/__fixtures__/example-todo-main/api/dist/functions/invalid/x.js',
        '/Users/carmack/dev/redwood/__fixtures__/example-todo-main/api/dist/functions/nested/nested.js',
        '/Users/carmack/dev/redwood/__fixtures__/example-todo-main/api/dist/functions/x/index.js',
      ]
    },
  }
})

vi.mock('@redwoodjs/project-config', () => {
  return {
    getPaths: () => {
      return {
        base: '/Users/carmack/dev/redwood/__fixtures__/example-todo-main/',
      }
    },
    ensurePosixPath: (path) => {
      return path.replace(/\\/g, '/')
    },
  }
})

test('Check packager detects all functions', () => {
  const packageFileMock = vi
    .spyOn(nftPacker, 'packageSingleFunction')
    .mockResolvedValue(true)

  nftPacker.nftPack()

  expect(packageFileMock).toHaveBeenCalledTimes(5)
})

test('Creates entry file for nested functions correctly', () => {
  const nestedFunction = findApiDistFunctions().find((fPath) =>
    fPath.includes('nested'),
  )

  const [outputPath, content] = nftPacker.generateEntryFile(
    nestedFunction,
    'nested',
  )

  expect(outputPath).toBe('./api/dist/zipball/nested/nested.js')
  expect(content).toMatchInlineSnapshot(
    `"module.exports = require('./api/dist/functions/nested/nested.js')"`,
  )
})

test('Creates entry file for top level functions correctly', () => {
  const graphqlFunction = findApiDistFunctions().find((fPath) =>
    fPath.includes('graphql'),
  )

  const [outputPath, content] = nftPacker.generateEntryFile(
    graphqlFunction,
    'graphql',
  )

  expect(outputPath).toBe('./api/dist/zipball/graphql/graphql.js')
  expect(content).toMatchInlineSnapshot(
    `"module.exports = require('./api/dist/functions/graphql.js')"`,
  )
})
