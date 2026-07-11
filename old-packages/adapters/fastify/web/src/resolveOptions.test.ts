import path from 'path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resolveOptions } from './resolveOptions'

let original_RWJS_CWD: string | undefined

beforeAll(() => {
  original_RWJS_CWD = process.env.RWJS_CWD
  process.env.RWJS_CWD = path.join(__dirname, '__fixtures__/main')
})

afterAll(() => {
  process.env.RWJS_CWD = original_RWJS_CWD
})

describe('resolveOptions', () => {
  // The possible values we will support for apiUrl and apiProxyTarget are:
  // apiUrl: (aka prefix)
  //  - undefined
  //  - empty
  //  - relative
  //  - fully-qualified
  // apiProxyTarget: (aka upstream)
  //  - undefined
  //  - empty
  //  - relative
  //  - fully-qualified

  describe('undefined apiUrl', () => {
    it('relative apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: undefined,
            apiProxyTarget: '/api',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: If you provide \`apiProxyTarget\`, it has to be a fully-qualified URL. \`apiProxyTarget\` is '/api']`,
      )
    })

    it('fully-qualified apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiUrl: undefined,
            apiProxyTarget: 'http://api.foo.com',
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": false,
          },
          "redwoodOptions": {
            "apiProxyTarget": "http://api.foo.com",
            "apiUrl": "/.redwood/functions",
          },
        }
      `)
    })
  })

  describe('empty apiUrl', () => {
    it('undefined apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: '',
            apiProxyTarget: undefined,
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: \`apiUrl\` cannot be an empty string]`,
      )
    })

    it('empty apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: '',
            apiProxyTarget: '',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: \`apiUrl\` cannot be an empty string]`,
      )
    })

    it('relative apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: '',
            apiProxyTarget: '/api',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: \`apiUrl\` cannot be an empty string]`,
      )
    })

    it('fully-qualified apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: '',
            apiProxyTarget: 'http://api.foo.com',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: \`apiUrl\` cannot be an empty string]`,
      )
    })
  })

  describe('relative apiUrl', () => {
    it('undefined apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiUrl: '/api',
            apiProxyTarget: undefined,
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": true,
          },
          "redwoodOptions": {
            "apiProxyTarget": undefined,
            "apiUrl": "/api",
          },
        }
      `)
    })

    it('empty apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiUrl: '/api',
            apiProxyTarget: '',
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": true,
          },
          "redwoodOptions": {
            "apiProxyTarget": "",
            "apiUrl": "/api",
          },
        }
      `)
    })

    it('relative apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: '/api',
            apiProxyTarget: '/api',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: If you provide \`apiProxyTarget\`, it has to be a fully-qualified URL. \`apiProxyTarget\` is '/api']`,
      )
    })

    it('fully-qualified apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiUrl: '/api',
            apiProxyTarget: 'http://api.foo.com',
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": false,
          },
          "redwoodOptions": {
            "apiProxyTarget": "http://api.foo.com",
            "apiUrl": "/api",
          },
        }
      `)
    })
  })

  describe('fully-qualified apiUrl', () => {
    it('undefined apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiUrl: 'http://api.foo.com',
            apiProxyTarget: undefined,
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": false,
          },
          "redwoodOptions": {
            "apiProxyTarget": undefined,
            "apiUrl": "http://api.foo.com",
          },
        }
      `)
    })

    it('empty apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiUrl: 'http://api.foo.com',
            apiProxyTarget: '',
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": false,
          },
          "redwoodOptions": {
            "apiProxyTarget": "",
            "apiUrl": "http://api.foo.com",
          },
        }
      `)
    })

    it('relative apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: 'http://api.foo.com',
            apiProxyTarget: '/api',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: If you provide \`apiProxyTarget\`, it has to be a fully-qualified URL. \`apiProxyTarget\` is '/api']`,
      )
    })

    it('fully-qualified apiProxyTarget', () => {
      expect(() =>
        resolveOptions({
          redwood: {
            apiUrl: 'http://api.foo.com',
            apiProxyTarget: 'http://api.foo.com',
          },
        }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: If you provide \`apiProxyTarget\`, \`apiUrl\` cannot be a fully-qualified URL. \`apiUrl\` is 'http://api.foo.com']`,
      )
    })
  })

  describe('apiHost', () => {
    it('apiHost is a deprecated alias of apiProxyTarget', () => {
      expect(
        resolveOptions({
          redwood: {
            apiHost: 'http://api.foo.com',
          },
        }),
      ).toMatchInlineSnapshot(`
        {
          "flags": {
            "shouldRegisterApiUrl": false,
          },
          "redwoodOptions": {
            "apiProxyTarget": "http://api.foo.com",
            "apiUrl": "/.redwood/functions",
          },
        }
      `)
    })
  })
})
