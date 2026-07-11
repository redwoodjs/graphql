// @ts-check
const path = require('path')

const { getApiSideDefaultBabelConfig } = require('@redwoodjs/babel-config')
const { getPaths } = require('@redwoodjs/project-config')

const rwjsPaths = getPaths()
const NODE_MODULES_PATH = path.join(rwjsPaths.base, 'node_modules')
const { babelrc } = getApiSideDefaultBabelConfig()

/** @type {import('jest').Config} */
module.exports = {
  // To make sure other config option which depends on rootDir use
  // correct path, for example, coverageDirectory
  rootDir: rwjsPaths.base,
  roots: [path.join(rwjsPaths.api.src)],
  runner: path.join(__dirname, '../jest-serial-runner.js'),
  testEnvironment: path.join(__dirname, './RedwoodApiJestEnv.js'),
  globals: {
    __RWJS__TEST_IMPORTS: {
      apiSrcPath: rwjsPaths.api.src,
      tearDownCachePath: path.join(
        rwjsPaths.generated.base,
        'scenarioTeardown.json',
      ),
      dbSchemaPath: rwjsPaths.api.dbSchema,
    },
  },
  sandboxInjectedGlobals: ['__RWJS__TEST_IMPORTS'],
  displayName: {
    color: 'redBright',
    name: 'api',
  },
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: path.join(rwjsPaths.base, 'coverage'),
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  // This runs once before all tests
  globalSetup: path.join(__dirname, './globalSetup.js'),
  // Note this setup runs for each test file!
  setupFilesAfterEnv: [path.join(__dirname, './jest.setup.js')],
  moduleNameMapper: {
    // @NOTE: Import @redwoodjs/testing in api tests, and it automatically remaps to the api side only
    // This is to prevent web stuff leaking into api, and vice versa
    '^@redwoodjs/testing$': path.join(
      NODE_MODULES_PATH,
      '@redwoodjs/testing/api',
    ),
  },
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      // When jest runs tests in parallel, it serializes the config before passing down options to babel
      // that's why these must be serializable. So ideally, we should just pass reference to a
      // configFile or "extends" a config. But we need a few other option only at root level, so we'll pass
      //  here and remove those keys inside "extend"ed config.
      {
        babelrc, // babelrc can not reside inside "extend"ed config, that's why we have it here
        configFile: path.resolve(__dirname, './apiBabelConfig.js'),
      },
    ],
  },
  testPathIgnorePatterns: ['.scenarios.[jt]s$'],
}
