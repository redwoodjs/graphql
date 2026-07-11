const {
  getApiSideDefaultBabelConfig,
  getApiSideBabelPresets,
  getApiSideBabelPlugins,
} = require('@redwoodjs/babel-config')

// Since configFile and babelrc is already passed a level up, cleaning up these keys here.
// babelrc can not reside inside "extend"ed
// Ref: packages/testing/config/jest/api/index.js
const { babelrc: _b, ...defaultBabelConfig } = getApiSideDefaultBabelConfig()

module.exports = {
  ...defaultBabelConfig,
  plugins: getApiSideBabelPlugins({ forJest: true }),
  presets: getApiSideBabelPresets({
    presetEnv: true, // jest needs code transpiled
  }),
}
