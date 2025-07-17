import { findUp } from './findUp.js'

const CONFIG_FILE_NAME = 'redwood.toml'

const getConfigPathCache = new Map<string, string>()

/**
 * Search the parent directories for the Redwood configuration file.
 */
export const getConfigPath = (
  cwd: string = process.env.RWJS_CWD ?? process.cwd(),
): string => {
  const cachedPath = getConfigPathCache.get(cwd)

  if (cachedPath) {
    return cachedPath
  }

  const configPath = findUp(CONFIG_FILE_NAME, cwd)

  if (!configPath) {
    throw new Error(
      `Could not find a "${CONFIG_FILE_NAME}" file, are you sure you're in a Redwood project?`,
    )
  }

  getConfigPathCache.set(cwd, configPath)

  return configPath
}
