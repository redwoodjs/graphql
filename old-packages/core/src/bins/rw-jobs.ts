#!/usr/bin/env node
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const requireFromRwJobs = createRequire(
  require.resolve('@redwoodjs/jobs/package.json'),
)

const bins = requireFromRwJobs('./package.json')['bin']

requireFromRwJobs(bins['rw-jobs'])
