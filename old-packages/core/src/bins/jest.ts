#!/usr/bin/env node
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requireFromJest = createRequire(require.resolve('jest/package.json'))

const bin = requireFromJest('./package.json')['bin']

requireFromJest(bin)
