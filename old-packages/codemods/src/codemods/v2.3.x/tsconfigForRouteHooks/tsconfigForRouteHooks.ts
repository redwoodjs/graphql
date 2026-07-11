import { getPaths } from '@redwoodjs/project-config'

import prettify from '../../../lib/prettify'

export default async function addApiAliasToTsConfig() {
  // Ts is a heavy import, lets do it dynamically
  const ts = await import('typescript')

  const webConfigPath = ts.findConfigFile(
    getPaths().web.base,
    ts.sys.fileExists,
  )

  if (!webConfigPath) {
    throw new Error(
      'Could not find tsconfig.json in your web side. Please follow release notes to update your config manually.',
    )
  }

  // Use this function, because tsconfigs can be JSONC (json with comments), but also can have trailing commas, etc.
  // Also why I'm not using jscodeshift here - sadly I can't preserve the comments
  const { config: webConfig } = ts.parseConfigFileTextToJson(
    webConfigPath,
    ts.sys.readFile(webConfigPath) as string, // If file exists, it has contents
  )

  if (webConfig?.compilerOptions) {
    const newPathAliases = {
      ...webConfig.compilerOptions.paths,
      '$api/*': ['../api/*'],
    }

    const updatedConfig = {
      ...webConfig,
      compilerOptions: {
        ...webConfig.compilerOptions,
        paths: newPathAliases,
      },
    }

    ts.sys.writeFile(
      webConfigPath,
      // @NOTE: prettier will remove trailing commas, but whatever
      await prettify(JSON.stringify(updatedConfig), { parser: 'json' }),
    )
  } else {
    throw new Error(
      'Could not read your web/tsconfig.json. Please follow release notes to update your config manually.',
    )
  }
}
