import fs from 'fs'
import path from 'path'

import Fastify from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getPaths } from '@redwoodjs/project-config'

import { redwoodFastifyWeb } from './web'

let original_RWJS_CWD: string | undefined

beforeAll(() => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = path.join(__dirname, '__fixtures__/fallback')
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
})

describe('webFallback', () => {
  it("handles not found by serving index.html if 200.html doesn't exist", async () => {
    const fastify = Fastify()
    await fastify.register(redwoodFastifyWeb, {
      redwood: {
        apiProxyTarget: 'http://localhost:8911',
      },
    })
    await fastify.ready()

    const url = '/index.html'

    const res = await fastify.inject({
      method: 'GET',
      url,
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
    expect(res.body).toBe(
      fs.readFileSync(path.join(getPaths().web.dist, url), 'utf-8'),
    )

    await fastify.close()
  })
})
