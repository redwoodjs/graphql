import path from 'path'

import pluginTester from 'babel-plugin-tester'

import plugin from '../babel-plugin-redwood-remove-dev-fatal-error-page'

describe('babel plugin redwood remove dev fatal error page', () => {
  pluginTester({
    plugin,
    pluginName: 'babel-plugin-redwood-remove-dev-fatal-error-page',
    fixtures: path.join(__dirname, '__fixtures__/dev-fatal-error-page'),
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  })
})
