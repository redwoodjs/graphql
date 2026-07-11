import type { LoggingFunction, RollupLog } from 'rollup'

// Upstream issue: https://github.com/rollup/rollup/issues/4699
export function onWarn(warning: RollupLog, defaultHandler: LoggingFunction) {
  const fileName = warning.loc?.file

  if (
    warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
    /"use (client|server)"/.test(warning.message)
  ) {
    return
  } else if (
    warning.code === 'SOURCEMAP_ERROR' &&
    (fileName?.endsWith('.tsx') || fileName?.endsWith('.ts')) &&
    warning.loc?.column === 0 &&
    warning.loc?.line === 1
  ) {
    return
  }

  defaultHandler(warning)
}
