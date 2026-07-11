const { TestEnvironment } = require('jest-environment-node')

class RedwoodApiJestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context)
    this.testPath = context.testPath
  }

  async setup() {
    await super.setup()

    this.global.testPath = this.testPath
  }

  async teardown() {
    await super.teardown()
  }

  getVmContext() {
    return super.getVmContext()
  }

  // async handleTestEvent(event, state) {
  //   if (event.name === 'test_start') {
  //     // Link to event docs:
  //     // https://github.com/facebook/jest/blob/master/packages/jest-types/src/Circus.ts
  //   }
  // }
}

module.exports = RedwoodApiJestEnvironment
