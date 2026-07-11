import path from 'path'

import { afterEach, beforeAll, describe, expect, it, test } from 'vitest'

import {
  loadDefaultEnvFiles,
  loadNodeEnvDerivedEnvFile,
  loadUserSpecifiedEnvFiles,
} from '../loadEnvFiles.js'

describe('loadEnvFiles', () => {
  let originalProcessEnv: NodeJS.Process['env']
  beforeAll(() => {
    originalProcessEnv = { ...process.env }
  })
  afterEach(() => {
    process.env = { ...originalProcessEnv }
  })

  it("doesn't load .env files if there are none to load", () => {
    const cwd = __dirname
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, [])

    expect(process.env).toEqual(originalProcessEnv)
  })

  it("doesn't load .env files if not instructed to", () => {
    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-prod')
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, [])

    expect(process.env).toEqual(originalProcessEnv)
  })

  it('loads specified .env files', () => {
    expect(process.env).not.toHaveProperty('PROD_DATABASE_URL')

    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-prod')
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, ['prod'])

    expect(process.env).toHaveProperty(
      'PROD_DATABASE_URL',
      'postgresql://user:password@localhost:5432/myproddb',
    )
  })

  test('process.env is reset between tests', () => {
    expect(process.env).not.toHaveProperty('PROD_DATABASE_URL')
  })

  it('loads multiple .env files', () => {
    expect(process.env).not.toHaveProperty('DEV_DATABASE_URL')
    expect(process.env).not.toHaveProperty('PROD_DATABASE_URL')

    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-many')
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, ['dev', 'prod'])

    expect(process.env).toHaveProperty(
      'DEV_DATABASE_URL',
      'postgresql://user:password@localhost:5432/mydevdb',
    )
    expect(process.env).toHaveProperty(
      'PROD_DATABASE_URL',
      'postgresql://user:password@localhost:5432/myproddb',
    )
  })

  it('is additive (i.e. only adds to process.env, not overwrites)', () => {
    expect(process.env).not.toHaveProperty('DATABASE_URL')
    expect(process.env).not.toHaveProperty('TEST_BASE')
    expect(process.env).not.toHaveProperty('TEST_COLLISION')

    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-collision')
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, ['base', 'collision'])

    expect(process.env).toHaveProperty(
      'DATABASE_URL',
      'postgresql://user:password@localhost:5432/mycollisiondb',
    )
    expect(process.env).toHaveProperty('TEST_BASE', '1')
    expect(process.env).toHaveProperty('TEST_COLLISION', '1')
  })

  it('loads .env files based on NODE_ENV ', () => {
    expect(process.env).not.toHaveProperty('PROD_DATABASE_URL')
    expect(process.env).not.toHaveProperty('BAZINGA')

    process.env.NODE_ENV = 'bazinga'
    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-node-env')
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, [])

    expect(process.env).toHaveProperty(
      'PROD_DATABASE_URL',
      'postgresql://user:password@localhost:5432/bazinga',
    )
    expect(process.env).toHaveProperty('BAZINGA', '1')
  })

  it('loads .env files based on NODE_ENV before user-specified .env files', () => {
    expect(process.env).not.toHaveProperty('PROD_DATABASE_URL')
    expect(process.env).not.toHaveProperty('BAZINGA')

    process.env.NODE_ENV = 'bazinga'
    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-node-env')
    loadDefaultEnvFiles(cwd)
    loadNodeEnvDerivedEnvFile(cwd)
    loadUserSpecifiedEnvFiles(cwd, ['prod'])

    expect(process.env).toHaveProperty(
      'PROD_DATABASE_URL',
      'postgresql://user:password@localhost:5432/myproddb',
    )
    expect(process.env).toHaveProperty('BAZINGA', '1')
  })

  it("throws if it can't find a specified env file", () => {
    const cwd = path.join(__dirname, '__fixtures__/redwood-app-env-node-env')

    try {
      loadDefaultEnvFiles(cwd)
      loadNodeEnvDerivedEnvFile(cwd)
      loadUserSpecifiedEnvFiles(cwd, ['missing'])
    } catch (error) {
      // Just testing that the error message reports the file it tried to load.
      expect((error as Error).message).toMatch(/\.env\.missing/)
    }
  })
})
