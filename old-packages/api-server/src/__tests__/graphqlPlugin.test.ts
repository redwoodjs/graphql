import path from 'path'

import fastifyMultipart from '@fastify/multipart'
import {
  vi,
  beforeAll,
  afterAll,
  describe,
  afterEach,
  it,
  expect,
} from 'vitest'

import createFastifyInstance from '../fastify'
import { redwoodFastifyGraphQLServer } from '../plugins/graphql'

// Set up RWJS_CWD.
let original_RWJS_CWD: string | undefined

beforeAll(async () => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = path.join(__dirname, './fixtures/redwood-app')
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
})

describe('RedwoodFastifyGraphqlServer Fastify Plugin', () => {
  beforeAll(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    vi.mocked(console.log).mockRestore()
    vi.mocked(console.warn).mockRestore()
  })

  it('registers the fastify multipart plugin to support graphql-uploads', async () => {
    const fastifyInstance = await createFastifyInstance()

    const registerSpy = vi.spyOn(fastifyInstance, 'register')

    // Although this is not how you normally register a plugin, we're going to
    // doing it this way gives us the ability to spy on the register method
    await redwoodFastifyGraphQLServer(fastifyInstance, {
      redwood: {},
    })

    expect(registerSpy).toHaveBeenCalledWith(fastifyMultipart)

    await fastifyInstance.close()
  })
})
