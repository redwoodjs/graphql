#!/usr/bin/env node
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requireFromInternal = createRequire(
  require.resolve('@redwoodjs/internal/package.json'),
)

const bins = requireFromInternal('./package.json')['bin']

requireFromInternal(bins['rw-gen-watch'])
