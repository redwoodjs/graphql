export class PrerenderGqlError {
  message: string
  stack: string

  constructor(message: string) {
    this.message = 'GQL error: ' + message
    // The stacktrace would just point to this file, which isn't helpful,
    // because that's not where the error is. So we're just putting the
    // message there as well
    this.stack = this.message
  }
}

export class GqlHandlerNotFoundError {
  message: string
  stack: string

  constructor(message: string) {
    this.message = 'Bazinga:  ' + message
    // The stacktrace would just point to this file, which isn't helpful,
    // because that's not where the error is. So we're just putting the
    // message there as well
    this.stack = this.message
  }
}
