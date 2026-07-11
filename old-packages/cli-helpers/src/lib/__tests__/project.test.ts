vi.mock('fs')
vi.mock('node:fs', async () => {
  const memfs = await import('memfs')
  return {
    ...memfs.fs,
    default: memfs.fs,
  }
})

import * as fs from 'node:fs'

import * as toml from 'smol-toml'
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

import { updateTomlConfig, addEnvVar } from '../project.js'

const defaultRedwoodToml: Record<string, any> = {
  web: {
    title: 'Redwood App',
    port: 8910,
    apiUrl: '/.redwood/functions',
    includeEnvironmentVariables: [],
  },
  api: {
    port: 8911,
  },
}

const getRedwoodToml = () => {
  return defaultRedwoodToml
}

vi.mock('@redwoodjs/project-config', () => {
  return {
    getPaths: () => {
      return {
        generated: {
          base: '.redwood',
        },
        base: '',
      }
    },
    getConfigPath: () => {
      return '.redwood.toml'
    },
    getConfig: () => {
      return getRedwoodToml()
    },
  }
})

describe('addEnvVar', () => {
  let envFileContent = ''

  describe('addEnvVar adds environment variables as part of a setup task', () => {
    beforeEach(() => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)

      vi.spyOn(fs, 'readFileSync').mockImplementation(() => envFileContent)

      vi.spyOn(fs, 'writeFileSync').mockImplementation((envPath, envFile) => {
        expect(envPath).toContain('.env')
        return envFile
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
      envFileContent = ''
    })

    it('should add a new environment variable when it does not exist', () => {
      envFileContent = 'EXISTING_VAR = value\n# CommentedVar = 123\n'
      const file = addEnvVar('NEW_VAR', 'new_value', 'New Variable Comment')

      expect(file).toMatchSnapshot()
    })

    it('should add a new environment variable when it does not exist when existing envars have no spacing', () => {
      envFileContent = 'EXISTING_VAR=value\n# CommentedVar = 123\n'
      const file = addEnvVar('NEW_VAR', 'new_value', 'New Variable Comment')

      expect(file).toMatchSnapshot()
    })

    it('should add a comment that the existing environment variable value was not changed, but include its new value as a comment', () => {
      envFileContent = 'EXISTING_VAR=value\n# CommentedVar=123\n'
      const file = addEnvVar(
        'EXISTING_VAR',
        'new_value',
        'Updated existing variable Comment',
      )

      expect(file).toMatchSnapshot()
    })

    it('should handle existing environment variables with quoted values', () => {
      envFileContent = `EXISTING_VAR = "value"\n# CommentedVar = 123\n`
      const file = addEnvVar('EXISTING_VAR', 'value', 'New Variable Comment')

      expect(file).toMatchSnapshot()
    })

    it('should handle existing environment variables with quoted values and no spacing', () => {
      envFileContent = `EXISTING_VAR="value"\n# CommentedVar=123\n`
      const file = addEnvVar('EXISTING_VAR', 'value', 'New Variable Comment')

      expect(file).toMatchSnapshot()
    })

    it('should handle existing environment variables and new value with quoted values by not updating the original value', () => {
      envFileContent = `EXISTING_VAR = "value"\n# CommentedVar = 123\n`
      const file = addEnvVar(
        'EXISTING_VAR',
        'new_value',
        'New Variable Comment',
      )

      expect(file).toMatchSnapshot()
    })
  })
})

describe('updateTomlConfig', () => {
  describe('updateTomlConfig configures a new CLI plugin', () => {
    beforeEach(() => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)

      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        return toml.stringify(defaultRedwoodToml)
      })

      vi.spyOn(fs, 'writeFileSync').mockImplementation((tomlPath, tomlFile) => {
        expect(tomlPath).toContain('redwood.toml')
        return tomlFile
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('adds when experimental cli is not configured', () => {
      const file = updateTomlConfig(
        '@example/test-package-when-cli-not-configured',
      )
      expect(file).toMatchSnapshot()
    })

    it('adds when experimental cli has some plugins configured', () => {
      defaultRedwoodToml.experimental = {
        cli: {
          autoInstall: true,
          plugins: [
            {
              package:
                '@existing-example/some-package-when-cli-has-some-packages-configured',
            },
          ],
        },
      }

      const file = updateTomlConfig('@example/test-package-name')
      expect(file).toMatchSnapshot()
    })

    it('adds when experimental cli is setup but has no plugins configured', () => {
      defaultRedwoodToml.experimental = {
        cli: {
          autoInstall: true,
        },
      }

      const file = updateTomlConfig(
        '@example/test-package-when-no-plugins-configured',
      )

      expect(file).toMatchSnapshot()
    })

    it('adds package but keeps autoInstall false', () => {
      defaultRedwoodToml.experimental = {
        cli: {
          autoInstall: false,
        },
      }

      const file = updateTomlConfig(
        '@example/test-package-when-autoInstall-false',
      )

      expect(file).toMatchSnapshot()
    })

    it('does not add duplicate place when experimental cli has that plugin configured', () => {
      defaultRedwoodToml.experimental = {
        cli: {
          autoInstall: true,
          plugins: [
            {
              package: '@existing-example/some-package-name-already-exists',
            },
          ],
        },
      }

      const file = updateTomlConfig(
        '@existing-example/some-package-name-already-exists',
      )

      expect(file).toMatchSnapshot()
    })
  })
})
