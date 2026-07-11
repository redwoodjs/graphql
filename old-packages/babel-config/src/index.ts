// The excess of exports here is for backwards compatibility
// since `@redwoodjs/internal` exported everything from babel/api, web, and common.
// See https://github.com/redwoodjs/redwood/blob/44b4a9023ac3a14b5f56b071052bdf49c410bb8b/packages/internal/src/index.ts#L13-L16.

export {
  BABEL_PLUGIN_TRANSFORM_RUNTIME_OPTIONS,
  TARGETS_NODE,
  getApiSideBabelConfigPath,
  getApiSideBabelPlugins,
  getApiSideBabelPresets,
  getApiSideDefaultBabelConfig,
  registerApiSideBabelHook,
  transformWithBabel,
} from './api'

export {
  getWebSideBabelConfigPath,
  getWebSideBabelPlugins,
  getWebSideBabelPresets,
  getWebSideDefaultBabelConfig,
  getWebSideOverrides,
  registerWebSideBabelHook,
} from './web'

export type { Flags } from './web'

export {
  CORE_JS_VERSION,
  RUNTIME_CORE_JS_VERSION,
  getCommonPlugins,
  getPathsFromTypeScriptConfig as getPathsFromConfig,
  getRouteHookBabelPlugins,
  parseTypeScriptConfigFiles,
  registerBabel,
} from './common'
