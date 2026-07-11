import path from 'path'

import pluginTester from 'babel-plugin-tester'
import { vi } from 'vitest'

import redwoodOtelWrappingPlugin from '../babel-plugin-redwood-otel-wrapping'

vi.mock('@redwoodjs/project-config', () => {
  return {
    getBaseDirFromFile: () => {
      return ''
    },
  }
})

pluginTester({
  plugin: redwoodOtelWrappingPlugin,
  pluginName: 'babel-plugin-redwood-otel-wrapping',
  fixtures: path.join(__dirname, '__fixtures__/otel-wrapping'),
})
