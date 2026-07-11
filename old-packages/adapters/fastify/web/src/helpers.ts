/** Ensures that `path` starts and ends with a slash ('/') */
export function coerceRootPath(path: string) {
  const prefix = !path.startsWith('/') ? '/' : ''
  const suffix = !path.endsWith('/') ? '/' : ''

  return `${prefix}${path}${suffix}`
}
