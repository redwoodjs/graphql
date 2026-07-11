import '../../lib/mockTelemetry'

vi.mock('concurrently', () => ({
  __esModule: true, // this property makes it work
  default: vi.fn().mockReturnValue({
    result: {
      catch: () => {},
    },
  }),
}))

// dev checks for existence of api/src and web/src folders
vi.mock('fs-extra', async () => {
  const actualFs = await vi.importActual('fs-extra')
  return {
    default: {
      ...actualFs,
      readFileSync: () => 'File content',
      existsSync: () => true,
    },
  }
})

vi.mock('@redwoodjs/internal/dist/dev', () => {
  return {
    shutdownPort: vi.fn(),
  }
})

vi.mock('@redwoodjs/project-config', async () => {
  const actualProjectConfig = await vi.importActual('@redwoodjs/project-config')

  return {
    getConfig: vi.fn(),
    getConfigPath: () => '/mocked/project/redwood.toml',
    resolveFile: actualProjectConfig.resolveFile,
    getPaths: () => {
      return {
        api: {
          base: '/mocked/project/api',
          src: '/mocked/project/api/src',
          dist: '/mocked/project/api/dist',
        },
        web: {
          base: '/mocked/project/web',
          dist: '/mocked/project/web/dist',
        },
        generated: {
          base: '/mocked/project/.redwood',
        },
      }
    },
  }
})

vi.mock('../../lib/generatePrismaClient', () => {
  return {
    generatePrismaClient: vi.fn().mockResolvedValue(true),
  }
})

vi.mock('../../lib/ports', () => {
  return {
    // We're not actually going to use the port, so it's fine to just say it's
    // free. It prevents the tests from failing if the ports are already in use
    // (probably by some external `yarn rw dev` process)
    getFreePort: (port) => port,
  }
})

import concurrently from 'concurrently'
import { find } from 'lodash'
import { vi, describe, afterEach, it, expect } from 'vitest'

import { getConfig } from '@redwoodjs/project-config'

import { generatePrismaClient } from '../../lib/generatePrismaClient'
import { handler } from '../dev'

describe('yarn rw dev', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('Should run api and web dev servers, and generator watcher by default', async () => {
    getConfig.mockReturnValue({
      web: {
        port: 8910,
      },
      api: {
        port: 8911,
        debugPort: 18911,
      },
      experimental: {
        streamingSsr: {
          enabled: false,
        },
      },
    })

    await handler({
      side: ['api', 'web'],
    })

    expect(generatePrismaClient).toHaveBeenCalledTimes(1)
    const concurrentlyArgs = concurrently.mock.lastCall[0]

    const webCommand = find(concurrentlyArgs, { name: 'web' })
    const apiCommand = find(concurrentlyArgs, { name: 'api' })
    const generateCommand = find(concurrentlyArgs, { name: 'gen' })

    // Uses absolute path, so not doing a snapshot
    expect(webCommand.command).toContain(
      'yarn cross-env NODE_ENV=development rw-vite-dev',
    )

    expect(
      apiCommand.command
        .replace(/\s+/g, ' ')
        // Remove the --max-old-space-size flag, as it's not consistent across
        // test environments (vite sets this in their vite-ecosystem-ci tests)
        .replace(/--max-old-space-size=\d+\s/, ''),
    ).toEqual(
      'yarn nodemon --quiet --watch "/mocked/project/redwood.toml" --exec "yarn rw-api-server-watch --port 8911 --debug-port 18911 | rw-log-formatter"',
    )
    expect(apiCommand.env.NODE_ENV).toEqual('development')
    expect(apiCommand.env.NODE_OPTIONS).toContain('--enable-source-maps')

    expect(generateCommand.command).toEqual('yarn rw-gen-watch')
  })

  it('Should run api and FE dev server, when streaming experimental flag enabled', async () => {
    getConfig.mockReturnValue({
      web: {
        port: 8910,
      },
      api: {
        port: 8911,
        debugPort: 18911,
      },
      experimental: {
        streamingSsr: {
          enabled: true, // <-- enable SSR/Streaming
        },
      },
    })

    await handler({
      side: ['api', 'web'],
    })

    expect(generatePrismaClient).toHaveBeenCalledTimes(1)
    const concurrentlyArgs = concurrently.mock.lastCall[0]

    const webCommand = find(concurrentlyArgs, { name: 'web' })
    const apiCommand = find(concurrentlyArgs, { name: 'api' })
    const generateCommand = find(concurrentlyArgs, { name: 'gen' })

    // Uses absolute path, so not doing a snapshot
    expect(webCommand.command).toContain(
      'yarn cross-env NODE_ENV=development rw-dev-fe',
    )

    expect(
      apiCommand.command
        .replace(/\s+/g, ' ')
        // Remove the --max-old-space-size flag, as it's not consistent across
        // test environments (vite sets this in their vite-ecosystem-ci tests)
        .replace(/--max-old-space-size=\d+\s/, ''),
    ).toEqual(
      'yarn nodemon --quiet --watch "/mocked/project/redwood.toml" --exec "yarn rw-api-server-watch --port 8911 --debug-port 18911 | rw-log-formatter"',
    )
    expect(apiCommand.env.NODE_ENV).toEqual('development')
    expect(apiCommand.env.NODE_OPTIONS).toContain('--enable-source-maps')

    expect(generateCommand.command).toEqual('yarn rw-gen-watch')
  })

  it('Debug port passed in command line overrides TOML', async () => {
    getConfig.mockReturnValue({
      web: {
        port: 8910,
      },
      api: {
        port: 8911,
        debugPort: 505050,
      },
      experimental: {
        streamingSsr: {
          enabled: false,
        },
      },
    })

    await handler({
      side: ['api'],
      apiDebugPort: 90909090,
    })

    const concurrentlyArgs = concurrently.mock.lastCall[0]

    const apiCommand = find(concurrentlyArgs, { name: 'api' })

    expect(apiCommand.command.replace(/\s+/g, ' ')).toContain(
      'yarn rw-api-server-watch --port 8911 --debug-port 90909090',
    )
  })

  it('Can disable debugger by setting toml to false', async () => {
    getConfig.mockReturnValue({
      web: {
        port: 8910,
      },
      api: {
        port: 8911,
        debugPort: false,
      },
      experimental: {
        streamingSsr: {
          enabled: false,
        },
      },
    })

    await handler({
      side: ['api'],
    })

    const concurrentlyArgs = concurrently.mock.lastCall[0]

    const apiCommand = find(concurrentlyArgs, { name: 'api' })

    expect(apiCommand.command).not.toContain('--debug-port')
  })
})
