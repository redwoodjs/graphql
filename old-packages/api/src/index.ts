export * from './auth'
export * from './errors'
export * from './validations/validations'
export * from './validations/errors'

export * from './types'

export * from './transforms'
export * from './cors'
export * from './event'

// @NOTE: use require, to avoid messing around with tsconfig and nested output dirs
const packageJson = require('../package.json')
export const prismaVersion = packageJson?.dependencies['@prisma/client']
export const redwoodVersion = packageJson?.version
