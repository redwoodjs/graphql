#!/usr/bin/env node
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requireFromCli = createRequire(
  require.resolve('@redwoodjs/cli/package.json'),
)

const bins = requireFromCli('./package.json')['bin']

requireFromCli(bins['rwfw'])
