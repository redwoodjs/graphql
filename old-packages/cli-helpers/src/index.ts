// @WARN: This export is going to cause memory problems in the CLI.
// We need to split this into smaller packages, or use export aliasing (like in packages/testing/cache)

export * from './lib/index.js'
export * from './lib/colors.js'
export { loadEnvFiles } from './lib/loadEnvFiles.js'
export {
  loadDefaultEnvFiles,
  loadNodeEnvDerivedEnvFile,
  loadUserSpecifiedEnvFiles,
} from './lib/loadEnvFiles.js'
export * from './lib/paths.js'
export * from './lib/project.js'
export * from './lib/version.js'
export * from './auth/setupHelpers.js'
export type { AuthHandlerArgs } from './auth/setupHelpers.js'

export * from './lib/installHelpers.js'

export * from './telemetry/index.js'
