import fs from 'fs'
import path from 'path'

import {
  beforeAll,
  afterAll,
  afterEach,
  vi,
  test,
  expect,
  describe,
} from 'vitest'

import {
  generateTypeDefGraphQLApi,
  generateTypeDefGraphQLWeb,
} from '../generate/graphqlCodeGen'
import { generateGraphQLSchema } from '../generate/graphqlSchema'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main',
)

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
})

afterAll(() => {
  delete process.env.RWJS_CWD
})

afterEach(() => {
  vi.restoreAllMocks()
})

vi.mock('@prisma/client', () => {
  return {
    default: {
      ModelName: {
        PrismaModelOne: 'PrismaModelOne',
        PrismaModelTwo: 'PrismaModelTwo',
        Post: 'Post',
        Todo: 'Todo',
      },
    },
  }
})

test('Generate gql typedefs web', async () => {
  await generateGraphQLSchema()

  vi.spyOn(fs, 'writeFileSync').mockImplementation(
    (file: fs.PathOrFileDescriptor, data: string | ArrayBufferView) => {
      expect(file).toMatch(path.join('web', 'types', 'graphql.d.ts'))
      expect(data).toMatchSnapshot()
    },
  )

  const { typeDefFiles, errors } = await generateTypeDefGraphQLWeb()
  expect(errors).toHaveLength(0)

  expect(typeDefFiles).toHaveLength(1)
  expect(typeDefFiles[0]).toMatch(path.join('web', 'types', 'graphql.d.ts'))
})

test('Generate gql typedefs api', async () => {
  await generateGraphQLSchema()

  let codegenOutput: {
    file: fs.PathOrFileDescriptor
    data: string | ArrayBufferView
  } = { file: '', data: '' }

  vi.spyOn(fs, 'writeFileSync').mockImplementation(
    (file: fs.PathOrFileDescriptor, data: string | ArrayBufferView) => {
      codegenOutput = { file, data }
    },
  )

  const { typeDefFiles } = await generateTypeDefGraphQLApi()

  expect(typeDefFiles).toHaveLength(1)
  expect(typeDefFiles[0]).toMatch(path.join('api', 'types', 'graphql.d.ts'))

  const { file, data } = codegenOutput

  expect(file).toMatch(path.join('api', 'types', 'graphql.d.ts'))
  // Catchall to prevent unexpected changes to the generated file
  expect(data).toMatchSnapshot()

  // Check that JSON types are imported from prisma
  expect(data).toContain('JSON: Prisma.JsonValue;')
  expect(data).toContain('JSONObject: Prisma.JsonObject;')
  expect(data).toContain('Byte: Buffer;')

  // Check that prisma model imports are added to the top of the file
  expect(data).toContain(
    "import { PrismaModelOne as PrismaPrismaModelOne, PrismaModelTwo as PrismaPrismaModelTwo, Post as PrismaPost, Todo as PrismaTodo } from '@prisma/client'",
  )

  // Check printMappedModelsPlugin works correctly
  expect(data).toContain(
    `type MaybeOrArrayOfMaybe<T> = T | Maybe<T> | Maybe<T>[]`,
  )

  // Should only contain the SDL models that are also in Prisma
  expect(data).toContain(`type AllMappedModels = MaybeOrArrayOfMaybe<Todo>`)
})

test('respects user provided codegen config', async () => {
  const customCodegenConfigPath = path.join(FIXTURE_PATH, 'codegen.yml')

  // Add codegen.yml to fixture folder
  fs.writeFileSync(
    customCodegenConfigPath,
    `config:
  omitOperationSuffix: false
  namingConvention:
    typeNames: change-case-all#upperCase`,
  )

  // Wrapping in `try` to make sure codegen.yml is always deleted, even if the
  // test fails
  try {
    await generateGraphQLSchema()
    const {
      typeDefFiles: [outputPath],
    } = await generateTypeDefGraphQLWeb()

    const gqlTypesOutput = fs.readFileSync(outputPath, 'utf-8')

    // Should be upper cased type
    expect(gqlTypesOutput).toContain('ADDTODO_CREATETODOMUTATION')

    // because we override omitOperationSuffix to false, it should append QUERY
    // for __fixtures__/example-todo-main/../NumTodosCell.js
    expect(gqlTypesOutput).toContain('NUMTODOSCELL_GETCOUNTQUERY')
  } finally {
    // Delete added codegen.yml
    fs.rmSync(customCodegenConfigPath)
  }
})

test("Doesn't throw or print any errors with empty project", async () => {
  const fixturePath = path.resolve(
    __dirname,
    '../../../../__fixtures__/empty-project',
  )
  process.env.RWJS_CWD = fixturePath
  const oldConsoleError = console.error
  console.error = vi.fn()

  try {
    await generateGraphQLSchema()
    await generateTypeDefGraphQLWeb()
    await generateTypeDefGraphQLApi()
  } catch (e) {
    console.error(e)
    // Fail if any of the three above calls throws an error
    expect(false).toBeTruthy()
  }

  try {
    expect(console.error).not.toHaveBeenCalled()
  } finally {
    console.error = oldConsoleError
    delete process.env.RWJS_CWD
  }
})

describe("Doesn't swallow legit errors", () => {
  test('invalidQueryType', async () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/graphqlCodeGen/invalidQueryType',
    )
    process.env.RWJS_CWD = fixturePath

    const { errors } = await generateTypeDefGraphQLWeb()
    expect((errors[0].error as Error).toString()).toMatch(
      /field.*softKitten.*Query/,
    )

    delete process.env.RWJS_CWD
  })

  test('missingType', async () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/graphqlCodeGen/missingType',
    )
    process.env.RWJS_CWD = fixturePath

    const { errors } = await generateTypeDefGraphQLWeb()
    expect((errors[0].error as Error).toString()).toMatch(/Unknown type.*Todo/)

    delete process.env.RWJS_CWD
  })

  test('nonExistingField', async () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/graphqlCodeGen/nonExistingField',
    )
    process.env.RWJS_CWD = fixturePath

    const { errors } = await generateTypeDefGraphQLWeb()
    expect((errors[0].error as Error).toString()).toMatch(/field.*done.*Todo/)

    delete process.env.RWJS_CWD
  })
})
