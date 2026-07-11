import execa from 'execa'

import { getPaths } from '@redwoodjs/project-config'

export const webSsrServerHandler = async (rscEnabled) => {
  await execa('yarn', ['rw-serve-fe'], {
    cwd: getPaths().web.base,
    stdio: 'inherit',
    shell: true,
    env: rscEnabled
      ? {
          // TODO (RSC): Is this how we want to do it? If so, we need to find a way
          // to merge this with users' NODE_OPTIONS
          NODE_OPTIONS: '--conditions react-server',
        }
      : undefined,
  })
}
