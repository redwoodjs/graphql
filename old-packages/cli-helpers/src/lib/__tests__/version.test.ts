vi.mock('@redwoodjs/project-config', () => {
  return {
    getPaths: () => {
      return {
        base: '',
      }
    },
  }
})
vi.mock('fs')

import fs from 'fs'

import { vi, describe, test, expect, beforeEach } from 'vitest'

import { getCompatibilityData } from '../version.js'

const EXAMPLE_PACKUMENT = {
  _id: '@scope/package-name',
  _rev: 'a1b2c3a1b2c3a1b2c3a1b2c3a1b2c3a1b2c3',
  name: '@scope/package-name',
  'dist-tags': {
    latest: '0.0.3',
  },
  versions: {
    '0.0.1': {
      name: '@scope/package-name',
      version: '0.0.1',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
      author: '',
      license: 'ISC',
      description: '',
      dependencies: {
        'some-package': '1.2.3',
      },
      _id: '@scope/package-name@0.0.1',
      _nodeVersion: '18.16.0',
      _npmVersion: '9.5.1',
      dist: {
        integrity: 'sha512-somehashvalue',
        shasum: 'somehashvalue',
        tarball: 'someurl',
        fileCount: 8,
        unpackedSize: 1024,
        signatures: [
          {
            keyid: 'SHA256:somehashvalue',
            sig: 'somehashvalue',
          },
        ],
      },
      _npmUser: {
        name: 'someuser',
        email: 'someemail',
      },
      directories: {},
      maintainers: [
        {
          name: 'someuser',
          email: 'someemail',
        },
      ],
      _npmOperationalInternal: {
        host: 'somes3',
        tmp: 'sometmp',
      },
      _hasShrinkwrap: false,
    },
    '0.0.2': {
      name: '@scope/package-name',
      version: '0.0.2',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
      author: '',
      license: 'ISC',
      description: '',
      dependencies: {
        'some-package': '1.2.3',
      },
      engines: {
        redwoodjs: '^5.1.0',
      },
      _id: '@scope/package-name@0.0.2',
      _nodeVersion: '20.2.0',
      _npmVersion: '9.6.6',
      dist: {
        integrity: 'sha512-somehashvalue',
        shasum: 'somehashvalue',
        tarball: 'someurl',
        fileCount: 8,
        unpackedSize: 1024,
        signatures: [
          {
            keyid: 'SHA256:somehashvalue',
            sig: 'somehashvalue',
          },
        ],
      },
      _npmUser: {
        name: 'someuser',
        email: 'someemail',
      },
      directories: {},
      maintainers: [
        {
          name: 'someuser',
          email: 'someemail',
        },
      ],
      _npmOperationalInternal: {
        host: 'somes3',
        tmp: 'sometmp',
      },
      _hasShrinkwrap: false,
    },
    '0.0.3': {
      name: '@scope/package-name',
      version: '0.0.3',
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1',
      },
      author: '',
      license: 'ISC',
      description: '',
      dependencies: {
        'some-package': '1.2.3',
      },
      engines: {
        redwoodjs: '^6.0.0',
      },
      _id: '@scope/package-name@0.0.3',
      _nodeVersion: '20.2.0',
      _npmVersion: '9.6.6',
      dist: {
        integrity: 'sha512-somehashvalue',
        shasum: 'somehashvalue',
        tarball: 'someurl',
        fileCount: 8,
        unpackedSize: 1024,
        signatures: [
          {
            keyid: 'SHA256:somehashvalue',
            sig: 'somehashvalue',
          },
        ],
      },
      _npmUser: {
        name: 'someuser',
        email: 'someemail',
      },
      directories: {},
      maintainers: [
        {
          name: 'someuser',
          email: 'someemail',
        },
      ],
      _npmOperationalInternal: {
        host: 'somes3',
        tmp: 'sometmp',
      },
      _hasShrinkwrap: false,
    },
  },
  time: {
    created: '2023-05-10T12:10:52.090Z',
    '0.0.1': '2023-05-10T12:10:52.344Z',
    '0.0.2': '2023-07-15T19:45:25.905Z',
  },
  maintainers: [
    {
      name: 'someuser',
      email: 'someemail',
    },
  ],
  license: 'ISC',
  readme: 'ERROR: No README data found!',
  readmeFilename: '',
  author: {
    name: 'someuser',
  },
}

describe('version compatibility detection', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      return {
        json: () => {
          return EXAMPLE_PACKUMENT
        },
      } as any
    })

    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        devDependencies: {
          '@redwoodjs/core': '^6.0.0',
        },
      }),
    )
  })

  test('throws for some fetch related error', async () => {
    // Mock the fetch function to throw an error
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      throw new Error('Some fetch related error')
    })
    await expect(
      getCompatibilityData('some-package', 'latest'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Some fetch related error]`,
    )

    // Mock the json parsing to throw an error
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      return {
        json: () => {
          throw new Error('Some json parsing error')
        },
      } as any
    })

    await expect(
      getCompatibilityData('some-package', 'latest'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Some json parsing error]`,
    )
  })

  test('throws for some packument related error', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      return {
        json: () => {
          return {
            error: 'Some packument related error',
          }
        },
      } as any
    })

    await expect(
      getCompatibilityData('some-package', 'latest'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Some packument related error]`,
    )
  })

  test('throws if preferred version is not found', async () => {
    await expect(
      getCompatibilityData('@scope/package-name', '0.0.4'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: The package '@scope/package-name' does not have a version '0.0.4']`,
    )
  })

  test('throws if preferred tag is not found', async () => {
    await expect(
      getCompatibilityData('@scope/package-name', 'next'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: The package '@scope/package-name' does not have a tag 'next']`,
    )
  })

  test('throws if no latest version could be found', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      return {
        json: () => {
          return {
            ...EXAMPLE_PACKUMENT,
            'dist-tags': {},
          }
        },
      } as any
    })

    await expect(
      getCompatibilityData('@scope/package-name', 'latest'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: The package '@scope/package-name' does not have a tag 'latest']`,
    )
  })

  test('returns the preferred version if it is compatible', async () => {
    expect(await getCompatibilityData('@scope/package-name', '0.0.3')).toEqual({
      preferred: {
        tag: 'latest',
        version: '0.0.3',
      },
      compatible: {
        tag: 'latest',
        version: '0.0.3',
      },
    })
  })

  test('returns the latest compatible version if the preferred version is not compatible', async () => {
    expect(await getCompatibilityData('@scope/package-name', '0.0.2')).toEqual({
      preferred: {
        tag: undefined,
        version: '0.0.2',
      },
      compatible: {
        tag: 'latest',
        version: '0.0.3',
      },
    })
  })

  test('returns the latest compatible version when given a tag', async () => {
    expect(await getCompatibilityData('@scope/package-name', 'latest')).toEqual(
      {
        preferred: {
          tag: 'latest',
          version: '0.0.3',
        },
        compatible: {
          tag: 'latest',
          version: '0.0.3',
        },
      },
    )

    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        devDependencies: {
          '@redwoodjs/core': '5.2.0',
        },
      }),
    )

    expect(await getCompatibilityData('@scope/package-name', 'latest')).toEqual(
      {
        preferred: {
          tag: 'latest',
          version: '0.0.3',
        },
        compatible: {
          tag: undefined,
          version: '0.0.2',
        },
      },
    )
  })

  test('throws if no compatible version could be found', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        devDependencies: {
          '@redwoodjs/core': '7.0.0',
        },
      }),
    )

    expect(
      getCompatibilityData('@scope/package-name', 'latest'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: No compatible version of '@scope/package-name' was found]`,
    )
  })
})
