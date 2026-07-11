import type { PluginOption } from 'vite'

type ModulesToExclude = { id: RegExp }[]

/**
 *
 * This is a vite plugin to remove modules from the bundle.
 *
 * Only applies on build, not on dev.
 *
 */
export function removeFromBundle(
  modulesToExclude: ModulesToExclude,
  exportNames?: string[],
): PluginOption {
  const isMissingIdToExclude = modulesToExclude.some(
    (module) => module.id === undefined,
  )

  if (isMissingIdToExclude) {
    throw new Error('You must specify an id to exclude')
  }

  return {
    name: 'remove-from-bundle',
    apply: 'build', // <-- @MARK important
    load: (id) => {
      return excludeOnMatch(modulesToExclude, id, exportNames)
    },
  }
}

function generateModuleWithExports(exportNames: string[]) {
  return {
    code: `export default {}; ${exportNames.map((name) => `export const ${name} = undefined;`).join('\n')}`,
  }
}

export function excludeOnMatch(
  modulesToExclude: ModulesToExclude,
  id: string,
  exportNames: string[] = [],
) {
  if (modulesToExclude.some((module) => module.id.test(id))) {
    return generateModuleWithExports(exportNames)
  }

  // Fallback to regular loaders
  return null
}
