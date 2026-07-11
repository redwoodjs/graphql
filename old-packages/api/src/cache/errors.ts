export class CacheTimeoutError extends Error {
  constructor() {
    super('Timed out waiting for response from the cache server')
    this.name = 'CacheTimeoutError'
  }
}
