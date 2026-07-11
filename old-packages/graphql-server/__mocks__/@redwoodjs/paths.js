import path from 'path'

const BASE_PATH = path.resolve(__dirname, '../../src/__tests__/fixtures')

const originalPaths = require('@redwoodjs/project-config')

const mockedGetPaths = () => ({
  base: BASE_PATH,
  api: {
    src: path.resolve(BASE_PATH, './api/src'),
    services: path.resolve(BASE_PATH, './api/src/services'),
    graphql: path.resolve(BASE_PATH, './api/src/graphql'),
  },
})

module.exports = {
  ...originalPaths,
  getPaths: mockedGetPaths,
}
