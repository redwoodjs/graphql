#!/usr/bin/env node
import { createRequire } from 'module'

const requireFromTypeScript = createRequire(
  require.resolve('typescript/package.json'),
)

const bins = requireFromTypeScript('./package.json')['bin']

requireFromTypeScript(bins['tsc'])
