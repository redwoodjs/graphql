export class RedwoodError extends Error {
  extensions: Record<string, any> | undefined
  constructor(message: string, extensions?: Record<string, any>) {
    super(message)
    this.name = 'RedwoodError'
    this.extensions = {
      ...extensions,
      code: extensions?.code || 'REDWOODJS_ERROR',
    }
  }
}
