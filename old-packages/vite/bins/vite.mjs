#!/usr/bin/env node
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const vitePath = require.resolve('vite/package.json')
const requireFromVite = createRequire(vitePath)

const bins = requireFromVite('./package.json')['bin']

// @MARK: This is temporary hack, speak to Dom about this...
// What is the correct way to proxy a bin with yarn 3 when its a ES module?
import(`${vitePath.replace('package.json', '')}/${bins['vite']}`)
