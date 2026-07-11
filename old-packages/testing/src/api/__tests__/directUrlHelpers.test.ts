import fs from 'fs'
import path from 'path'

import { it, expect } from 'vitest'

import { checkAndReplaceDirectUrl, getDefaultDb } from '../directUrlHelpers'

const FIXTURE_DIR_PATH = path.resolve('..', '..', '__fixtures__')

const NO_DIRECT_URL_FIXTURE_PATH = path.join(FIXTURE_DIR_PATH, 'test-project')
const DIRECT_URL_FIXTURE_PATH = path.join(FIXTURE_DIR_PATH, 'empty-project')

it("does nothing if directUrl isn't set", () => {
  process.env.RWJS_CWD = NO_DIRECT_URL_FIXTURE_PATH

  checkAndReplaceDirectUrl(
    fs.readFileSync(
      path.join(NO_DIRECT_URL_FIXTURE_PATH, 'api', 'db', 'schema.prisma'),
      'utf-8',
    ),
    getDefaultDb(NO_DIRECT_URL_FIXTURE_PATH),
  )

  expect(process.env.DIRECT_URL).toBeUndefined()

  delete process.env.RWJS_CWD
})

it("overwrites directUrl if it's set", () => {
  process.env.RWJS_CWD = DIRECT_URL_FIXTURE_PATH

  const defaultDb = getDefaultDb(DIRECT_URL_FIXTURE_PATH)

  const directUrlEnvVar = checkAndReplaceDirectUrl(
    fs.readFileSync(
      path.join(DIRECT_URL_FIXTURE_PATH, 'api', 'db', 'schema.prisma'),
      'utf-8',
    ),
    defaultDb,
  )

  expect(process.env[directUrlEnvVar as string]).toBe(defaultDb)

  delete process.env.RWJS_CWD
})

it("overwrites directUrl if it's set and formatted", () => {
  const prismaSchema = `datasource db {
    provider          = "sqlite"
    url               = env("DATABASE_URL")
    directUrl         = env("DIRECT_URL")
    shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  }`
  process.env.RWJS_CWD = DIRECT_URL_FIXTURE_PATH

  const defaultDb = getDefaultDb(DIRECT_URL_FIXTURE_PATH)

  const directUrlEnvVar = checkAndReplaceDirectUrl(prismaSchema, defaultDb)

  expect(process.env[directUrlEnvVar as string]).toBe(defaultDb)
})
