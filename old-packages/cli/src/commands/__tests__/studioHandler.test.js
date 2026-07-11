// Have to use `var` here to avoid "Temporal Dead Zone" issues

var mockedRedwoodVersion = '0.0.0'

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  return {
    ...originalProjectConfig,
    getPaths: () => ({ base: '' }),
  }
})

vi.mock('fs-extra', () => ({
  default: {
    readJSONSync: () => ({
      devDependencies: {
        '@redwoodjs/core': mockedRedwoodVersion,
      },
    }),
  },
}))

import { vi, describe, it, afterEach, afterAll, expect } from 'vitest'

import { assertRedwoodVersion } from '../studioHandler'

describe('studioHandler', () => {
  describe('assertRedwoodVersion', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`)
    })

    vi.spyOn(console, 'error').mockImplementation()

    afterEach(() => {
      vi.clearAllMocks()
    })

    afterAll(() => {
      vi.restoreAllMocks()
    })

    const minVersions = ['7.0.0-canary.874', '7.x', '8.0.0-0']

    it('exits on RW v6', () => {
      mockedRedwoodVersion = '6.6.2'

      expect(() => assertRedwoodVersion(minVersions)).toThrow()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits on RW v7.0.0-canary.785', () => {
      mockedRedwoodVersion = '7.0.0-canary.785'

      expect(() => assertRedwoodVersion(minVersions)).toThrow()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits on RW v7.0.0-canary.785+fcb9d66b5', () => {
      mockedRedwoodVersion = '7.0.0-canary.785+fcb9d66b5'

      expect(() => assertRedwoodVersion(minVersions)).toThrow()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits on RW v0.0.0-experimental.999', () => {
      mockedRedwoodVersion = '0.0.0-experimental.999'

      expect(() => assertRedwoodVersion(minVersions)).toThrow()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits on RW v7.0.0-alpha.999', () => {
      mockedRedwoodVersion = '7.0.0-alpha.999'

      expect(() => assertRedwoodVersion(minVersions)).toThrow()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits on RW v7.0.0-rc.999', () => {
      mockedRedwoodVersion = '7.0.0-rc.999'

      expect(() => assertRedwoodVersion(minVersions)).toThrow()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('allows RW v7.0.0-canary.874', () => {
      mockedRedwoodVersion = '7.0.0-canary.874'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v7.0.0-canary.874+fcb9d66b5', () => {
      mockedRedwoodVersion = '7.0.0-canary.874+fcb9d66b5'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v7.0.0', () => {
      mockedRedwoodVersion = '7.0.0'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v8.0.0', () => {
      mockedRedwoodVersion = '8.0.0'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v7.0.1', () => {
      mockedRedwoodVersion = '7.0.1'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v8.0.0-canary.1', () => {
      mockedRedwoodVersion = '8.0.0-canary.1'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v8.0.0-rc.1', () => {
      mockedRedwoodVersion = '8.0.0-rc.1'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v8.0.0', () => {
      mockedRedwoodVersion = '8.0.0'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v8.0.1', () => {
      mockedRedwoodVersion = '8.0.1'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('allows RW v9.1.0', () => {
      mockedRedwoodVersion = '9.1.0'

      expect(() => assertRedwoodVersion(minVersions)).not.toThrow()
      expect(exitSpy).not.toHaveBeenCalled()
    })
  })
})
