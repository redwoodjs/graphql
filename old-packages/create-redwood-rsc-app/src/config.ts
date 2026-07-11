import { ExitCodeError } from './error.js'

export interface Config {
  installationDir: string
  printVersion: boolean
  template: string
  verbose: boolean
}

export function initConfig() {
  const config: Config = {
    installationDir: '',
    printVersion: false,
    template: '',
    verbose: false,
  }

  const positionals: string[] = []

  const args = process.argv.slice(2)

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '--verbose' || arg === '-v') {
      config.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      console.log()
      console.log('--help is not implemented yet')
      console.log('PR welcome!')
      console.log()
      if (args.find((arg) => arg === '--verbose' || arg === '-v')) {
        console.log('Hidden flags:')
        console.log(
          '--npx: Used during development to simulate running from _npx/',
        )
        console.log(
          '--no-check-latest: Used when relaunching, to prevent infinite ' +
            'relauch loop',
        )
      }
    } else if (arg === '--version' || arg === '-V') {
      config.printVersion = true
    } else if (arg.startsWith('--template') || arg.startsWith('-t')) {
      // +2 because we do slice(2) above
      const templateIndex = i + 2

      if (process.argv[templateIndex].includes('=')) {
        config.template = process.argv[templateIndex].split('=')[1]
      } else if (
        process.argv[templateIndex + 1] &&
        !process.argv[templateIndex + 1].startsWith('-')
      ) {
        config.template = process.argv[templateIndex + 1]
        // skip looping over the next argument as we've already consumed it
        i++
      } else {
        throw new ExitCodeError(
          1,
          `Error: No template provided after ${arg} flag`,
        )
      }
    } else if (arg === '--npx') {
      // Do nothing. Intended for internal use only.
    } else if (arg === '--no-check-latest') {
      // Do nothing. Intended for internal use only.
    } else if (arg.startsWith('-')) {
      console.log('Unknown argument:', arg)
    } else {
      positionals.push(arg)
    }

    i++
  }

  if (positionals.length === 0 && !config.printVersion) {
    throw new ExitCodeError(1, 'Error: No installation directory provided')
  }

  config.installationDir = positionals[0]
  config.template ||= 'test-project-rsc-kitchen-sink'

  if (config.verbose) {
    console.log('process.argv', process.argv)
    console.log('config', config)
  }

  return config
}
