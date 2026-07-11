/* eslint-env jest */
// @ts-check

// @NOTE without these imports in the setup file, mockCurrentUser
// will remain undefined in the user's tests
// Remember to use specific imports
const { defineScenario } = require('@redwoodjs/testing/dist/api/scenario')

// @NOTE we do this because jest.setup.js runs every time in each context
// while jest-preset runs once. This significantly reduces memory footprint, and testing time
// The key is to reduce the amount of imports in this file, because the require.cache is not shared between each test context
const { apiSrcPath, tearDownCachePath, dbSchemaPath } =
  global.__RWJS__TEST_IMPORTS

global.defineScenario = defineScenario

// Error codes thrown by [MySQL, SQLite, Postgres] when foreign key constraint
// fails on DELETE
const FOREIGN_KEY_ERRORS = [1451, 1811, 23503]
const TEARDOWN_CACHE_PATH = tearDownCachePath
const DEFAULT_SCENARIO = 'standard'
let teardownOrder = []
let originalTeardownOrder = []

const deepCopy = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

const isIdenticalArray = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b)
}

const configureTeardown = async () => {
  const { getDMMF, getSchema } = require('@prisma/internals')
  const fs = require('fs')

  // @NOTE prisma utils are available in cli lib/schemaHelpers
  // But avoid importing them, to prevent memory leaks in jest
  const datamodel = await getSchema(dbSchemaPath)
  const schema = await getDMMF({ datamodel })
  const schemaModels = schema.datamodel.models.map((m) => m.dbName || m.name)

  // check if pre-defined delete order already exists and if so, use it to start
  if (fs.existsSync(TEARDOWN_CACHE_PATH)) {
    teardownOrder = JSON.parse(fs.readFileSync(TEARDOWN_CACHE_PATH).toString())
  }

  // check the number of models in case we've added/removed since cache was built
  if (teardownOrder.length !== schemaModels.length) {
    teardownOrder = schemaModels
  }

  // keep a copy of the original order to compare against
  originalTeardownOrder = deepCopy(teardownOrder)
}

let quoteStyle
// determine what kind of quotes are needed around table names in raw SQL
const getQuoteStyle = async () => {
  const { getConfig: getPrismaConfig, getSchema } = require('@prisma/internals')

  // @NOTE prisma utils are available in cli lib/schemaHelpers
  // But avoid importing them, to prevent memory leaks in jest
  const datamodel = await getSchema(dbSchemaPath)

  if (!quoteStyle) {
    const config = await getPrismaConfig({
      datamodel,
    })

    switch (config.datasources?.[0]?.provider) {
      case 'mysql':
        quoteStyle = '`'
        break
      default:
        quoteStyle = '"'
    }
  }

  return quoteStyle
}

const getProjectDb = () => {
  const { db } = require(`${apiSrcPath}/lib/db`)

  return db
}

/**
 * Wraps "it" or "test", to seed and teardown the scenario after each test
 * This one passes scenario data to the test function
 */
const buildScenario =
  (itFunc, testPath) =>
  (...args) => {
    let scenarioName, testName, testFunc

    if (args.length === 3) {
      ;[scenarioName, testName, testFunc] = args
    } else if (args.length === 2) {
      scenarioName = DEFAULT_SCENARIO
      ;[testName, testFunc] = args
    } else {
      throw new Error('scenario() requires 2 or 3 arguments')
    }

    return itFunc(testName, async () => {
      let { scenario } = loadScenarios(testPath, scenarioName)

      const scenarioData = await seedScenario(scenario)
      try {
        const result = await testFunc(scenarioData)

        return result
      } finally {
        // Make sure to cleanup, even if test fails
        if (wasDbUsed()) {
          await teardown()
        }
      }
    })
  }

/**
 * This creates a describe() block that will seed the scenario ONCE before all tests in the block
 * Note that you need to use the getScenario() function to get the data.
 */
const buildDescribeScenario =
  (describeFunc, testPath) =>
  (...args) => {
    let scenarioName, describeBlockName, describeBlock

    if (args.length === 3) {
      ;[scenarioName, describeBlockName, describeBlock] = args
    } else if (args.length === 2) {
      scenarioName = DEFAULT_SCENARIO
      ;[describeBlockName, describeBlock] = args
    } else {
      throw new Error('describeScenario() requires 2 or 3 arguments')
    }

    return describeFunc(describeBlockName, () => {
      let scenarioData
      beforeAll(async () => {
        let { scenario } = loadScenarios(testPath, scenarioName)
        scenarioData = await seedScenario(scenario)
      })

      afterAll(async () => {
        if (wasDbUsed()) {
          await teardown()
        }
      })

      const getScenario = () => scenarioData

      describeBlock(getScenario)
    })
  }

const teardown = async () => {
  const fs = require('fs')

  const quoteStyle = await getQuoteStyle()

  for (const modelName of teardownOrder) {
    try {
      await getProjectDb().$executeRawUnsafe(
        `DELETE FROM ${quoteStyle}${modelName}${quoteStyle}`,
      )
    } catch (e) {
      const match = e.message.match(/Code: `(\d+)`/)
      if (match && FOREIGN_KEY_ERRORS.includes(parseInt(match[1]))) {
        const index = teardownOrder.indexOf(modelName)
        teardownOrder[index] = null
        teardownOrder.push(modelName)
      } else {
        throw e
      }
    }
  }

  // remove nulls
  teardownOrder = teardownOrder.filter((val) => val)

  // if the order of delete changed, write out the cached file again
  if (!isIdenticalArray(teardownOrder, originalTeardownOrder)) {
    originalTeardownOrder = deepCopy(teardownOrder)
    fs.writeFileSync(TEARDOWN_CACHE_PATH, JSON.stringify(teardownOrder))
  }
}

const seedScenario = async (scenario) => {
  if (scenario) {
    const scenarios = {}
    for (const [model, namedFixtures] of Object.entries(scenario)) {
      scenarios[model] = {}
      for (const [name, createArgs] of Object.entries(namedFixtures)) {
        if (typeof createArgs === 'function') {
          scenarios[model][name] = await getProjectDb()[model].create(
            createArgs(scenarios),
          )
        } else {
          scenarios[model][name] =
            await getProjectDb()[model].create(createArgs)
        }
      }
    }
    return scenarios
  } else {
    return {}
  }
}

global.scenario = buildScenario(global.it, global.testPath)
global.scenario.only = buildScenario(global.it.only, global.testPath)
global.describeScenario = buildDescribeScenario(
  global.describe,
  global.testPath,
)
global.describeScenario.only = buildDescribeScenario(
  global.describe.only,
  global.testPath,
)

/**
 *
 * All these hooks run in the VM/Context that the test runs in since we're using "setupAfterEnv".
 * There's a new context for each test-suite i.e. each test file
 *
 * Doing this means if the db isn't used in the current test context,
 * no need to do any of the teardown logic - allowing simple tests to run faster
 * At the same time, if the db is used, disconnecting it in this context prevents connection limit errors.
 * Just disconnecting db in jest-preset is not enough, because
 * the Prisma client is created in a different context.
 */
const wasDbUsed = () => {
  try {
    const libDbPath = require.resolve(`${apiSrcPath}/lib/db`)
    return Object.keys(require.cache).some((module) => {
      return module === libDbPath
    })
  } catch (e) {
    // If db wasn't resolved, no point trying to perform db resets
    return false
  }
}

// Attempt to emulate the request context isolation behavior
// This is a little more complicated than it would necessarily need to be
// but we're following the same pattern as in `@redwoodjs/context`
const mockContextStore = new Map()
const mockContext = new Proxy(
  {},
  {
    get: (_target, prop) => {
      // Handle toJSON() calls, i.e. JSON.stringify(context)
      if (prop === 'toJSON') {
        return () => mockContextStore.get('context')
      }
      return mockContextStore.get('context')[prop]
    },
    set: (_target, prop, value) => {
      const ctx = mockContextStore.get('context')
      ctx[prop] = value
      return true
    },
  },
)
jest.mock('@redwoodjs/context', () => {
  return {
    context: mockContext,
    setContext: (newContext) => {
      mockContextStore.set('context', newContext)
    },
  }
})
beforeEach(() => {
  mockContextStore.set('context', {})
})
global.mockCurrentUser = (currentUser) => {
  mockContextStore.set('context', { currentUser })
}

beforeAll(async () => {
  if (wasDbUsed()) {
    await configureTeardown()
  }
})

afterAll(async () => {
  if (wasDbUsed()) {
    getProjectDb().$disconnect()
  }
})

function loadScenarios(testPath, scenarioName) {
  const path = require('path')
  const testFileDir = path.parse(testPath)
  // e.g. ['comments', 'test'] or ['signup', 'state', 'machine', 'test']
  const testFileNameParts = testFileDir.name.split('.')
  const testFilePath = `${testFileDir.dir}/${testFileNameParts
    .slice(0, testFileNameParts.length - 1)
    .join('.')}.scenarios`
  let allScenarios, scenario

  try {
    allScenarios = require(testFilePath)
  } catch (e) {
    // ignore error if scenario file not found, otherwise re-throw
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e
    }
  }

  if (allScenarios) {
    if (allScenarios[scenarioName]) {
      scenario = allScenarios[scenarioName]
    } else {
      throw new Error(
        `UndefinedScenario: There is no scenario named "${scenarioName}" in ${testFilePath}.{js,ts}`,
      )
    }
  }
  return { scenario }
}
