const { TestEnvironment } = require('jest-environment-jsdom')

// Due to issue: https://github.com/jsdom/jsdom/issues/2524
// Fix from: https://github.com/jsdom/jsdom/issues/2524#issuecomment-736672511
module.exports = class RedwoodWebJestEnv extends TestEnvironment {
  async setup() {
    await super.setup()
    if (typeof this.global.TextEncoder === 'undefined') {
      const { TextEncoder, TextDecoder } = require('util')
      this.global.TextEncoder = TextEncoder
      this.global.TextDecoder = TextDecoder
    }
    if (typeof this.global.crypto.subtle === 'undefined') {
      this.global.crypto.subtle = {} // To make tests work with auth that use WebCrypto like auth0
    }
  }
}
