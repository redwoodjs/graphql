import { getConfig } from '@redwoodjs/project-config'

export function getAPIHost() {
  let host = process.env.REDWOOD_API_HOST
  host ??= getConfig().api.host
  host ??= process.env.NODE_ENV === 'production' ? '0.0.0.0' : '::'
  return host
}

export function getAPIPort() {
  return process.env.REDWOOD_API_PORT
    ? parseInt(process.env.REDWOOD_API_PORT)
    : getConfig().api.port
}

export function getWebHost() {
  let host = process.env.REDWOOD_WEB_HOST
  host ??= getConfig().web.host
  host ??= process.env.NODE_ENV === 'production' ? '0.0.0.0' : '::'
  return host
}

export function getWebPort() {
  return process.env.REDWOOD_WEB_PORT
    ? parseInt(process.env.REDWOOD_WEB_PORT)
    : getConfig().web.port
}
