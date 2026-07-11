export default abstract class BaseClient {
  constructor() {}

  // if your client won't automatically reconnect, implement this function
  // to do it manually
  disconnect?(): void | Promise<void>

  abstract connect(): void | Promise<void>

  // Gets a value from the cache
  abstract get(key: string): any

  // Sets a value in the cache. The return value will not be used.
  abstract set(
    key: string,
    value: unknown,
    options: { expires?: number },
  ): Promise<any> | any // types are tightened in the child classes

  // Removes a value by its key
  abstract del(key: string): Promise<boolean> | any
}
