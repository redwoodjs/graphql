import { trace as RW_OTEL_WRAPPER_TRACE } from '@opentelemetry/api'
import { PrismaClient } from '@prisma/client'
import { emitLogLevels, handlePrismaLogging } from '@redwoodjs/api/logger'
import { logger } from './logger'

/*
 * Instance of the Prisma Client
 */
export const db = new PrismaClient({
  log: emitLogLevels(['info', 'warn', 'error']),
})
handlePrismaLogging({
  db,
  logger,
  logLevels: ['info', 'warn', 'error'],
})