import type { APIGatewayProxyEvent, Context } from 'aws-lambda'
import { vi, describe, expect, it } from 'vitest'

import { createLogger } from '@redwoodjs/api/logger'

import { createGraphQLHandler } from '../../functions/graphql'

vi.mock('../../makeMergedSchema', () => {
  const { makeExecutableSchema } = require('@graphql-tools/schema')

  // Return executable schema
  return {
    makeMergedSchema: () =>
      makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Author {
            id: Int!
            name: String!
            posts: [Post]
          }

          type Post {
            id: Int!
            title: String!
            body: String!
            author: Author
          }

          type Query {
            author: Author
            posts: [Post!]!
            post(id: Int!): Post
          }
        `,
        resolvers: {
          Query: {
            author: () => {
              return {
                id: 1,
                name: 'Bob',
                posts: [{ id: 1, title: 'Ba', body: 'Zinga' }],
              }
            },
            posts: () => {
              return [
                {
                  id: 1,
                  title: 'Ba',
                  body: 'Zinga',
                  author: { id: 1, name: 'Bob' },
                },
              ]
            },
            post: (id) => {
              return {
                id,
                title: 'Ba',
                body: 'Zinga',
                author: { id: 1, name: 'Bob' },
              }
            },
          },
        },
      }),
  }
})

vi.mock('../../directives/makeDirectives', () => {
  return {
    makeDirectivesForPlugin: () => [],
  }
})

interface MockLambdaParams {
  headers?: { [key: string]: string }
  body?: string | null
  httpMethod: string
  [key: string]: any
}

const mockLambdaEvent = ({
  headers,
  body = null,
  httpMethod,
  ...others
}: MockLambdaParams): APIGatewayProxyEvent => {
  return {
    headers: headers || {},
    body,
    httpMethod,
    multiValueQueryStringParameters: null,
    isBase64Encoded: false,
    multiValueHeaders: {}, // this is silly - the types require a value. It definitely can be undefined, e.g. on Vercel.
    path: '/graphql',
    pathParameters: null,
    stageVariables: null,
    queryStringParameters: null,
    requestContext: null as any,
    resource: null as any,
    ...others,
  }
}

describe('useArmor secures the GraphQLHandler endpoint for depth, aliases, cost, and other optimistic protections', () => {
  const createHandler = (armorConfig) => {
    return createGraphQLHandler({
      armorConfig,
      loggerConfig: {
        logger: createLogger({}),
        options: {},
      },
      sdls: {},
      directives: {},
      services: {},
      onException: () => {},
    })
  }

  const mockedEvent = mockLambdaEvent({
    headers: {
      'Content-Type': 'application/json',
    },
    httpMethod: 'POST',
  })

  const mockQuery = (query) => {
    const event = mockedEvent
    mockedEvent.body = JSON.stringify({ query })
    return event
  }

  const mockGraphQLRequest = async (query, armorConfig?) => {
    const handler = createHandler(armorConfig)
    return await handler(mockQuery(query), {} as Context)
  }

  describe('when blocking field suggestion', () => {
    describe('with defaults', () => {
      it('returns the field suggestion masked', async () => {
        const query = '{ posts { id, toootle } }'
        const response = await mockGraphQLRequest(query)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Cannot query field "toootle" on type "Post". [Suggestion hidden]?"',
        )
      })
    })

    describe('when disabled', () => {
      it('returns the field suggestion', async () => {
        const query = '{ posts { id, toootle } }'
        const armorConfig = {
          blockFieldSuggestion: { enabled: false },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Cannot query field "toootle" on type "Post". Did you mean "title"?"',
        )
      })
    })

    describe('with a custom suggestion mask', () => {
      it('returns the field suggestion masked with the custom masking', async () => {
        const query = '{ posts { id, toootle } }'
        const armorConfig = {
          blockFieldSuggestion: { mask: '<REDACTED>' },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Cannot query field "toootle" on type "Post". <REDACTED>?"',
        )
      })
    })
  })

  describe('when enforcing max query depth', () => {
    describe('with defaults', () => {
      it('returns depth warning message', async () => {
        const query = `
        {
          posts {
            id
            title
            author {
              id
              posts {
                id
                author {
                  id
                  posts {
                    id
                    author {
                      id
                      posts {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }`

        const response = await mockGraphQLRequest(query)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Query depth limit of 6 exceeded, found 8."',
        )
      })
    })

    describe('when disabled', () => {
      it('returns no errors', async () => {
        const query = `
        {
          posts {
            id
            title
            author {
              id
              posts {
                id
                author {
                  id
                  posts {
                    id
                    author {
                      id
                      posts {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }`

        const armorConfig = {
          maxDepth: { enabled: false },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(data.posts).toBeDefined()
        expect(response.statusCode).toBe(200)
        expect(errors).toBeUndefined()
      })
    })

    describe('with a custom depth', () => {
      it('returns the depth warning with the custom level', async () => {
        const query = `
        {
          posts {
            id
            title
            author {
              id
              posts {
                id
                author {
                  id
                  posts {
                    id
                    author {
                      id
                      posts {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }`

        const armorConfig = {
          maxDepth: { n: 4 },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Query depth limit of 4 exceeded, found 8."',
        )
      })
    })
  })

  describe('when enforcing the number of aliases in a GraphQL document', () => {
    describe('with defaults', () => {
      it('allows up to 15', async () => {
        const query = `
        {
          postsAlias1: posts {
            id
            id1: id
            id2: id
            id3: id
            id4: id
            id5: id
            title
            title1: title
            title2: title
            title3: title
            title4: title
            title5: title
          }
        }`

        const response = await mockGraphQLRequest(query)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data.postsAlias1[0].id1).toEqual(1)
        expect(errors).toBeUndefined()
      })

      it('protects when more than 15 aliases', async () => {
        const query = `
          {
            postsAlias1: posts {
              id
              id1: id
              id2: id
              id3: id
              id4: id
              id5: id
              id6: id
              id7: id
              id8: id
              id9: id
              id10: id
              title
              title1: title
              title2: title
              title3: title
              title4: title
              title5: title
              title6: title
              title7: title
              title8: title
              title9: title
              title10: title
            }
      }`

        const response = await mockGraphQLRequest(query)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Aliases limit of 15 exceeded, found 21."',
        )
      })
    })

    describe('when disabled', () => {
      it('returns no errors', async () => {
        const query = `
          {
            postsAlias1: posts {
              id
              id1: id
              id2: id
              id3: id
              id4: id
              id5: id
              id6: id
              id7: id
              id8: id
              id9: id
              id10: id
              title
              title1: title
              title2: title
              title3: title
              title4: title
              title5: title
              title6: title
              title7: title
              title8: title
              title9: title
              title10: title
            }
          }`

        const armorConfig = {
          maxAliases: { enabled: false },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(errors).toBeUndefined()
        expect(data.postsAlias1[0].id1).toEqual(1)
      })
    })

    describe('wtih a custom alias maximum', () => {
      it('protects at that level', async () => {
        const query = `
          {
            postsAlias1: posts {
              id
              id1: id
              id2: id
              title
              title1: title
              title2: title
              title3: title
            }
          }`

        const armorConfig = {
          maxAliases: { n: 3 },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Aliases limit of 3 exceeded, found 6."',
        )
      })
    })
  })

  /**
   * Parsing a GraphQL operation document is a very expensive and compute intensive operation that blocks the JavaScript event loop.
   * If an attacker sends a very complex operation document with slight variations over and over again he can easily degrade the performance of the GraphQL server.
   * Because of the variations simply having an LRU cache for parsed operation documents is not enough.
   *
   * A potential solution is to limit the maximal allowed count of tokens within a GraphQL document.
   *
   * In computer science, lexical analysis, lexing or tokenization is the process of converting a sequence of characters into a sequence of lexical tokens.
   * E.g. given the following GraphQL operation.
   *
   * graphql {
   *   me {
   *     id
   *     user
   *   }
   * }
   *
   * The tokens are query, {, me, {, id, user, } and }. Having a total count of 8 tokens.
   * The optimal maximum token count for your application depends on the complexity of the GrapHQL operations and documents. Usually 800-2000 tokens seems like a sane default.
   *
   * GraphQL Armor provides a default maximum token count of 1000 tokens.
   *
   * Note: When reporting the number of found tokens as in
   *
   * '"Syntax Error: Token limit of 2 exceeded."'
   *
   *
   */
  describe('when protecting against token complexity', () => {
    describe('with a custom max', () => {
      it('enforces a smaller limit', async () => {
        const query = '{ posts { id, title } }'
        const armorConfig = {
          maxTokens: { n: 2 },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Token limit of 2 exceeded."',
        )
      })
    })
  })

  describe('when protecting maximum directives', () => {
    describe('with defaults', () => {
      it('cannot apply an unknown directive', async () => {
        const query = '{  __typename @a @a @a @a }'
        const response = await mockGraphQLRequest(query)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Unknown directive "@a"."',
        )
      })
    })

    describe('when disabled', () => {
      it('cannot apply an unknown directive', async () => {
        const query = '{  __typename @a @a @a @a }'
        const armorConfig = {
          maxDirectives: { enabled: false },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Unknown directive "@a"."',
        )
      })
    })

    describe('with a custom max', () => {
      it('enforces a smaller limit', async () => {
        const query = '{  __typename @a @a @a @a }'
        const armorConfig = {
          maxDirectives: { n: 2 },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Directives limit of 2 exceeded, found 4."',
        )
      })
    })
  })

  describe('when protecting cost limit', () => {
    describe('with defaults', () => {
      it('allows basic queries', async () => {
        const query = '{ posts { id, title } }'
        const response = await mockGraphQLRequest(query)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeDefined()
        expect(data.posts[0]).toEqual({ id: 1, title: 'Ba' })
        expect(errors).toBeUndefined()
      })
    })

    describe('when disabled', () => {
      it('allows a more costly limit', async () => {
        const query = '{ posts { id, title } }'
        const armorConfig = {
          costLimit: { enabled: false, objectCost: 5000 },
        }
        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(errors).toBeUndefined()
        expect(data.posts[0]).toEqual({ id: 1, title: 'Ba' })
      })
    })

    describe('with a custom max', () => {
      it('enforces a smaller limit', async () => {
        const query = '{ posts { id, title } }'

        const armorConfig = {
          costLimit: { maxCost: 1 },
        }

        // we have two scalars id and title worth 1 each
        // that's 2 at a level 1 with a factor of 1.5
        // 2 * (1 * 1.5) = 3
        // it's parent object of posts and worth 2
        // so 3 + 2 = 5 total cost

        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Query Cost limit of 1 exceeded, found 5."',
        )
      })
    })

    describe('with a custom calculation', () => {
      it('enforces a larger scalar cost', async () => {
        const query = '{ posts { id, title } }'

        const armorConfig = {
          costLimit: { maxCost: 10, scalarCost: 7 },
        }

        // we have two scalars id and title worth 7 each
        // that's 14 at a level 1 with a factor of 1.5
        // 14 * (1 * 1.5) = 21
        // it's parent object of posts and worth 2
        // so 21 + 2 = 23 total cost

        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Query Cost limit of 10 exceeded, found 23."',
        )
      })

      it('enforces a larger object cost', async () => {
        const query = '{ posts { id, title } }'

        const armorConfig = {
          costLimit: { maxCost: 2000, objectCost: 5000 },
        }

        // we have two scalars id and title worth 1 each
        // that's 2 at a level 1 with a factor of 1.5
        // 2 * (1 * 1.5) = 3
        // it's parent object of posts and worth 5000
        // so 3 + 500 = 5003 total cost

        const response = await mockGraphQLRequest(query, armorConfig)
        const { data, errors } = JSON.parse(response.body)

        expect(response.statusCode).toBe(200)
        expect(data).toBeUndefined()
        expect(errors[0].message).toMatchInlineSnapshot(
          '"Syntax Error: Query Cost limit of 2000 exceeded, found 5003."',
        )
      })
    })

    it('enforces a larger depthCostFactor cost', async () => {
      const query = '{ posts { id, title } }'

      const armorConfig = {
        costLimit: { maxCost: 20, depthCostFactor: 11 },
      }

      // we have two scalars id and title worth 1 each
      // that's 2 at a level 1 with a factor of 1.5
      // 2 * (1 * 11) = 22
      // it's parent object of posts and worth 2
      // so 22 + 2 = 24 total cost

      const response = await mockGraphQLRequest(query, armorConfig)
      const { data, errors } = JSON.parse(response.body)

      expect(response.statusCode).toBe(200)
      expect(data).toBeUndefined()
      expect(errors[0].message).toMatchInlineSnapshot(
        '"Syntax Error: Query Cost limit of 20 exceeded, found 24."',
      )
    })
  })
})
