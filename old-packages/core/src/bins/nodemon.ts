#!/usr/bin/env node
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requireFromNodemon = createRequire(
  require.resolve('nodemon/package.json'),
)

const bins = requireFromNodemon('./package.json')['bin']

requireFromNodemon(bins['nodemon'])
