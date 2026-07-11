import path from 'path'

import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from 'vitest'

import { getResolverFnType } from '../generate/graphqlCodeGen'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main',
)

// Pretend project is strict-mode
let mockedTSConfigs = {
  api: null,
  web: null,
}
vi.mock('../project', () => {
  return {
    getTsConfigs: () => {
      return mockedTSConfigs
    },
  }
})

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
})

afterAll(() => {
  delete process.env.RWJS_CWD
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ResovlerFn types', () => {
  it('Uses optional function args on JS projects', () => {
    // Note args and obj are optional
    expect(getResolverFnType()).toMatchInlineSnapshot(`
      "(
            args?: TArgs,
            obj?: { root: TParent; context: TContext; info: GraphQLResolveInfo }
          ) => TResult | Promise<TResult>"
    `)
  })

  it('Uses optional function args when strict mode is off', () => {
    mockedTSConfigs = {
      api: {
        compilerOptions: {
          strict: false,
        },
      },
      web: null,
    }

    // Note args and obj are optional
    expect(getResolverFnType()).toMatchInlineSnapshot(`
      "(
            args?: TArgs,
            obj?: { root: TParent; context: TContext; info: GraphQLResolveInfo }
          ) => TResult | Promise<TResult>"
    `)
  })

  it('ResolverFn uses non-optional function args in strict mode', () => {
    // Prertend project is strict mode
    mockedTSConfigs = {
      api: {
        compilerOptions: {
          strict: true,
        },
      },
      web: null,
    }

    // Note args and obj are NOT optional
    expect(getResolverFnType()).toMatchInlineSnapshot(`
      "(
            args: TArgs,
            obj?: { root: TParent; context: TContext; info: GraphQLResolveInfo }
          ) => TResult | Promise<TResult>"
    `)
  })
})
