// This the Redwood root jest config
// Each side, e.g. ./web/ and ./api/ has specific config that references this root
// More info at https://redwoodjs.com/docs/project-configuration-dev-test-build

module.exports = {
  rootDir: '.',
  projects: ['<rootDir>/{*,!(node_modules)/**/}/jest.config.js'],
}
