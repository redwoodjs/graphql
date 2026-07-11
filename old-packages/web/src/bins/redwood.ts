#!/usr/bin/env node
import { createRequire } from 'module'

const requireFromCli = createRequire(
  require.resolve('@redwoodjs/cli/package.json'),
)

const bins = requireFromCli('./package.json')['bin']

// If this is defined, we're running through yarn and need to change the cwd.
// See https://yarnpkg.com/advanced/lifecycle-scripts/#environment-variables.
if (process.env.PROJECT_CWD) {
  process.chdir(process.env.PROJECT_CWD)
}

requireFromCli(bins['redwood'])
