import concurrently from 'concurrently'
import { getHammerBaseDir } from '@hammerframework/hammer-core'

const Dev = () => {
  const baseDir = getHammerBaseDir()

  concurrently(
    [
      {
        command: `cd ${baseDir}/web && yarn webpack-dev-server --config ./config/webpack.dev.js`,
        name: 'web',
        prefixColor: 'yellow',
      },
      {
        command: `cd ${baseDir}/api && yarn hammer-dev-server`,
        name: 'api',
        prefixColor: 'green',
      },
    ],
    {
      prefix: 'name',
    }
  )
  return null
}

export const commandProps = {
  name: 'dev',
  alias: 'd',
  description: 'Launch api, web and prisma dev servers',
}

export default Dev
