import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { configureGraphQLIntrospection } from '../introspection'

describe('configureGraphQLIntrospection', () => {
  describe('when not in development environment', () => {
    const curNodeEnv = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'not-development'
    })

    afterAll(() => {
      process.env.NODE_ENV = curNodeEnv
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should not disable GraphQL Introspection when allowIntrospection is true', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        allowIntrospection: true,
      })

      expect(disableIntrospection).toBe(false)
    })

    it('should disable GraphQL Introspection when allowIntrospection is false', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        allowIntrospection: false,
      })

      expect(disableIntrospection).toBe(true)
    })

    it('should disable GraphQL Introspection when allowIntrospection is not provided', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({})

      expect(disableIntrospection).toBe(true)
    })

    it('should disable GraphQL Introspection when allowIntrospection is undefined', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        allowIntrospection: undefined,
      })

      expect(disableIntrospection).toBe(true)
    })

    it('should disable GraphQL Introspection when allowIntrospection is null', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        // @ts-expect-error - We don't explicitly allow null, but we will cover it in the tests anyway
        allowIntrospection: null,
      })

      expect(disableIntrospection).toBe(true)
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

    it('should not disable GraphQL Introspection when allowIntrospection is true', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        allowIntrospection: true,
      })

      expect(disableIntrospection).toBe(false)
    })

    it('should disable GraphQL Introspection when allowIntrospection is false', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        allowIntrospection: false,
      })

      expect(disableIntrospection).toBe(true)
    })

    it('should not disable GraphQL Introspection when allowIntrospection is not provided', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({})

      expect(disableIntrospection).toBe(false)
    })

    it('should not disable GraphQL Introspection when allowIntrospection is undefined', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        allowIntrospection: undefined,
      })

      expect(disableIntrospection).toBe(false)
    })

    it('should not disable GraphQL Introspection when allowIntrospection is null', () => {
      const { disableIntrospection } = configureGraphQLIntrospection({
        // @ts-expect-error - We don't explicitly allow null, but we will cover it in the tests anyway
        allowIntrospection: null,
      })

      expect(disableIntrospection).toBe(false)
    })
  })
})
