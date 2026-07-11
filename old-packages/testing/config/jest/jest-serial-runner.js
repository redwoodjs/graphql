// Originally from https://github.com/gabrieli/jest-serial-runner/blob/master/index.js
// with fixed module export

const TestRunner = require('jest-runner').default

class SerialRunner extends TestRunner {
  constructor(...attr) {
    super(...attr)
    this.isSerial = true
  }
}

module.exports = SerialRunner
