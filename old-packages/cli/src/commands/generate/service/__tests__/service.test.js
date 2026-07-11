globalThis.__dirname = __dirname
import path from 'path'

import { vi, beforeAll, afterAll, test, expect, describe, it } from 'vitest'
import yargs from 'yargs/yargs'

// Load mocks
import '../../../../lib/test'

import { getDefaultArgs } from '../../../../lib'
import * as service from '../service'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2022-09-30T09:50:00.000Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

const extensionForBaseArgs = (baseArgs) =>
  baseArgs && baseArgs.typescript ? 'ts' : 'js'

const itReturnsExactly3Files = (baseArgs) => {
  test('returns exactly 3 files', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
    })

    expect(Object.keys(files).length).toEqual(3)
  })
}
const itCreatesASingleWordServiceFile = (baseArgs) => {
  test('creates a single word service file', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/users/users.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}
const itCreatesASingleWordServiceTestFile = (baseArgs) => {
  test('creates a single word service test file', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/users/users.test.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesASingleWordServiceScenarioFile = (baseArgs) => {
  test('creates a single word service scenario file', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
    })
    const extension = extensionForBaseArgs(baseArgs)
    const filePath = path.normalize(
      `/path/to/project/api/src/services/users/users.scenarios.${extension}`,
    )

    expect(Object.keys(files)).toContain(filePath)
    expect(files[filePath]).toMatchSnapshot()
  })
}

const itCreatesAMultiWordServiceFile = (baseArgs) => {
  test('creates a multi word service file', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'UserProfile',
      crud: false,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/userProfiles/userProfiles.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesAMultiWordServiceTestFile = (baseArgs) => {
  test('creates a multi word service test file', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'UserProfile',
      crud: false,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/userProfiles/userProfiles.test.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesASingleWordServiceFileWithCRUDActions = (baseArgs) => {
  test('creates a single word service file with CRUD actions', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'Post',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/posts/posts.${extension}`,
        )
      ],
    ).toMatchSnapshot()

    // TODO
    // Mock Date, so we can take snapshots of tests and scenarios
  })
}

const itCreatesASingleWordServiceTestFileWithCRUDActions = (baseArgs) => {
  test('creates a service test file with CRUD actions', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'Post',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)
    const filePath = path.normalize(
      `/path/to/project/api/src/services/posts/posts.test.${extension}`,
    )

    expect(Object.keys(files)).toContain(filePath)
  })
}

const itCreatesAMultiWordServiceFileWithCRUDActions = (baseArgs) => {
  test('creates a multi word service file with CRUD actions', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'UserProfile',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)
    const filePath = path.normalize(
      `/path/to/project/api/src/services/userProfiles/userProfiles.${extension}`,
    )

    expect(Object.keys(files)).toContain(filePath)
  })
}

const itCreatesAMultiWordServiceTestFileWithCRUDActions = (baseArgs) => {
  test('creates a multi word service test file with CRUD actions', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'UserProfile',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)
    const filePath = path.normalize(
      `/path/to/project/api/src/services/userProfiles/userProfiles.test.${extension}`,
    )

    expect(Object.keys(files)).toContain(filePath)
  })
}

const itCreatesAMultiWordServiceTestFileWithMultipleScalarTypes = (
  baseArgs,
) => {
  test('creates a multi word service test file with multiple scalar types', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'ScalarType',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/scalarTypes/scalarTypes.test.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesASingleWordServiceFileWithAHasManyRelation = (baseArgs) => {
  test('creates a single word service file with a hasMany relation', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
      relations: ['userProfiles'],
      crud: false,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/users/users.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesASingleWordServiceFileWithABelongsToRelation = (baseArgs) => {
  test('creates a single word service file with a belongsTo relation', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
      relations: ['identity'],
      crud: false,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/users/users.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesASingleWordServiceFileWithMultipleRelations = (baseArgs) => {
  test('creates a single word service file with multiple relations', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'User',
      relations: ['userProfiles', 'identity'],
      crud: false,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/users/users.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

const itCreatesAMultiWordServiceTestFileWithCRUDAndOnlyForeignKeyRequired = (
  baseArgs,
) => {
  test('creates a multi word service test file with crud actions and only foreign as mandatory field', async () => {
    const files = await service.files({
      ...baseArgs,
      name: 'Transaction',
      crud: true,
    })
    const extension = extensionForBaseArgs(baseArgs)

    expect(
      files[
        path.normalize(
          `/path/to/project/api/src/services/transactions/transactions.test.${extension}`,
        )
      ],
    ).toMatchSnapshot()
  })
}

test('keeps Service in name', () => {
  const { name } = yargs()
    .command('service <name>', false, service.builder)
    .parse('service BazingaService')

  expect(name).toEqual('BazingaService')
})

describe('in javascript mode', () => {
  const baseArgs = { ...getDefaultArgs(service.defaults), tests: true }

  itReturnsExactly3Files(baseArgs)
  itCreatesASingleWordServiceFile(baseArgs)
  itCreatesASingleWordServiceTestFile(baseArgs)
  itCreatesASingleWordServiceScenarioFile(baseArgs)
  itCreatesAMultiWordServiceFile(baseArgs)
  itCreatesAMultiWordServiceTestFile(baseArgs)
  itCreatesASingleWordServiceFileWithCRUDActions(baseArgs)
  itCreatesASingleWordServiceTestFileWithCRUDActions(baseArgs)
  itCreatesAMultiWordServiceTestFileWithMultipleScalarTypes(baseArgs)
  itCreatesAMultiWordServiceFileWithCRUDActions(baseArgs)
  itCreatesAMultiWordServiceTestFileWithCRUDActions(baseArgs)
  itCreatesASingleWordServiceFileWithAHasManyRelation(baseArgs)
  itCreatesASingleWordServiceFileWithABelongsToRelation(baseArgs)
  itCreatesASingleWordServiceFileWithMultipleRelations(baseArgs)
  itCreatesAMultiWordServiceTestFileWithCRUDAndOnlyForeignKeyRequired(baseArgs)
})

describe('in typescript mode', () => {
  const baseArgs = {
    ...getDefaultArgs(service.defaults),
    typescript: true,
    tests: true,
  }

  itReturnsExactly3Files(baseArgs)
  itCreatesASingleWordServiceFile(baseArgs)
  itCreatesASingleWordServiceTestFile(baseArgs)
  itCreatesASingleWordServiceScenarioFile(baseArgs)
  itCreatesAMultiWordServiceFile(baseArgs)
  itCreatesAMultiWordServiceTestFile(baseArgs)
  itCreatesASingleWordServiceFileWithCRUDActions(baseArgs)
  itCreatesAMultiWordServiceTestFileWithMultipleScalarTypes(baseArgs)
  itCreatesASingleWordServiceTestFileWithCRUDActions(baseArgs)
  itCreatesAMultiWordServiceFileWithCRUDActions(baseArgs)
  itCreatesAMultiWordServiceTestFileWithCRUDActions(baseArgs)
  itCreatesASingleWordServiceFileWithAHasManyRelation(baseArgs)
  itCreatesASingleWordServiceFileWithABelongsToRelation(baseArgs)
  itCreatesASingleWordServiceFileWithMultipleRelations(baseArgs)
  itCreatesAMultiWordServiceTestFileWithCRUDAndOnlyForeignKeyRequired(baseArgs)
})

describe('parseSchema', () => {
  it('returns an empty array for models with no required scalars', async () => {
    const { scalarFields } = await service.parseSchema('Product')

    expect(scalarFields).toEqual([])
  })

  it('includes required scalar fields', async () => {
    const { scalarFields } = await service.parseSchema('User')

    expect(
      scalarFields.find((field) => field.name === 'email'),
    ).not.toBeUndefined()
  })

  it('does not include non-required scalar fields', async () => {
    const { scalarFields } = await service.parseSchema('User')

    expect(scalarFields.find((field) => field.name === 'name')).toBeUndefined()
  })

  it('does not include required scalar fields with default values', async () => {
    const { scalarFields } = await service.parseSchema('User')

    expect(
      scalarFields.find((field) => field.name === 'isAdmin'),
    ).toBeUndefined()
  })

  it('includes foreign key scalars', async () => {
    const { scalarFields } = await service.parseSchema('UserProfile')

    expect(
      scalarFields.find((field) => field.name === 'userId'),
    ).not.toBeUndefined()
  })

  it('does not include prisma-generated helper fields', async () => {
    const { scalarFields } = await service.parseSchema('UserProfile')

    expect(scalarFields.find((field) => field.name === 'user')).toBeUndefined()
  })

  it('returns an empty object for models with no relations', async () => {
    const { relations } = await service.parseSchema('User')

    expect(relations).toEqual({})
  })

  it('returns relations', async () => {
    const { relations } = await service.parseSchema('UserProfile')

    expect(relations).toEqual({
      user: { foreignKey: ['userId'], type: 'User' },
    })
  })

  it('returns relations for join tables', async () => {
    const { relations } = await service.parseSchema('TagsOnProducts')

    expect(relations).toEqual({
      tag: { foreignKey: ['tagId'], type: 'Tag' },
      product: { foreignKey: ['productId'], type: 'Product' },
    })
  })

  it('properly captures relationships with different field name than related model', async () => {
    const { relations } = await service.parseSchema('Feature')

    expect(relations).toEqual({
      inventory: { foreignKey: ['inventoryId'], type: 'Product' },
    })
  })

  it('returns an empty array for models with no foreign keys', async () => {
    const { foreignKeys } = await service.parseSchema('User')

    expect(foreignKeys).toEqual([])
  })

  it('returns foreign keys', async () => {
    const { foreignKeys } = await service.parseSchema('UserProfile')

    expect(foreignKeys).toEqual(['userId'])
  })
})

describe('fieldsToScenario', () => {
  it('includes scalar fields', async () => {
    const output = await service.fieldsToScenario(
      [
        { name: 'email', type: 'String' },
        { name: 'date', type: 'DateTime' },
        { name: 'bigInt', type: 'BigInt' },
        { name: 'integer', type: 'Int' },
        { name: 'boolean', type: 'Boolean' },
      ],
      {},
      [],
    )

    expect(output.email).toEqual('String')

    expect(output.date instanceof Date).toBe(true)
    expect(!isNaN(output.date)).toBe(true)

    expect(output.integer).toEqual(parseInt(output.integer))
    expect(typeof output.integer).toBe('number')

    expect(output.boolean).toEqual(true)
    expect(typeof output.boolean).toBe('boolean')

    expect(output.bigInt).toMatch(/^\d+n$/)
    expect(typeof output.bigInt).toBe('string') // pseudo-bigint
  })

  it('includes dependent relationships', async () => {
    // fields for a Post model
    const output = await service.fieldsToScenario(
      [
        { name: 'title', type: 'String' },
        { name: 'userId', type: 'Integer' },
      ],
      { user: { foreignKey: 'userId', type: 'User' } },
      ['userId'],
    )

    expect(Object.keys(output)).toEqual(['title', 'user'])
    expect(Object.keys(output.user)).toEqual(['create'])
    expect(Object.keys(output.user.create)).toEqual(['email'])
  })

  it('properly looks up related models by type', async () => {
    // fields for a Post model
    const output = await service.fieldsToScenario(
      [
        { name: 'title', type: 'String' },
        { name: 'userId', type: 'Integer' },
      ],
      // note that relationship name is "author" but datatype is "User"
      { author: { foreignKey: 'authorId', type: 'User' } },
      ['userId'],
    )

    expect(Object.keys(output)).toEqual(['title', 'author'])
    expect(Object.keys(output.author)).toEqual(['create'])
    expect(Object.keys(output.author.create)).toEqual(['email'])
  })
})

test("doesn't include test file when --tests is set to false", async () => {
  const baseArgs = {
    ...getDefaultArgs(service.defaults),
    javascript: true,
  }

  const files = await service.files({
    ...baseArgs,
    name: 'User',
    tests: false,
  })

  expect(Object.keys(files)).toEqual([
    path.normalize('/path/to/project/api/src/services/users/users.js'),
  ])
})
