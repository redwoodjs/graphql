import { afterAll, beforeAll, vi, describe, expect, it } from 'vitest'

import { configureGraphiQLPlayground } from '../graphiql'

describe('configureGraphiQLPlayground', () => {
  describe('when not in development environment', () => {
    const curNodeEnv = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'not-development'
    })

    afterAll(() => {
      process.env.NODE_ENV = curNodeEnv
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should return false when no config is provided', () => {
      const result = configureGraphiQLPlayground({})

      expect(result).toBe(false)
    })

    it('should configure the GraphiQL Playground when allowGraphiQL is true', () => {
      const result = configureGraphiQLPlayground({
        allowGraphiQL: true,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).not.toBe(false)
      expect(result).toMatchSnapshot()
    })

    it('should return false when allowGraphiQL is false', () => {
      const result = configureGraphiQLPlayground({
        allowGraphiQL: false,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).toBe(false)
    })

    it('should return false when allowGraphiQL is not provided', () => {
      const result = configureGraphiQLPlayground({
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).toBe(false)
    })

    it('should return false when allowGraphiQL is undefined', () => {
      const result = configureGraphiQLPlayground({
        allowGraphiQL: undefined,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).toBe(false)
    })

    it('should return false when allowGraphiQL is null', () => {
      const result = configureGraphiQLPlayground({
        // @ts-expect-error - We don't explicitly allow null, but we will cover
        // it in the tests anyway
        allowGraphiQL: null,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).toBe(false)
    })
  })

  describe('when in development', () => {
    const curNodeEnv = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'development'
    })

    afterAll(() => {
      process.env.NODE_ENV = curNodeEnv
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should configure the GraphiQL Playground when no config is provided', () => {
      const result = configureGraphiQLPlayground({})

      expect(result).not.toBe(false)
      expect(result).toMatchSnapshot()
    })

    it('should configure the GraphiQL Playground when allowGraphiQL is true', () => {
      const result = configureGraphiQLPlayground({
        allowGraphiQL: true,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).not.toBe(false)
      expect(result).toMatchSnapshot()
    })

    it('should configure the GraphiQL Playground when allowGraphiQL is false', () => {
      const result = configureGraphiQLPlayground({
        allowGraphiQL: false,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).toBe(false)
    })

    it('should configure the GraphiQL Playground when allowGraphiQL is not provided', () => {
      const result = configureGraphiQLPlayground({
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).not.toBe(false)
      expect(result).toMatchSnapshot()
    })

    it('should configure the GraphiQL Playground when allowGraphiQL is undefined', () => {
      const result = configureGraphiQLPlayground({
        allowGraphiQL: undefined,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).not.toBe(false)
      expect(result).toMatchSnapshot()
    })

    it('should configure the GraphiQL Playground when allowGraphiQL is null', () => {
      const result = configureGraphiQLPlayground({
        // @ts-expect-error - We don't explicitly allow null, but we will cover
        // it in the tests anyway
        allowGraphiQL: null,
        generateGraphiQLHeader: vi.fn(),
      })

      expect(result).not.toBe(false)
      expect(result).toMatchSnapshot()
    })
  })
})
