import path from 'path'

import { describe, beforeAll, afterAll, test, expect } from 'vitest'

import {
  DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE,
  DIRECTIVE_REQUIRED_ERROR_MESSAGE,
  loadAndValidateSdls,
} from '../validateSchema'

const FIXTURE_ERROR_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main-with-errors',
)

describe('SDL is missing directives', () => {
  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_ERROR_PATH
  })
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  test('is invalid due to missing directives', async () => {
    await expect(loadAndValidateSdls()).rejects.toThrowError(
      DIRECTIVE_REQUIRED_ERROR_MESSAGE,
    )
  })

  test('does not throw an error due to invalid roles', async () => {
    await expect(loadAndValidateSdls()).rejects.not.toThrowError(
      DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE,
    )
  })
})
