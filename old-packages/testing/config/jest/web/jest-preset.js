const path = require('path')

const { getPaths } = require('@redwoodjs/project-config')

const rwjsPaths = getPaths()
const NODE_MODULES_PATH = path.join(rwjsPaths.base, 'node_modules')

/** @type {import('jest').Config} */
module.exports = {
  // To make sure other config option which depends on rootDir always
  // use correct path, for example, coverageDirectory
  rootDir: rwjsPaths.base,
  roots: [path.join(rwjsPaths.web.src)],
  testEnvironment: path.join(__dirname, './RedwoodWebJestEnv.js'),
  displayName: {
    color: 'blueBright',
    name: 'web',
  },
  globals: {
    __RWJS_TESTROOT_DIR: path.join(rwjsPaths.web.src), // used in jest setup to load mocks
    RWJS_ENV: {
      RWJS_API_URL: '',
      RWJS_API_GRAPHQL_URL: '/',
      __REDWOOD__APP_TITLE: 'Redwood App',
    },
    RWJS_DEBUG_ENV: {
      RWJS_SRC_ROOT: rwjsPaths.web.src,
    },
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
  setupFilesAfterEnv: [path.resolve(__dirname, './jest.setup.js')],
  moduleNameMapper: {
    /**
     * Make sure modules that require different versions of these
     * dependencies end up using the same one.
     */
    '^react$': path.join(NODE_MODULES_PATH, 'react'),
    '^react-dom$': path.join(NODE_MODULES_PATH, 'react-dom'),
    '^@apollo/client/react$': path.join(
      NODE_MODULES_PATH,
      '@apollo/client/react',
    ),
    // We replace imports to "@redwoodjs/router" with our own "mock" implementation.
    '^@redwoodjs/router$': path.join(
      NODE_MODULES_PATH,
      '@redwoodjs/testing/dist/web/MockRouter.js',
    ),
    '^@redwoodjs/web$': path.join(NODE_MODULES_PATH, '@redwoodjs/web/dist/cjs'),

    // This allows us to mock `createAuthentication` which is used by auth
    // clients, which in turn lets us mock `useAuth` in tests
    '^@redwoodjs/auth$': path.join(
      NODE_MODULES_PATH,
      '@redwoodjs/testing/dist/web/mockAuth.js',
    ),

    // @NOTE: Import @redwoodjs/testing in web tests, and it automatically remaps to the web side only
    // This is to prevent web stuff leaking into api, and vice versa
    '^@redwoodjs/testing$': path.join(
      NODE_MODULES_PATH,
      '@redwoodjs/testing/web',
    ),
    '~__REDWOOD__USER_ROUTES_FOR_MOCK': rwjsPaths.web.routes,
    '~__REDWOOD__USER_AUTH_FOR_MOCK': path.join(rwjsPaths.web.src, 'auth'),
    /**
     * Mock out files that aren't particularly useful in tests. See fileMock.js for more info.
     */
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|css)$':
      '@redwoodjs/testing/dist/web/fileMock.js',
  },
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      // When jest runs tests in parallel, it serializes the config before passing down options to babel
      // that's why these must be serializable. Passing the reference to a config instead.
      {
        configFile: path.resolve(__dirname, './webBabelConfig.js'),
      },
    ],
  },
  resolver: path.resolve(__dirname, './resolver.js'),
  testPathIgnorePatterns: ['.(stories|mock).[jt]sx?$'],
}
