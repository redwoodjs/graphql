import execa from 'execa'

import { getPaths } from '@redwoodjs/project-config'

export const apiServerFileHandler = async (argv) => {
  const args = ['node', 'server.js', '--apiRootPath', argv.apiRootPath]

  if (argv.port) {
    args.push('--apiPort', argv.port)
  }

  await execa('yarn', args, {
    cwd: getPaths().api.dist,
    stdio: 'inherit',
  })
}
