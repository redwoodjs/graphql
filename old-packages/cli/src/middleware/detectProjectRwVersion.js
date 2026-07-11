import { getInstalledRedwoodVersion } from '../lib'

const detectRwVersion = (argv) => {
  if (!argv.rwVersion) {
    return {
      rwVersion: getInstalledRedwoodVersion(),
    }
  }
  return {}
}

export default detectRwVersion
