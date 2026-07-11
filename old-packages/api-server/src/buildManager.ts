import { debounce } from 'lodash'

export type BuildAndRestartOptions = {
  rebuild?: boolean
  clean?: boolean
}

class BuildManager {
  private shouldRebuild: boolean
  private shouldClean: boolean
  private debouncedBuild: ReturnType<typeof debounce>
  private buildFn: (options: BuildAndRestartOptions) => Promise<void>

  constructor(buildFn: (options: BuildAndRestartOptions) => Promise<void>) {
    this.shouldRebuild = true
    this.shouldClean = false
    this.buildFn = buildFn
    this.debouncedBuild = debounce(
      async (options: BuildAndRestartOptions) => {
        // Use flags with higher precedence to determine if we should rebuild or clean
        try {
          await this.buildFn({
            ...options,
            rebuild: this.shouldRebuild,
            clean: this.shouldClean,
          })
        } finally {
          this.shouldRebuild = true
          this.shouldClean = false
        }
      },
      // We want to delay execution when multiple files are modified on the filesystem,
      // this usually happens when running RedwoodJS generator commands.
      // Local writes are very fast, but writes in e2e environments are not,
      // so allow the default to be adjusted with an env-var.
      //
      process.env.RWJS_DELAY_RESTART
        ? parseInt(process.env.RWJS_DELAY_RESTART, 10)
        : 500,
    )
  }

  // Wrapper method to handle options and set precedence flags.
  // If we ever see a `rebuild: false` option while debouncing, we never want to rebuild.
  // If we ever see a `clean: true` option, we always want to clean.
  async run(options: BuildAndRestartOptions) {
    if (options.rebuild === false) {
      this.shouldRebuild = false
    }
    if (options.clean) {
      this.shouldClean = true
    }

    await this.debouncedBuild(options)
  }

  cancelScheduledBuild() {
    this.debouncedBuild.cancel()
  }
}

export { BuildManager }
