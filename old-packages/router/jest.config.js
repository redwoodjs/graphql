/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/*.test.+(ts|tsx|js|jsx)', '!**/__typetests__/*.ts'],
}
