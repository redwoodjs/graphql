import { describe, expect, it } from 'vitest'
import { $ } from 'zx'

import { rw, rwServer } from './vitest.setup.mjs'

describe('rw serve', () => {
  it('has help configured', async () => {
    const { stdout } = await $`yarn node ${rw} serve --help`
    expect(stdout).toMatchInlineSnapshot(`
      "rw serve [side]

      Start a server for serving both the api and web sides

      Commands:
        rw serve      Start a server for serving the api and web sides       [default]
        rw serve api  Start a server for serving the api side
        rw serve web  Start a server for serving the web side

      Options:
            --cwd                                 Working directory to use (where
                                                  \`redwood.toml\` is located)
            --load-env-files                      Load additional .env files. Values
                                                  defined in files specified later
                                                  override earlier ones.       [array]
            --telemetry                           Whether to send anonymous usage
                                                  telemetry to RedwoodJS     [boolean]
            --version                             Show version number        [boolean]
            --webPort, --web-port                 The port for the web server to
                                                  listen on                   [number]
            --webHost, --web-host                 The host for the web server to
                                                  listen on. Note that you most likely
                                                  want this to be '0.0.0.0' in
                                                  production                  [string]
            --apiPort, --api-port                 The port for the api server to
                                                  listen on                   [number]
            --apiHost, --api-host                 The host for the api server to
                                                  listen on. Note that you most likely
                                                  want this to be '0.0.0.0' in
                                                  production                  [string]
            --apiRootPath, --api-root-path,       Root path where your api functions
            --rootPath, --root-path               are served   [string] [default: "/"]
        -h, --help                                Show help                  [boolean]

      Also see the Redwood CLI Reference
      (https://redwoodjs.com/docs/cli-commands#serve)
      "
    `)
  })

  it('errors out on unknown args', async () => {
    try {
      await $`yarn node ${rw} serve --foo --bar --baz`
      expect(true).toEqual(false)
    } catch (p) {
      expect(p.exitCode).toEqual(1)
      expect(p.stdout).toEqual('')
      expect(p.stderr).toMatchInlineSnapshot(`
        "rw serve [side]

        Start a server for serving both the api and web sides

        Commands:
          rw serve      Start a server for serving the api and web sides       [default]
          rw serve api  Start a server for serving the api side
          rw serve web  Start a server for serving the web side

        Options:
              --cwd                                 Working directory to use (where
                                                    \`redwood.toml\` is located)
              --load-env-files                      Load additional .env files. Values
                                                    defined in files specified later
                                                    override earlier ones.       [array]
              --telemetry                           Whether to send anonymous usage
                                                    telemetry to RedwoodJS     [boolean]
              --version                             Show version number        [boolean]
              --webPort, --web-port                 The port for the web server to
                                                    listen on                   [number]
              --webHost, --web-host                 The host for the web server to
                                                    listen on. Note that you most likely
                                                    want this to be '0.0.0.0' in
                                                    production                  [string]
              --apiPort, --api-port                 The port for the api server to
                                                    listen on                   [number]
              --apiHost, --api-host                 The host for the api server to
                                                    listen on. Note that you most likely
                                                    want this to be '0.0.0.0' in
                                                    production                  [string]
              --apiRootPath, --api-root-path,       Root path where your api functions
              --rootPath, --root-path               are served   [string] [default: "/"]
          -h, --help                                Show help                  [boolean]

        Also see the Redwood CLI Reference
        (https://redwoodjs.com/docs/cli-commands#serve)

        Unknown arguments: foo, bar, baz
        "
      `)
    }
  })
})

describe('rwServer', () => {
  it('has help configured', async () => {
    const { stdout } = await $`yarn node ${rwServer} --help`
    expect(stdout).toMatchInlineSnapshot(`
      "rw-server

      Start a server for serving the api and web sides

      Commands:
        rw-server      Start a server for serving the api and web sides      [default]
        rw-server api  Start a server for serving the api side
        rw-server web  Start a server for serving the web side

      Options:
            --webPort, --web-port                 The port for the web server to
                                                  listen on                   [number]
            --webHost, --web-host                 The host for the web server to
                                                  listen on. Note that you most likely
                                                  want this to be '0.0.0.0' in
                                                  production                  [string]
            --apiPort, --api-port                 The port for the api server to
                                                  listen on                   [number]
            --apiHost, --api-host                 The host for the api server to
                                                  listen on. Note that you most likely
                                                  want this to be '0.0.0.0' in
                                                  production                  [string]
            --apiRootPath, --api-root-path,       Root path where your api functions
            --rootPath, --root-path               are served   [string] [default: "/"]
        -h, --help                                Show help                  [boolean]
        -v, --version                             Show version number        [boolean]
      "
    `)
  })

  it('errors out on unknown args', async () => {
    try {
      await $`yarn node ${rwServer} --foo --bar --baz`
      expect(true).toEqual(false)
    } catch (p) {
      expect(p.exitCode).toEqual(1)
      expect(p.stdout).toEqual('')
      expect(p.stderr).toMatchInlineSnapshot(`
        "rw-server

        Start a server for serving the api and web sides

        Commands:
          rw-server      Start a server for serving the api and web sides      [default]
          rw-server api  Start a server for serving the api side
          rw-server web  Start a server for serving the web side

        Options:
              --webPort, --web-port                 The port for the web server to
                                                    listen on                   [number]
              --webHost, --web-host                 The host for the web server to
                                                    listen on. Note that you most likely
                                                    want this to be '0.0.0.0' in
                                                    production                  [string]
              --apiPort, --api-port                 The port for the api server to
                                                    listen on                   [number]
              --apiHost, --api-host                 The host for the api server to
                                                    listen on. Note that you most likely
                                                    want this to be '0.0.0.0' in
                                                    production                  [string]
              --apiRootPath, --api-root-path,       Root path where your api functions
              --rootPath, --root-path               are served   [string] [default: "/"]
          -h, --help                                Show help                  [boolean]
          -v, --version                             Show version number        [boolean]

        Unknown arguments: foo, bar, baz
        "
      `)
    }
  })
})
