import * as fs from 'fs'
import * as path from 'path'

import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { getPaths } from '@redwoodjs/project-config'

import { redwoodFastifyWeb } from './web'

let original_RWJS_CWD: string | undefined

beforeAll(() => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = path.join(__dirname, '__fixtures__/main')
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
})

describe('redwoodFastifyWeb', () => {
  // Suppress terminal logging.
  console.log = vi.fn()

  // Set up and teardown the fastify instance with options.
  let fastifyInstance: FastifyInstance

  const port = 8910

  beforeAll(async () => {
    fastifyInstance = Fastify()

    await fastifyInstance.register(redwoodFastifyWeb)

    await fastifyInstance.ready()
  })

  afterAll(async () => {
    await fastifyInstance.close()
  })

  describe('serves prerendered files', () => {
    it('serves the prerendered about page', async () => {
      const url = '/about'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(path.join(getPaths().web.dist, `${url}.html`), 'utf-8'),
      )
    })

    it('serves the prerendered new contact page', async () => {
      const url = '/contacts/new'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(path.join(getPaths().web.dist, `${url}.html`), 'utf-8'),
      )
    })

    // We don't serve files named index.js at the root level.
    // This logic ensures nested files aren't affected.
    it('serves the prerendered nested index page', async () => {
      const url = '/nested/index'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(path.join(getPaths().web.dist, `${url}.html`), 'utf-8'),
      )
    })

    it('serves prerendered files with certain headers', async () => {
      await fastifyInstance.listen({ port })

      const res = await fetch(`http://localhost:${port}/about`)
      const headers = [...res.headers.keys()]

      expect(headers).toMatchInlineSnapshot(`
      [
        "accept-ranges",
        "cache-control",
        "connection",
        "content-length",
        "content-type",
        "date",
        "etag",
        "keep-alive",
        "last-modified",
      ]
    `)
    })

    // I'm not sure if this was intentional, but we support it.
    // We may want to use the `@fastify/static` plugin's `allowedPath` option.
    // See https://github.com/fastify/fastify-static?tab=readme-ov-file#allowedpath.
    it('serves prerendered files at `${routeName}.html`', async () => {
      const url = '/about.html'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(path.join(getPaths().web.dist, url), 'utf-8'),
      )
    })

    it('handles not found by serving a fallback', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/absent.html',
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/html; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(path.join(getPaths().web.dist, '200.html'), 'utf-8'),
      )
    })
  })

  describe('serves pretty much anything in web dist', () => {
    it('serves the built AboutPage.js', async () => {
      const relativeFilePath = '/assets/AboutPage-7ec0f8df.js'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url: relativeFilePath,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe(
        'application/javascript; charset=UTF-8',
      )
      expect(res.body).toBe(
        fs.readFileSync(
          path.join(getPaths().web.dist, relativeFilePath),
          'utf-8',
        ),
      )
    })

    it('serves the built index.css', async () => {
      const relativeFilePath = '/assets/index-613d397d.css'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url: relativeFilePath,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/css; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(
          path.join(getPaths().web.dist, relativeFilePath),
          'utf-8',
        ),
      )
    })

    it('serves build-manifest.json', async () => {
      const relativeFilePath = '/build-manifest.json'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url: relativeFilePath,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe(
        'application/json; charset=UTF-8',
      )
      expect(res.body).toBe(
        fs.readFileSync(
          path.join(getPaths().web.dist, relativeFilePath),
          'utf-8',
        ),
      )
    })

    it('serves favicon.png', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/favicon.png',
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('image/png')
    })

    it('serves README.md', async () => {
      const relativeFilePath = '/README.md'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url: relativeFilePath,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/markdown; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(
          path.join(getPaths().web.dist, relativeFilePath),
          'utf-8',
        ),
      )
    })

    it('serves robots.txt', async () => {
      const relativeFilePath = '/robots.txt'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url: relativeFilePath,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe('text/plain; charset=UTF-8')
      expect(res.body).toBe(
        fs.readFileSync(
          path.join(getPaths().web.dist, relativeFilePath),
          'utf-8',
        ),
      )
    })
  })

  describe("returns a 404 for assets that can't be found", () => {
    it("returns a 404 for assets that can't be found", async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/assets/kittens.png',
      })

      expect(res.statusCode).toBe(404)
    })

    // This is testing current behavior - not ideal behavior. Feel free to
    // update this test if you change the behavior.
    // It's for the (hopefully rare) case where someone has a client-side
    // route for /assets
    it('returns a 200 for plain files, even in /assets/', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/assets/kittens',
      })

      expect(res.statusCode).toBe(200)
    })

    it('handles "."s in route segments', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/my.page/foo',
      })

      expect(res.statusCode).toBe(200)
    })

    it('handles "."s in last route segment', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/foo/my.page',
      })

      expect(res.statusCode).toBe(200)
    })

    it('handles filenames in route segments', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/file-route/fake.js',
      })

      expect(res.statusCode).toBe(200)
    })

    it('handles "."s in query params', async () => {
      const res = await fastifyInstance.inject({
        method: 'GET',
        url: '/my-page?loading=spinner.blue',
      })

      expect(res.statusCode).toBe(200)
    })
  })

  describe('serves an error at a misconfigured apiUrl', () => {
    it('handles the root path', async () => {
      const url = '/.redwood/functions/'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      )
      expect(res.body).toMatchInlineSnapshot(
        `"{"data":null,"errors":[{"message":"Bad Gateway: you may have misconfigured apiUrl and apiProxyTarget. If apiUrl is a relative URL, you must provide apiProxyTarget.","extensions":{"code":"BAD_GATEWAY","httpStatus":502}}]}"`,
      )
    })

    it('handles subpaths', async () => {
      const url = '/.redwood/functions/graphql'

      const res = await fastifyInstance.inject({
        method: 'GET',
        url,
      })

      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      )
      expect(res.body).toMatchInlineSnapshot(
        `"{"data":null,"errors":[{"message":"Bad Gateway: you may have misconfigured apiUrl and apiProxyTarget. If apiUrl is a relative URL, you must provide apiProxyTarget.","extensions":{"code":"BAD_GATEWAY","httpStatus":502}}]}"`,
      )
    })
  })
})
