globalThis.__dirname = __dirname

globalThis.mockFs = false
const mockFiles = {}

vi.mock('fs-extra', async (importOriginal) => {
  const originalFsExtra = await importOriginal()
  return {
    default: {
      ...originalFsExtra,
      existsSync: (...args) => {
        if (!globalThis.mockFs) {
          return originalFsExtra.existsSync.apply(null, args)
        }
        return false
      },
      mkdirSync: (...args) => {
        if (globalThis.mockFs) {
          return
        }

        return originalFsExtra.mkdirSync.apply(null, args)
      },
      writeFileSync: (target, contents) => {
        if (globalThis.mockFs) {
          return
        }

        return originalFsExtra.writeFileSync.call(null, target, contents)
      },
      readFileSync: (path) => {
        if (!globalThis.mockFs) {
          return originalFsExtra.readFileSync.call(null, path)
        }

        const mockedContent = mockFiles[path]

        return mockedContent || originalFsExtra.readFileSync.call(null, path)
      },
    },
  }
})

import path from 'path'

import fs from 'fs-extra'
import prompts from 'prompts'
import { vi, afterEach, test, expect, describe } from 'vitest'

// Load mocks
import '../../../../lib/test'

import { ensurePosixPath } from '@redwoodjs/project-config'

import { getDefaultArgs } from '../../../../lib'
import * as sdl from '../sdl'

afterEach(() => {
  vi.clearAllMocks()
})

const extensionForBaseArgs = (baseArgs) =>
  baseArgs && baseArgs.typescript ? 'ts' : 'js'

const itReturnsExactlyFourFiles = (baseArgs = {}) => {
  test('returns exactly 4 files', async () => {
    const files = await sdl.files({ ...baseArgs, name: 'Post', crud: false })

    expect(Object.keys(files).length).toEqual(4)
  })
}

// in this case we'll trust that a service and test are actually created
// with the correct filename, but the contents of that file should be the
// job of the service tests
const itCreatesAService = (baseArgs = {}) => {
  test('creates a service', async () => {
    const files = await sdl.files({ ...baseArgs, name: 'User', crud: false })
    const extension = extensionForBaseArgs(baseArgs)

    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/services/users/users.${extension}`,
      ),
    ])
    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/services/users/users.test.${extension}`,
      ),
    ])
    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/services/users/users.scenarios.${extension}`,
      ),
    ])
  })
}

const itCreatesASingleWordSDLFile = (baseArgs = {}) => {
  test('creates a single word sdl file', async () => {
    const files = await sdl.files({ ...baseArgs, name: 'User', crud: false })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/users.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesAMultiWordSDLFile = (baseArgs = {}) => {
  test('creates a multi word sdl file', async () => {
    const files = await sdl.files({
      ...baseArgs,
      name: 'UserProfile',
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/userProfiles.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesASingleWordSDLFileWithCRUD = (baseArgs = {}) => {
  test('creates a single word sdl file with CRUD actions', async () => {
    const files = await sdl.files({ ...baseArgs, name: 'Post', crud: true })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/posts.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreateAMultiWordSDLFileWithCRUD = (baseArgs = {}) => {
  test('creates a multi word sdl file with CRUD actions', async () => {
    const files = await sdl.files({
      ...baseArgs,
      name: 'UserProfile',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)

    // Service files
    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/services/userProfiles/userProfiles.${extension}`,
      ),
    ])
    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/services/userProfiles/userProfiles.test.${extension}`,
      ),
    ])
    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/services/userProfiles/userProfiles.scenarios.${extension}`,
      ),
    ])

    //sdl file
    expect(files).toHaveProperty([
      path.normalize(
        `/path/to/project/api/src/graphql/userProfiles.sdl.${extension}`,
      ),
    ])

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/userProfiles.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesAnSDLFileWithEnumDefinitions = (baseArgs = {}) => {
  test('creates a sdl file with enum definitions', async () => {
    const files = await sdl.files({
      ...baseArgs,
      name: 'Shoe',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/shoes.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesAnSDLFileWithJsonDefinitions = (baseArgs = {}) => {
  test('creates a sdl file with json definitions', async () => {
    const files = await sdl.files({ ...baseArgs, name: 'Photo', crud: true })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/photos.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesAnSDLFileWithByteDefinitions = (baseArgs = {}) => {
  test('creates a sdl file with Byte definitions', async () => {
    const files = await sdl.files({
      ...baseArgs,
      name: 'Key',
      crud: true,
    })
    const ext = extensionForBaseArgs(baseArgs)

    expect(
      files[path.normalize(`/path/to/project/api/src/graphql/keys.sdl.${ext}`)],
    ).toMatchSnapshot()
  })
}

const itCreatesAnSslFileForModelWithOnlyIdAndRelation = (baseArgs = {}) => {
  test('create an sdl file for model with only id and relation', async () => {
    const files = {
      ...(await sdl.files({
        ...baseArgs,
        name: 'Car',
        crud: true,
      })),
      ...(await sdl.files({
        ...baseArgs,
        name: 'CarBrand',
        crud: true,
      })),
    }
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(`/path/to/project/api/src/graphql/cars.sdl.${extension}`)
      ],
    ).toMatchSnapshot()
    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/graphql/carBrands.sdl.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

describe('without graphql documentations', () => {
  describe('in javascript mode', () => {
    const baseArgs = { ...getDefaultArgs(sdl.defaults), tests: true }

    itReturnsExactlyFourFiles(baseArgs)
    itCreatesAService(baseArgs)
    itCreatesASingleWordSDLFile(baseArgs)
    itCreatesAMultiWordSDLFile(baseArgs)
    itCreatesASingleWordSDLFileWithCRUD(baseArgs)
    itCreateAMultiWordSDLFileWithCRUD(baseArgs)
    itCreatesAnSDLFileWithEnumDefinitions(baseArgs)
    itCreatesAnSDLFileWithJsonDefinitions(baseArgs)
    itCreatesAnSDLFileWithByteDefinitions(baseArgs)
    itCreatesAnSslFileForModelWithOnlyIdAndRelation(baseArgs)
  })

  describe('in typescript mode', () => {
    const baseArgs = {
      ...getDefaultArgs(sdl.defaults),
      typescript: true,
      tests: true,
    }

    itReturnsExactlyFourFiles(baseArgs)
    itCreatesAService(baseArgs)
    itCreatesASingleWordSDLFile(baseArgs)
    itCreatesAMultiWordSDLFile(baseArgs)
    itCreatesASingleWordSDLFileWithCRUD(baseArgs)
    itCreateAMultiWordSDLFileWithCRUD(baseArgs)
    itCreatesAnSDLFileWithEnumDefinitions(baseArgs)
    itCreatesAnSDLFileWithJsonDefinitions(baseArgs)
    itCreatesAnSDLFileWithByteDefinitions(baseArgs)
    itCreatesAnSslFileForModelWithOnlyIdAndRelation(baseArgs)
  })
})

describe('with graphql documentations', () => {
  describe('in javascript mode', () => {
    const baseArgs = {
      ...getDefaultArgs(sdl.defaults),
      tests: true,
      docs: true,
    }

    itReturnsExactlyFourFiles(baseArgs)
    itCreatesAService(baseArgs)
    itCreatesASingleWordSDLFile(baseArgs)
    itCreatesAMultiWordSDLFile(baseArgs)
    itCreatesASingleWordSDLFileWithCRUD(baseArgs)
    itCreateAMultiWordSDLFileWithCRUD(baseArgs)
    itCreatesAnSDLFileWithEnumDefinitions(baseArgs)
    itCreatesAnSDLFileWithJsonDefinitions(baseArgs)
    itCreatesAnSDLFileWithByteDefinitions(baseArgs)
  })

  describe('in typescript mode', () => {
    const baseArgs = {
      ...getDefaultArgs(sdl.defaults),
      typescript: true,
      tests: true,
      docs: true,
    }

    itReturnsExactlyFourFiles(baseArgs)
    itCreatesAService(baseArgs)
    itCreatesASingleWordSDLFile(baseArgs)
    itCreatesAMultiWordSDLFile(baseArgs)
    itCreatesASingleWordSDLFileWithCRUD(baseArgs)
    itCreateAMultiWordSDLFileWithCRUD(baseArgs)
    itCreatesAnSDLFileWithEnumDefinitions(baseArgs)
    itCreatesAnSDLFileWithJsonDefinitions(baseArgs)
    itCreatesAnSDLFileWithByteDefinitions(baseArgs)
  })
})

describe('handler', () => {
  const canBeCalledWithGivenModelName = (letterCase, model) => {
    test(`can be called with ${letterCase} model name`, async () => {
      const spy = vi.spyOn(fs, 'writeFileSync')

      globalThis.mockFs = true

      await sdl.handler({
        model,
        crud: true,
        force: false,
        tests: true,
        typescript: false,
      })

      expect(spy).toHaveBeenCalled()

      spy.mock.calls.forEach((calls) => {
        const testOutput = {
          // Because windows paths are different, we need to normalize before
          // snapshotting
          filePath: ensurePosixPath(calls[0]),
          fileContent: calls[1],
        }

        expect(testOutput).toMatchSnapshot()
      })

      globalThis.mockFs = false
      spy.mockRestore()
    })
  }

  canBeCalledWithGivenModelName('camelCase', 'user')
  canBeCalledWithGivenModelName('PascalCase', 'User')

  prompts.inject('CustomDatums')
  canBeCalledWithGivenModelName('camelCase', 'customData')
  prompts.inject('CustomDatums')
  canBeCalledWithGivenModelName('PascalCase', 'CustomData')
})
