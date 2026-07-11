#!/usr/bin/env node
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requireFromESLint = createRequire(require.resolve('eslint/package.json'))

const bins = requireFromESLint('./package.json')['bin']

requireFromESLint(bins['eslint'])
