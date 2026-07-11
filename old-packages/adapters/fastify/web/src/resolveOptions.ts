import { getConfig } from '@redwoodjs/project-config'

import type { RedwoodFastifyWebOptions } from './types'

export function resolveOptions(options: RedwoodFastifyWebOptions) {
  const redwoodOptions = options.redwood ?? {}
  const flags = {
    shouldRegisterApiUrl: false,
  }

  redwoodOptions.apiUrl ??= getConfig().web.apiUrl
  const apiUrlIsFullyQualifiedUrl = isFullyQualifiedUrl(redwoodOptions.apiUrl)

  // `apiHost` is deprecated. If it's set and `apiProxyTarget` isn't, we'll use it as `apiProxyTarget`.
  if (redwoodOptions.apiHost && !redwoodOptions.apiProxyTarget) {
    redwoodOptions.apiProxyTarget = redwoodOptions.apiHost
    delete redwoodOptions.apiHost
  }

  if (redwoodOptions.apiUrl.trim() === '') {
    throw new Error(`\`apiUrl\` cannot be an empty string`)
  }

  if (
    redwoodOptions.apiProxyTarget &&
    !isFullyQualifiedUrl(redwoodOptions.apiProxyTarget)
  ) {
    throw new Error(
      `If you provide \`apiProxyTarget\`, it has to be a fully-qualified URL. \`apiProxyTarget\` is '${redwoodOptions.apiProxyTarget}'`,
    )
  }

  // If users don't supply `apiUrl` but do supply `apiProxyTarget`, error.
  // We don't have a prefix to use as the starting point of a proxy.
  //
  // ```js
  // {
  //   apiUrl: undefined,
  //   apiProxyTarget: 'http://api.bar.com'
  // }
  // ```
  //
  // This is pretty unlikely because we default `apiUrl` to '/.redwood/functions'
  if (!redwoodOptions.apiUrl && redwoodOptions.apiProxyTarget) {
    throw new Error(
      `If you provide \`apiProxyTarget\`, \`apiUrl\` has to be a relative URL. \`apiUrl\` is '${redwoodOptions.apiUrl}'`,
    )
  }

  // If users supply a fully-qualified `apiUrl` and `apiProxyTarget`, error.
  // We don't have a prefix to use as the starting point of a proxy.
  //
  // ```js
  // {
  //   apiUrl: 'http://api.foo.com', // This isn't a prefix we can forward requests from
  //   apiProxyTarget: 'http://api.bar.com'
  // }
  // ```
  if (apiUrlIsFullyQualifiedUrl && redwoodOptions.apiProxyTarget) {
    throw new Error(
      `If you provide \`apiProxyTarget\`, \`apiUrl\` cannot be a fully-qualified URL. \`apiUrl\` is '${redwoodOptions.apiUrl}'`,
    )
  }

  // If users supply a relative `apiUrl` but don't supply `apiProxyTarget`, error.
  // There's nowhere to proxy to.
  //
  // ```js
  // {
  //   apiUrl: '/api',
  //   apiProxyTarget: undefined // There's nowhere for requests to '/api' to go
  // }
  // ```
  if (!apiUrlIsFullyQualifiedUrl && !redwoodOptions.apiProxyTarget) {
    flags.shouldRegisterApiUrl = true
  }

  return { redwoodOptions, flags }
}

function isFullyQualifiedUrl(url: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(url)
    return true
  } catch {
    return false
  }
}
