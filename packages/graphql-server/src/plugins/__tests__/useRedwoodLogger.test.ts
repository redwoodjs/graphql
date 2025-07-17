import { existsSync, readFileSync, statSync } from 'fs'
import os from 'os'
import { join } from 'path'

import { useEngine } from '@envelop/core'
import * as GraphQLJS from 'graphql'
import { describe, expect, it } from 'vitest'

import type { Logger, LoggerOptions } from '@redwoodjs/api/logger'
import { createLogger } from '@redwoodjs/api/logger'

import {
  testSchema,
  testQuery,
  testErrorQuery,
  testParseErrorQuery,
  testFilteredQuery,
  testValidationErrorQuery,
} from '../__fixtures__/common'
import { createTestkit } from '../__fixtures__/envelop-testing'
import type { LoggerConfig } from '../useRedwoodLogger'
import { useRedwoodLogger } from '../useRedwoodLogger'

const watchFileCreated = (filename: string) => {
  return new Promise((resolve, reject) => {
    const TIMEOUT = 800
    const INTERVAL = 100
    const threshold = TIMEOUT / INTERVAL
    let counter = 0
    const interval = setInterval(() => {
      // On some CI runs file is created but not filled
      if (existsSync(filename) && statSync(filename).size !== 0) {
        clearInterval(interval)
        resolve(null)
      } else if (counter <= threshold) {
        counter++
      } else {
        clearInterval(interval)
        reject(new Error(`${filename} was not created.`))
      }
    }, INTERVAL)
  })
}

const parseLogFile = (logFile: string) => {
  const parsedLogFile = JSON.parse(
    `[${readFileSync(logFile)
      .toString()
      .trim()
      .split(/\r\n|\n/)
      .join(',')}]`,
  )

  return parsedLogFile
}

const setupLogger = (
  loggerOptions: LoggerOptions,
  destination: string,
): {
  logger: Logger
} => {
  const logger = createLogger({
    options: { ...loggerOptions },
    destination: destination,
  })

  return { logger }
}

describe('Populates context', () => {
  const logFile = join(
    os.tmpdir(),
    '_' + Math.random().toString(36).substring(2, 11),
  )

  const { logger } = setupLogger({ level: 'trace' }, logFile)

  it('Should log debug statements around GraphQL the execution phase', async () => {
    const loggerConfig = {
      logger,
      options: { data: true, query: true, operationName: true },
    } as LoggerConfig

    const testkit = createTestkit(
      [useEngine(GraphQLJS), useRedwoodLogger(loggerConfig)],
      testSchema,
    )

    await testkit.execute(testQuery, {}, {})

    await watchFileCreated(logFile)

    const logStatements = parseLogFile(logFile)

    const executionCompleted = logStatements.pop()
    const executionStarted = logStatements.pop()

    expect(executionStarted).toHaveProperty('level')
    expect(executionStarted).toHaveProperty('time')
    expect(executionStarted).toHaveProperty('msg')
    expect(executionStarted).toHaveProperty('query')

    expect(executionStarted.name).toEqual('graphql-server')
    expect(executionStarted.level).toEqual(20)
    expect(executionStarted.msg).toEqual('GraphQL execution started: meQuery')

    expect(executionCompleted).toHaveProperty('level')
    expect(executionCompleted).toHaveProperty('time')
    expect(executionCompleted).toHaveProperty('msg')
    expect(executionCompleted).toHaveProperty('query')
    expect(executionCompleted).toHaveProperty('operationName')
    expect(executionCompleted).toHaveProperty('data')

    expect(executionCompleted.msg).toEqual(
      'GraphQL execution completed: meQuery',
    )
    expect(executionCompleted.data).toHaveProperty('me')
    expect(executionCompleted.operationName).toEqual('meQuery')
    expect(executionCompleted.data.me.name).toEqual('Ba Zinga')
  })

  it('Should log an error when GraphQL the parsing phase fails', async () => {
    const loggerConfig = {
      logger,
      options: { data: true, query: true, operationName: true },
    } as LoggerConfig

    const testkit = createTestkit(
      [useEngine(GraphQLJS), useRedwoodLogger(loggerConfig)],
      testSchema,
    )

    await testkit.execute(testParseErrorQuery, {}, {})

    await watchFileCreated(logFile)

    const logStatements = parseLogFile(logFile)

    const lastStatement = logStatements.pop()

    expect(lastStatement.level).toEqual(50)

    expect(lastStatement).toHaveProperty('level')
    expect(lastStatement).toHaveProperty('time')
    expect(lastStatement).toHaveProperty('msg')
    expect(lastStatement.name).toEqual('graphql-server')

    expect(lastStatement.msg).toEqual(
      'Cannot query field "unknown_field" on type "User".',
    )
  })

  it('Should log an error when the GraphQL validation phase fails', async () => {
    const loggerConfig = {
      logger,
      options: { data: true, query: true, operationName: true },
    } as LoggerConfig

    const testkit = createTestkit(
      [useEngine(GraphQLJS), useRedwoodLogger(loggerConfig)],
      testSchema,
    )

    await testkit.execute(testValidationErrorQuery, {}, {})

    await watchFileCreated(logFile)

    const logStatements = parseLogFile(logFile)

    const lastStatement = logStatements.pop()

    expect(lastStatement.level).toEqual(50)

    expect(lastStatement).toHaveProperty('level')
    expect(lastStatement.name).toEqual('graphql-server')
    expect(lastStatement).toHaveProperty('time')

    expect(lastStatement).toHaveProperty('msg')
    expect(lastStatement.msg).toEqual(
      'Syntax Error: Expected "$", found Name "id".',
    )

    expect(lastStatement).toHaveProperty('err')
    expect(lastStatement.err).toHaveProperty('type')
    expect(lastStatement.err.type).toEqual('GraphQLError')
    expect(lastStatement.err.message).toEqual(
      'Syntax Error: Expected "$", found Name "id".',
    )
  })

  it('Should log an error when the resolver raises an exception', async () => {
    const loggerConfig = {
      logger,
      options: {},
    } as LoggerConfig

    const testkit = createTestkit(
      [useEngine(GraphQLJS), useRedwoodLogger(loggerConfig)],
      testSchema,
    )

    await testkit.execute(testErrorQuery, {}, {})

    await watchFileCreated(logFile)

    const logStatements = parseLogFile(logFile)

    const errorLogStatement = logStatements.pop()

    expect(errorLogStatement).toHaveProperty('level')
    expect(errorLogStatement).toHaveProperty('time')
    expect(errorLogStatement).toHaveProperty('msg')
    expect(errorLogStatement).toHaveProperty('err')

    expect(errorLogStatement.name).toEqual('graphql-server')
    expect(errorLogStatement.level).toEqual(50)
    expect(errorLogStatement.msg).toEqual('You are forbidden')
  })

  it('Should log an error with type and stack trace info when the resolver raises an exception', async () => {
    const loggerConfig = {
      logger,
      options: {},
    } as LoggerConfig

    const testkit = createTestkit(
      [useEngine(GraphQLJS), useRedwoodLogger(loggerConfig)],
      testSchema,
    )

    await testkit.execute(testErrorQuery, {}, {})

    await watchFileCreated(logFile)

    const logStatements = parseLogFile(logFile)

    const errorLogStatement = logStatements.pop()

    expect(errorLogStatement).toHaveProperty('err')
    expect(errorLogStatement.err).toHaveProperty('stack')
    expect(errorLogStatement.err.type).toEqual('GraphQLError')
    expect(errorLogStatement.err.path).toContain('forbiddenUser')
    expect(errorLogStatement.err.message).toEqual('You are forbidden')
  })

  it('Should not log filtered graphql operations', async () => {
    const loggerConfig = {
      logger,
      options: {
        excludeOperations: ['FilteredQuery'],
      },
    } as LoggerConfig
    const testkit = createTestkit(
      [useEngine(GraphQLJS), useRedwoodLogger(loggerConfig)],
      testSchema,
    )
    await testkit.execute(testFilteredQuery, {}, {})
    await watchFileCreated(logFile)

    const logStatements = parseLogFile(logFile)

    expect(logStatements).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: expect.stringContaining('FilteredQuery'),
        }),
      ]),
    )
  })
})
