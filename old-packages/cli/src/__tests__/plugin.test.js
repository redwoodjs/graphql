import { vol } from 'memfs'
import {
  vi,
  describe,
  beforeEach,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from 'vitest'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { getConfig, getPaths } from '@redwoodjs/project-config'

import * as pluginLib from '../lib/plugin'
import { loadPlugins } from '../plugin'

vi.mock('fs-extra')
vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  return {
    ...originalProjectConfig,
    getPaths: vi.fn(),
    getConfig: vi.fn(),
  }
})
vi.mock('../lib/packages', () => {
  return {
    installModule: vi.fn(),
    isModuleInstalled: vi.fn().mockReturnValue(true),
  }
})

function getMockYargsInstance() {
  return yargs(hideBin(process.argv))
    .scriptName('rw')
    .command({
      command: 'built-in',
      description: 'Some builtin command',
      aliases: ['bi', 'builtIn'],
    })
    .exitProcess(false)
}

describe('command information caching', () => {
  beforeEach(() => {
    getPaths.mockReturnValue({
      generated: {
        base: '',
      },
    })
  })

  test('returns the correct cache when no local cache exists', () => {
    const cache = pluginLib.loadCommandCache()
    expect(cache).toEqual({
      ...pluginLib.PLUGIN_CACHE_DEFAULT,
      _builtin: pluginLib.PLUGIN_CACHE_BUILTIN,
    })
  })

  test('returns the correct cache when a local cache exists', () => {
    const anExistingDefaultCacheEntryKey = Object.keys(
      pluginLib.PLUGIN_CACHE_DEFAULT,
    )[0]
    const anExistingDefaultCacheEntry = {
      [anExistingDefaultCacheEntryKey]: {
        ...pluginLib.PLUGIN_CACHE_DEFAULT[anExistingDefaultCacheEntryKey],
        description:
          'Mutated description which should be reverted back to default',
      },
    }
    const exampleCacheEntry = {
      '@redwoodjs/cli-some-package': {
        'some-command': {
          aliases: ['sc', 'someCommand'],
          description: 'Some example command',
        },
      },
    }
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        ...exampleCacheEntry,
        ...anExistingDefaultCacheEntry,
      }),
    })

    const cache = pluginLib.loadCommandCache()
    expect(cache).toEqual({
      ...pluginLib.PLUGIN_CACHE_DEFAULT,
      ...exampleCacheEntry,
      _builtin: pluginLib.PLUGIN_CACHE_BUILTIN,
    })
  })
})

describe('plugin loading', () => {
  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  beforeEach(() => {
    getPaths.mockReturnValue({
      generated: {
        base: '',
      },
    })

    vi.spyOn(pluginLib, 'loadCommandCache')
    vi.spyOn(pluginLib, 'loadPluginPackage')
    vi.spyOn(pluginLib, 'checkPluginListAndWarn')
    vi.spyOn(pluginLib, 'saveCommandCache')
  })

  afterEach(() => {
    pluginLib.loadCommandCache.mockRestore()
    pluginLib.checkPluginListAndWarn.mockRestore()
    pluginLib.loadPluginPackage.mockRestore()
    pluginLib.saveCommandCache.mockRestore()

    console.log.mockClear()
  })

  afterAll(() => {
    console.log.mockRestore()
  })

  test('no plugins are loaded for --version at the root level', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', '--version']

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(0)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(0)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(0)
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(0)

    process.argv = originalArgv
  })

  test('no plugins are loaded if it is a built-in command', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', pluginLib.PLUGIN_CACHE_BUILTIN[0]]

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [],
          autoInstall: true,
        },
      },
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(0)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(0)
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(0)

    getConfig.mockRestore()
    process.argv = originalArgv
  })

  test.each([['--help'], ['-h'], ['']])(
    `correct loading for root help ('%s')`,
    async (command) => {
      const originalArgv = process.argv
      process.argv = ['node', 'rw', command]

      getConfig.mockReturnValue({
        experimental: {
          cli: {
            plugins: [
              {
                package: '@redwoodjs/cli-some-package',
              },
              {
                package: '@redwoodjs/cli-some-package-not-in-cache',
              },
              {
                package: '@bluewoodjs/cli-some-package',
              },
            ],
            autoInstall: true,
          },
        },
      })
      vi.mock(
        '@redwoodjs/cli-some-package-not-in-cache',
        () => {
          return {
            commands: [
              {
                command: 'some-other-command',
                description: 'Some example other command',
                aliases: ['soc', 'someOtherCommand'],
              },
            ],
          }
        },
        { virtual: true },
      )
      vol.fromJSON({
        ['commandCache.json']: JSON.stringify({
          '@redwoodjs/cli-some-package': {
            'some-command': {
              aliases: ['sc', 'someCommand'],
              description: 'Some example command',
            },
          },
          '@bluewoodjs/cli-some-package': {
            'third-party': {
              aliases: ['tp', 'thirdParty'],
              description: 'Some third party command',
            },
          },
        }),
      })

      const yargsInstance = getMockYargsInstance()
      await loadPlugins(yargsInstance)

      expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
      expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

      // Should have loaded the package when it was not in the cache
      expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
      expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
        '@redwoodjs/cli-some-package-not-in-cache',
        undefined,
        true,
      )

      // Should have saved the cache with the new package
      expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
      const knownPlugins =
        getConfig.mock.results[0].value.experimental.cli.plugins.map(
          (plugin) => plugin.package,
        )
      const saveCommandCacheArg = Object.entries(
        pluginLib.saveCommandCache.mock.calls[0][0],
      ).filter(([key]) => knownPlugins.includes(key))
      expect(saveCommandCacheArg).toMatchSnapshot()

      // Rudimentary check that the help output contains the correct commands
      const helpOutput = await yargsInstance.getHelp()
      expect(helpOutput).toContain('rw built-in')
      expect(helpOutput).toContain('Some builtin command')
      expect(helpOutput).toContain('[aliases: bi, builtIn]')
      expect(helpOutput).toContain('rw some-command')
      expect(helpOutput).toContain('Some example command')
      expect(helpOutput).toContain('[aliases: sc, someCommand]')
      expect(helpOutput).toContain('rw some-other-command')
      expect(helpOutput).toContain('Some example other command')
      expect(helpOutput).toContain('[aliases: soc, someOtherCommand]')
      expect(helpOutput).toContain('rw @bluewoodjs <command>')
      expect(helpOutput).toContain('Commands from @bluewoodjs')

      getConfig.mockRestore()
      process.argv = originalArgv
    },
  )

  test.each([['--help'], ['-h'], ['']])(
    `correct loading for @redwoodjs namespace help ('%s')`,
    async (command) => {
      const originalArgv = process.argv
      process.argv = ['node', 'rw', '@redwoodjs', command]

      getConfig.mockReturnValue({
        experimental: {
          cli: {
            plugins: [
              {
                package: '@redwoodjs/cli-some-package',
              },
              {
                package: '@redwoodjs/cli-some-package-not-in-cache',
              },
              {
                package: '@bluewoodjs/cli-some-package',
              },
            ],
            autoInstall: true,
          },
        },
      })
      vi.mock(
        '@redwoodjs/cli-some-package-not-in-cache',
        () => {
          return {
            commands: [
              {
                command: 'some-other-command',
                description: 'Some example other command',
                aliases: ['soc', 'someOtherCommand'],
              },
            ],
          }
        },
        { virtual: true },
      )
      vol.fromJSON({
        ['commandCache.json']: JSON.stringify({
          '@redwoodjs/cli-some-package': {
            'some-command': {
              aliases: ['sc', 'someCommand'],
              description: 'Some example command',
            },
          },
          '@bluewoodjs/cli-some-package': {
            'third-party': {
              aliases: ['tp', 'thirdParty'],
              description: 'Some third party command',
            },
          },
        }),
      })

      const yargsInstance = getMockYargsInstance()
      await loadPlugins(yargsInstance)

      expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
      expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

      // Should have loaded the package when it was not in the cache
      expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
      expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
        '@redwoodjs/cli-some-package-not-in-cache',
        undefined,
        true,
      )

      // Should have saved the cache with the new package
      expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
      const knownPlugins =
        getConfig.mock.results[0].value.experimental.cli.plugins.map(
          (plugin) => plugin.package,
        )
      const saveCommandCacheArg = Object.entries(
        pluginLib.saveCommandCache.mock.calls[0][0],
      ).filter(([key]) => knownPlugins.includes(key))
      expect(saveCommandCacheArg).toMatchSnapshot()

      // Rudimentary check that the help output contains the correct commands
      const helpOutput = await yargsInstance.getHelp()
      expect(helpOutput).toContain('rw built-in')
      expect(helpOutput).toContain('Some builtin command')
      expect(helpOutput).toContain('[aliases: bi, builtIn]')
      expect(helpOutput).toContain('rw some-command')
      expect(helpOutput).toContain('Some example command')
      expect(helpOutput).toContain('[aliases: sc, someCommand]')
      expect(helpOutput).toContain('rw some-other-command')
      expect(helpOutput).toContain('Some example other command')
      expect(helpOutput).toContain('[aliases: soc, someOtherCommand]')
      expect(helpOutput).not.toContain('rw @bluewoodjs <command>')
      expect(helpOutput).not.toContain('Commands from @bluewoodjs')

      getConfig.mockRestore()
      process.argv = originalArgv
    },
  )

  test.each([['--help'], ['-h'], ['']])(
    `correct loading for third party namespace help ('%s')`,
    async (command) => {
      const originalArgv = process.argv
      process.argv = ['node', 'rw', '@bluewoodjs', command]

      getConfig.mockReturnValue({
        experimental: {
          cli: {
            plugins: [
              {
                package: '@redwoodjs/cli-some-package',
              },
              {
                package: '@redwoodjs/cli-some-package-not-in-cache',
              },
              {
                package: '@bluewoodjs/cli-some-package',
              },
            ],
            autoInstall: true,
          },
        },
      })
      vi.mock(
        '@redwoodjs/cli-some-package-not-in-cache',
        () => {
          return {
            commands: [
              {
                command: 'some-other-command',
                description: 'Some example other command',
                aliases: ['soc', 'someOtherCommand'],
              },
            ],
          }
        },
        { virtual: true },
      )
      vol.fromJSON({
        ['commandCache.json']: JSON.stringify({
          '@redwoodjs/cli-some-package': {
            'some-command': {
              aliases: ['sc', 'someCommand'],
              description: 'Some example command',
            },
          },
          '@bluewoodjs/cli-some-package': {
            'third-party': {
              aliases: ['tp', 'thirdParty'],
              description: 'Some third party command',
            },
          },
        }),
      })

      const yargsInstance = getMockYargsInstance()
      await loadPlugins(yargsInstance)

      expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
      expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

      // Should have NOT loaded the package when it was not in the cache
      // because it is not in the correct namespace
      expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(0)

      // Should have saved the cache with the new package
      expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
      const knownPlugins =
        getConfig.mock.results[0].value.experimental.cli.plugins.map(
          (plugin) => plugin.package,
        )
      const saveCommandCacheArg = Object.entries(
        pluginLib.saveCommandCache.mock.calls[0][0],
      ).filter(([key]) => knownPlugins.includes(key))
      expect(saveCommandCacheArg).toMatchSnapshot()

      // Rudimentary check that the help output contains the correct commands
      const helpOutput = await yargsInstance.getHelp()
      expect(helpOutput).toContain('rw @bluewoodjs <command>')
      expect(helpOutput).toContain('Commands from @bluewoodjs')
      expect(helpOutput).toContain('rw @bluewoodjs third-party')
      expect(helpOutput).toContain('Some third party command')
      expect(helpOutput).toContain('[aliases: tp, thirdParty]')

      getConfig.mockRestore()
      process.argv = originalArgv
    },
  )

  test('correct loading for unknown namespace (no command)', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', '@greenwoodjs']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vi.mock(
      '@redwoodjs/cli-some-package-not-in-cache',
      () => {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        '@redwoodjs/cli-some-package': {
          'some-command': {
            aliases: ['sc', 'someCommand'],
            description: 'Some example command',
          },
        },
        '@bluewoodjs/cli-some-package': {
          'third-party': {
            aliases: ['tp', 'thirdParty'],
            description: 'Some third party command',
          },
        },
      }),
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package when it was not in the cache
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@redwoodjs/cli-some-package-not-in-cache',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the help output contains the correct commands
    const helpOutput = await yargsInstance.getHelp()
    expect(helpOutput).toContain('rw built-in')
    expect(helpOutput).toContain('Some builtin command')
    expect(helpOutput).toContain('[aliases: bi, builtIn]')
    expect(helpOutput).toContain('rw some-command')
    expect(helpOutput).toContain('Some example command')
    expect(helpOutput).toContain('[aliases: sc, someCommand]')
    expect(helpOutput).toContain('rw some-other-command')
    expect(helpOutput).toContain('Some example other command')
    expect(helpOutput).toContain('[aliases: soc, someOtherCommand]')
    expect(helpOutput).toContain('rw @bluewoodjs <command>')
    expect(helpOutput).toContain('Commands from @bluewoodjs')

    getConfig.mockRestore()
    process.argv = originalArgv
  })
  test('correct loading for unknown namespace (with command)', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', '@greenwoodjs', 'anything']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vi.mock(
      '@redwoodjs/cli-some-package-not-in-cache',
      () => {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        '@redwoodjs/cli-some-package': {
          'some-command': {
            aliases: ['sc', 'someCommand'],
            description: 'Some example command',
          },
        },
        '@bluewoodjs/cli-some-package': {
          'third-party': {
            aliases: ['tp', 'thirdParty'],
            description: 'Some third party command',
          },
        },
      }),
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package when it was not in the cache
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@redwoodjs/cli-some-package-not-in-cache',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the help output contains the correct commands
    const helpOutput = await yargsInstance.getHelp()
    expect(helpOutput).toContain('rw built-in')
    expect(helpOutput).toContain('Some builtin command')
    expect(helpOutput).toContain('[aliases: bi, builtIn]')
    expect(helpOutput).toContain('rw some-command')
    expect(helpOutput).toContain('Some example command')
    expect(helpOutput).toContain('[aliases: sc, someCommand]')
    expect(helpOutput).toContain('rw some-other-command')
    expect(helpOutput).toContain('Some example other command')
    expect(helpOutput).toContain('[aliases: soc, someOtherCommand]')
    expect(helpOutput).toContain('rw @bluewoodjs <command>')
    expect(helpOutput).toContain('Commands from @bluewoodjs')

    getConfig.mockRestore()
    process.argv = originalArgv
  })

  test('correct loading for known redwood command (with cache)', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', 'someCommand']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vi.mock(
      '@redwoodjs/cli-some-package-not-in-cache',
      () => {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        '@redwoodjs/cli-some-package': {
          'some-command': {
            aliases: ['sc', 'someCommand'],
            description: 'Some example command',
          },
        },
        '@bluewoodjs/cli-some-package': {
          'third-party': {
            aliases: ['tp', 'thirdParty'],
            description: 'Some third party command',
          },
        },
      }),
    })

    pluginLib.loadPluginPackage.mockImplementation((packageName) => {
      if (packageName === '@redwoodjs/cli-some-package') {
        return {
          commands: [
            {
              command: 'some-command',
              description: 'Some example command',
              aliases: ['sc', 'someCommand'],
              builder: () => {},
              handler: () => {
                console.log('MARKER')
              },
            },
          ],
        }
      }
      throw new Error(`Unexpected behaviour: loading ${packageName}`)
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package - only the one we need
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@redwoodjs/cli-some-package',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the right handler was invoked
    await yargsInstance.parse()
    expect(console.log).toHaveBeenCalledWith('MARKER')

    getConfig.mockRestore()
    process.argv = originalArgv
  })
  test('correct loading for known redwood command (without cache)', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', 'someCommand']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vi.mock(
      '@redwoodjs/cli-some-package-not-in-cache',
      () => {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vi.mock(
      '@redwoodjs/cli-some-package',
      () => {
        return {
          commands: [
            {
              command: 'some-command',
              description: 'Some example command',
              aliases: ['sc', 'someCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({}),
    })

    pluginLib.loadPluginPackage.mockImplementation((packageName) => {
      if (packageName === '@redwoodjs/cli-some-package') {
        return {
          commands: [
            {
              command: 'some-command',
              description: 'Some example command',
              aliases: ['sc', 'someCommand'],
              builder: () => {},
              handler: () => {
                console.log('MARKER SOME')
              },
            },
          ],
        }
      }
      if (packageName === '@redwoodjs/cli-some-package-not-in-cache') {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
              builder: () => {},
              handler: () => {
                console.log('MARKER SOME OTHER')
              },
            },
          ],
        }
      }
      throw new Error(`Unexpected behaviour: loading ${packageName}`)
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package - all in the namespace
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(2)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@redwoodjs/cli-some-package',
      undefined,
      true,
    )
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@redwoodjs/cli-some-package-not-in-cache',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the right handler was invoked
    await yargsInstance.parse()
    expect(console.log).toHaveBeenCalledWith('MARKER SOME')
    expect(console.log).not.toHaveBeenCalledWith('MARKER SOME OTHER')

    getConfig.mockRestore()
    process.argv = originalArgv
  })
  test('correct loading for unknown redwood command', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', 'unknownCommand']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vi.mock(
      '@redwoodjs/cli-some-package-not-in-cache',
      () => {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        '@redwoodjs/cli-some-package': {
          'some-command': {
            aliases: ['sc', 'someCommand'],
            description: 'Some example command',
          },
        },
        '@bluewoodjs/cli-some-package': {
          'third-party': {
            aliases: ['tp', 'thirdParty'],
            description: 'Some third party command',
          },
        },
      }),
    })

    pluginLib.loadPluginPackage.mockImplementation((packageName) => {
      if (packageName === '@redwoodjs/cli-some-package') {
        return {
          commands: [
            {
              command: 'some-command',
              description: 'Some example command',
              aliases: ['sc', 'someCommand'],
              builder: () => {},
              handler: () => {
                console.log('MARKER SOME')
              },
            },
          ],
        }
      }
      if (packageName === '@redwoodjs/cli-some-package-not-in-cache') {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
              builder: () => {},
              handler: () => {
                console.log('MARKER SOME OTHER')
              },
            },
          ],
        }
      }
      throw new Error(`Unexpected behaviour: loading ${packageName}`)
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package that we couldn't rule out from the cache
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@redwoodjs/cli-some-package-not-in-cache',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the help output contains the correct commands
    const helpOutput = await yargsInstance.getHelp()
    expect(helpOutput).toContain('rw built-in')
    expect(helpOutput).toContain('Some builtin command')
    expect(helpOutput).toContain('[aliases: bi, builtIn]')
    expect(helpOutput).toContain('rw some-command')
    expect(helpOutput).toContain('Some example command')
    expect(helpOutput).toContain('[aliases: sc, someCommand]')
    expect(helpOutput).toContain('rw some-other-command')
    expect(helpOutput).toContain('Some example other command')
    expect(helpOutput).toContain('[aliases: soc, someOtherCommand]')
    expect(helpOutput).toContain('rw @bluewoodjs <command>')
    expect(helpOutput).toContain('Commands from @bluewoodjs')

    // Rudimentary check that the right handler was invoked
    await yargsInstance.parse()
    expect(console.log).not.toHaveBeenCalledWith('MARKER SOME')
    expect(console.log).not.toHaveBeenCalledWith('MARKER SOME OTHER')

    getConfig.mockRestore()
    process.argv = originalArgv
  })

  test('correct loading for known third party command (with cache)', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', '@bluewoodjs', 'tp']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vi.mock(
      '@redwoodjs/cli-some-package-not-in-cache',
      () => {
        return {
          commands: [
            {
              command: 'some-other-command',
              description: 'Some example other command',
              aliases: ['soc', 'someOtherCommand'],
            },
          ],
        }
      },
      { virtual: true },
    )
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        '@redwoodjs/cli-some-package': {
          'some-command': {
            aliases: ['sc', 'someCommand'],
            description: 'Some example command',
          },
        },
        '@bluewoodjs/cli-some-package': {
          'third-party': {
            aliases: ['tp', 'thirdParty'],
            description: 'Some third party command',
          },
        },
      }),
    })

    pluginLib.loadPluginPackage.mockImplementation((packageName) => {
      if (packageName === '@bluewoodjs/cli-some-package') {
        return {
          commands: [
            {
              command: 'third-party',
              description: 'Some third party command',
              aliases: ['tp', 'thirdParty'],
              builder: () => {},
              handler: () => {
                console.log('MARKER')
              },
            },
          ],
        }
      }
      throw new Error(`Unexpected behaviour: loading ${packageName}`)
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package - only the one we need
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(1)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@bluewoodjs/cli-some-package',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the right handler was invoked
    await yargsInstance.parse()
    expect(console.log).toHaveBeenCalledWith('MARKER')

    getConfig.mockRestore()
    process.argv = originalArgv
  })
  test('correct loading for known third party command (without cache)', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', '@bluewoodjs', 'tpo']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
            {
              package: '@bluewoodjs/cli-some-package-second-example',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({}),
    })

    pluginLib.loadPluginPackage.mockImplementation((packageName) => {
      if (packageName === '@bluewoodjs/cli-some-package') {
        return {
          commands: [
            {
              command: 'third-party',
              description: 'Some third party command',
              aliases: ['tp', 'thirdParty'],
              builder: () => {},
              handler: () => {
                console.log('MARKER TP')
              },
            },
          ],
        }
      }
      if (packageName === '@bluewoodjs/cli-some-package-second-example') {
        return {
          commands: [
            {
              command: 'third-party-other',
              description: 'Some other third party command',
              aliases: ['tpo', 'thirdPartyOther'],
              builder: () => {},
              handler: () => {
                console.log('MARKER TPO')
              },
            },
          ],
        }
      }
      throw new Error(`Unexpected behaviour: loading ${packageName}`)
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package - only the one we need
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(2)
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@bluewoodjs/cli-some-package',
      undefined,
      true,
    )
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledWith(
      '@bluewoodjs/cli-some-package-second-example',
      undefined,
      true,
    )

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the right handler was invoked
    await yargsInstance.parse()
    expect(console.log).not.toHaveBeenCalledWith('MARKER TP')
    expect(console.log).toHaveBeenCalledWith('MARKER TPO')

    getConfig.mockRestore()
    process.argv = originalArgv
  })
  test('correct loading for unknown third party command', async () => {
    const originalArgv = process.argv
    process.argv = ['node', 'rw', '@bluewoodjs', 'unknownCommand']

    getConfig.mockReturnValue({
      experimental: {
        cli: {
          plugins: [
            {
              package: '@redwoodjs/cli-some-package',
            },
            {
              package: '@redwoodjs/cli-some-package-not-in-cache',
            },
            {
              package: '@bluewoodjs/cli-some-package',
            },
          ],
          autoInstall: true,
        },
      },
    })
    vol.fromJSON({
      ['commandCache.json']: JSON.stringify({
        '@redwoodjs/cli-some-package': {
          'some-command': {
            aliases: ['sc', 'someCommand'],
            description: 'Some example command',
          },
        },
        '@bluewoodjs/cli-some-package': {
          'third-party': {
            aliases: ['tp', 'thirdParty'],
            description: 'Some third party command',
          },
        },
      }),
    })

    pluginLib.loadPluginPackage.mockImplementation((packageName) => {
      if (packageName === '@bluewoodjs/cli-some-package') {
        return {
          commands: [
            {
              command: 'third-party',
              description: 'Some third party command',
              aliases: ['tp', 'thirdParty'],
              builder: () => {},
              handler: () => {
                console.log('MARKER SOME')
              },
            },
          ],
        }
      }
      throw new Error(`Unexpected behaviour: loading ${packageName}`)
    })

    const yargsInstance = getMockYargsInstance()
    await loadPlugins(yargsInstance)

    expect(pluginLib.loadCommandCache).toHaveBeenCalledTimes(1)
    expect(pluginLib.checkPluginListAndWarn).toHaveBeenCalledTimes(1)

    // Should have loaded the package that we couldn't rule out from the cache
    expect(pluginLib.loadPluginPackage).toHaveBeenCalledTimes(0)

    // Should have saved the cache with the new package
    expect(pluginLib.saveCommandCache).toHaveBeenCalledTimes(1)
    const knownPlugins =
      getConfig.mock.results[0].value.experimental.cli.plugins.map(
        (plugin) => plugin.package,
      )
    const saveCommandCacheArg = Object.entries(
      pluginLib.saveCommandCache.mock.calls[0][0],
    ).filter(([key]) => knownPlugins.includes(key))
    expect(saveCommandCacheArg).toMatchSnapshot()

    // Rudimentary check that the help output contains the correct commands
    const helpOutput = await yargsInstance.getHelp()
    expect(helpOutput).not.toContain('rw built-in')
    expect(helpOutput).not.toContain('Some builtin command')
    expect(helpOutput).not.toContain('[aliases: bi, builtIn]')
    expect(helpOutput).not.toContain('rw some-command')
    expect(helpOutput).not.toContain('Some example command')
    expect(helpOutput).not.toContain('[aliases: sc, someCommand]')
    expect(helpOutput).not.toContain('rw some-other-command')
    expect(helpOutput).not.toContain('Some example other command')
    expect(helpOutput).not.toContain('[aliases: soc, someOtherCommand]')
    expect(helpOutput).toContain('rw @bluewoodjs <command>')
    expect(helpOutput).toContain('Commands from @bluewoodjs')

    // Rudimentary check that the right handler was invoked
    await yargsInstance.parse()
    expect(console.log).not.toHaveBeenCalledWith('MARKER')

    getConfig.mockRestore()
    process.argv = originalArgv
  })
})
