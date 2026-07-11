import execa from 'execa'

import { getPaths } from '../lib/index'

export const handler = async ({
  _,
  $0: _rw,
  commands: _commands,
  ...options
}) => {
  const args = [_.pop()]

  for (const [name, value] of Object.entries(options)) {
    // Allow both long and short form commands, e.g. --name and -n
    args.push(name.length > 1 ? `--${name}` : `-${name}`)
    args.push(value)
  }

  let command = `yarn rw-jobs ${args.join(' ')}`
  const originalLogLevel = process.env.LOG_LEVEL
  process.env.LOG_LEVEL = originalLogLevel || 'warn'

  // make logs look nice in development (assume any env that's not prod is dev)
  // that includes showing more verbose logs unless the user set otherwise
  if (process.env.NODE_ENV !== 'production') {
    command += ' | yarn rw-log-formatter'
    process.env.LOG_LEVEL = originalLogLevel || 'debug'
  }

  execa.commandSync(command, {
    shell: true,
    cwd: getPaths().base,
    stdio: 'inherit',
    cleanup: true,
  })
}
