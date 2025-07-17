import type { GraphQLResolveInfo } from 'graphql'
import { parse, graphql, GraphQLError } from 'graphql'
import gql from 'graphql-tag'
import { vi, describe, expect, it } from 'vitest'

import {
  makeDirectivesForPlugin,
  createTransformerDirective,
  createValidatorDirective,
} from '../directives/makeDirectives'
import { makeMergedSchema } from '../makeMergedSchema'
import type {
  GraphQLTypeWithFields,
  ServicesGlobImports,
  SdlGlobImports,
} from '../types'

vi.mock('@redwoodjs/project-config', () => {
  return {
    getConfig: () => {
      return {
        experimental: {
          opentelemetry: {
            enabled: false,
          },
        },
      }
    },
  }
})

describe('makeMergedSchema', () => {
  // Simulate `importAll`
  // ./graphql/tests.sdl.js
  const sdls = {
    tests: {
      schema: parse(`
        type MyOwnType {
          inTypeResolverAndServices: String
          inTypeResolver: String
          inTypeServices: String
        }

        type MySecondType {
          name: String
          inTypeResolver: String
        }

        type MyDuplicateType {
          name: String
          inTypeResolver: String
        }

        union MyUnionType = MyOwnType | MySecondType

        union MyUnionTypeWithSameFields = MySecondType |  MyDuplicateType

        type Query {
          myOwnType: MyOwnType @foo
          searchType: MyUnionType @foo
          searchTypeSameFields: MyUnionTypeWithSameFields @foo
          searchTypeSameFieldsWithTypename: MyUnionTypeWithSameFields @foo
          inResolverAndServices: String @foo
          inResolver: String @foo
          inServices: String @foo
          foo: String @foo
        }
      `),
      resolvers: {
        MyOwnType: {
          inTypeResolverAndServices: () =>
            "MyOwnType: I'm defined in the resolver.",
          inTypeResolver: () => "MyOwnType: I'm defined in the resolver.",
        },
        MySecondType: {
          inTypeResolver: () => "MySecondType: I'm defined in the resolver.",
        },
        Query: {
          inResolverAndServices: () => "I'm defined in the resolver.",
          inResolver: () => "I'm defined in the resolver.",
          foo: () => "I'm using @foo directive",
          searchType: () => ({
            name: 'MySecondType',
            inTypeResolver: "MySecondType: I'm defined in the resolver.",
          }),
          searchTypeSameFields: () => ({
            name: 'MySecondType',
            inTypeResolver: "MySecondType: I'm defined in the resolver.",
          }),
          searchTypeSameFieldsWithTypename: () => ({
            __typename: 'MySecondType',
            name: 'MySecondType',
            inTypeResolver: "MySecondType: I'm defined in the resolver.",
          }),
        },
      },
    },
  } as unknown as SdlGlobImports

  // ./services/tests.js
  const services = {
    tests: {
      MyOwnType: {
        inTypeServices: () => "MyOwnType: I'm defined in the services.",
      },
      inResolverAndServices: () => 'I should NOT be called.',
      inServices: () => "I'm defined in the service.",
    },
  } as unknown as ServicesGlobImports

  // mimics the directives glob file structure
  const fooSchema = gql`
    directive @foo on FIELD_DEFINITION
  `

  const bazingaSchema = gql`
    directive @bazinga on FIELD_DEFINITION
  `

  const barSchema = gql`
    directive @bar on FIELD_DEFINITION
  `
  const directiveFiles = {
    foo_directive: {
      schema: fooSchema,
      foo: createTransformerDirective(fooSchema, () => 'I am foo'),
    },
    nested_bazinga_directive: {
      bazinga: createValidatorDirective(bazingaSchema, async () => {
        throw new Error('Only soft kittens allowed')
      }),
      schema: bazingaSchema,
    },
    heavily_nested_bar_directive: {
      bar: createTransformerDirective(barSchema, () => 'I am bar'),
      schema: barSchema,
    },
  }

  const schema = makeMergedSchema({
    sdls,
    services,
    subscriptions: [],
    directives: makeDirectivesForPlugin(directiveFiles),
  })

  describe('Query Type', () => {
    const queryType = schema.getType('Query') as GraphQLTypeWithFields
    const queryFields = queryType.getFields()

    it('Resolver functions are mapped correctly.', () => {
      expect(
        queryFields.inResolver.resolve?.(
          null,
          {},
          null,
          {} as GraphQLResolveInfo,
        ),
      ).toEqual("I'm defined in the resolver.")
    })

    it('Resolver functions take preference over service functions.', () => {
      expect(
        queryFields.inResolverAndServices.resolve?.(
          null,
          {},
          null,
          {} as GraphQLResolveInfo,
        ),
      ).toEqual("I'm defined in the resolver.")
    })

    it('Service functions are mapped correctly.', async () => {
      expect(
        queryFields.inServices.resolve &&
          (await queryFields.inServices.resolve(
            null,
            {},
            null,
            {} as GraphQLResolveInfo,
          )),
      ).toEqual("I'm defined in the service.")
    })
  })

  describe('MyOwnType', () => {
    const myOwnType = schema.getType('MyOwnType') as GraphQLTypeWithFields
    const myOwnTypeFields = myOwnType.getFields()

    it('Resolver functions are mapped correctly', () => {
      expect(
        myOwnTypeFields.inTypeResolverAndServices.resolve?.(
          null,
          {},
          null,
          {} as GraphQLResolveInfo,
        ),
      ).toEqual("MyOwnType: I'm defined in the resolver.")
    })

    it('Resolver functions take preference over service functions.', () => {
      expect(
        myOwnTypeFields.inTypeResolver.resolve?.(
          null,
          {},
          null,
          {} as GraphQLResolveInfo,
        ),
      ).toEqual("MyOwnType: I'm defined in the resolver.")
    })

    it('Service functions are mapped correctly.', async () => {
      expect(
        myOwnTypeFields.inTypeServices.resolve &&
          (await myOwnTypeFields.inTypeServices.resolve(
            null,
            {},
            null,
            {} as GraphQLResolveInfo,
          )),
      ).toEqual("MyOwnType: I'm defined in the services.")
    })
  })

  describe('MyUnionType', () => {
    it('supports querying a union and having __resolveType correctly created to decide what member it is', async () => {
      const query = `query {
        searchType {
          ... on MySecondType {
            name
          }
        }
      }`
      const res = await graphql({ schema, source: query })
      expect(res.errors).toBeUndefined()
      expect((res.data as any).searchType.name).toBe('MySecondType')
    })
  })

  describe('MyUnionTypeSameFields', () => {
    it('throws an error if union types have same fields and resolver cannot resolve the correct type', async () => {
      const query = `query {
        searchTypeSameFields {
          ... on MySecondType {
            name
          }
        }
      }`
      const res = await graphql({ schema, source: query })
      expect(res.errors).toEqual([
        new GraphQLError(
          'Unable to resolve correct type for union. Try adding unique fields to each type or __typename to each resolver',
        ),
      ])
      expect((res.data as any).searchTypeSameFields).toBeNull()
    })
  })

  describe('MyUnionTypeWithTypename', () => {
    it('supports querying a union and having __resolveType correctly created to decide what member it is', async () => {
      const query = `query {
        searchTypeSameFieldsWithTypename {
          ... on MySecondType {
            name
          }
        }
      }`
      const res = await graphql({ schema, source: query })
      expect(res.errors).toBeUndefined()
      expect((res.data as any).searchTypeSameFieldsWithTypename.name).toBe(
        'MySecondType',
      )
    })
  })

  describe('Directives', () => {
    it('Confirms that directives have been made from a set of files and added to schema.', () => {
      expect(schema.getDirective('foo')).toBeTruthy()
      expect(schema.getDirective('bazinga')).toBeTruthy()
      expect(schema.getDirective('bar')).toBeTruthy()
    })

    it('Checks that an unknown directive does not get added to the schema.', () => {
      expect(schema.getDirective('misdirective')).toBeFalsy()
    })
  })
})
