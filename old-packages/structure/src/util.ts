export function validateRoutePath(path: string) {
  // copied from https://github.com/redwoodjs/redwood/blob/master/packages/router/src/util.js
  // Check that path begins with a slash.
  if (!path.startsWith('/')) {
    throw new Error(`Route path does not begin with a slash: "${path}"`)
  }

  if (path.includes(' ')) {
    throw new Error(`Route path contains spaces: "${path}"`)
  }

  // Check for duplicate named params.
  const matches = path.matchAll(/\{([^}]+)\}/g)
  const memo: any = {}
  for (const match of matches) {
    // Extract the param's name to make sure there aren't any duplicates
    const param = match[1].split(':')[0]
    if (memo[param]) {
      throw new Error(`Route path contains duplicate parameter: "${path}"`)
    } else {
      memo[param] = true
    }
  }
}
