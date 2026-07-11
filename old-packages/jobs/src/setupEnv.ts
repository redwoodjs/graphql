import { loadEnvFiles } from '@redwoodjs/cli-helpers/loadEnvFiles'

export const setupEnv = () => {
  loadEnvFiles()

  // If even after loading `.env` we find that `NODE_ENV` is `undefined` default
  // to `development` to mimic what the other CLI tools to
  if (process.env.NODE_ENV === undefined) {
    process.env.NODE_ENV = 'development'
  }
}
