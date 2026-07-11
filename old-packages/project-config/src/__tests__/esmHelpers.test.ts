import path from 'path'

import { describe, beforeAll, afterAll, expect, test } from 'vitest'

import { projectIsEsm, projectRootIsEsm, projectSideIsEsm } from '../paths'

const RWJS_CWD = process.env.RWJS_CWD

describe('esm helpers', () => {
  describe('esm fixture', () => {
    const ESM_FIXTURE = path.join(__dirname, 'fixtures', 'esm')

    beforeAll(() => {
      process.env.RWJS_CWD = ESM_FIXTURE
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    test('projectIsEsm', () => {
      expect(projectIsEsm()).toEqual(true)
    })

    test('projectRootIsEsm', () => {
      expect(projectRootIsEsm()).toEqual(true)
    })

    test('projectSideIsEsm', () => {
      expect(projectSideIsEsm('api')).toEqual(true)
      expect(projectSideIsEsm('web')).toEqual(true)
    })
  })

  describe('esm api only fixture', () => {
    const ESM_API_ONLY_FIXTURE = path.join(
      __dirname,
      'fixtures',
      'esm-api-only',
    )

    beforeAll(() => {
      process.env.RWJS_CWD = ESM_API_ONLY_FIXTURE
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    test('projectIsEsm', () => {
      expect(projectIsEsm()).toEqual(false)
    })

    test('projectRootIsEsm', () => {
      expect(projectRootIsEsm()).toEqual(false)
    })

    test('projectSideIsEsm', () => {
      expect(projectSideIsEsm('api')).toEqual(true)
      expect(projectSideIsEsm('web')).toEqual(false)
    })
  })
})
