import path from 'path'

import gql from 'graphql-tag'
import { beforeAll, afterAll, describe, test, expect } from 'vitest'

import { validateSchema } from '../validateSchema'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main',
)

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
})
afterAll(() => {
  delete process.env.RWJS_CWD
})

describe('SDL with no reserved names used', () => {
  describe('SDL is valid', () => {
    test('with proper type definition names', () => {
      const document = gql`
        type Message {
          from: String
          body: String
        }

        type Query {
          room(id: ID!): [Message!]! @skipAuth
        }

        input SendMessageInput {
          roomId: ID!
          from: String!
          body: String!
        }

        type Mutation {
          sendMessage(input: SendMessageInput!): Message! @skipAuth
        }
      `

      expect(() => validateSchema(document)).not.toThrowError()
    })
    test('with proper interface interface definition names', () => {
      const document = gql`
        interface Node {
          id: ID!
        }

        type Message implements Node {
          id: ID!
          from: String
          body: String
        }

        type Query {
          room(id: ID!): [Message!]! @skipAuth
        }
      `
      expect(() => validateSchema(document)).not.toThrowError()
    })
    test('with proper interface input type definition names', () => {
      const document = gql`
        type Message {
          from: String
          body: String
        }

        type Query {
          room(id: ID!): [Message!]! @skipAuth
        }

        input SendMessageInput {
          roomId: ID!
          from: String!
          body: String!
        }

        type Mutation {
          sendMessage(input: SendMessageInput!): Message! @skipAuth
        }
      `
      expect(() => validateSchema(document)).not.toThrowError()
    })
  })

  describe('SDL is invalid', () => {
    test('because uses a reserved name as a type', () => {
      const document = gql`
        type Float {
          from: String
          body: String
        }

        type Query {
          room(id: ID!): [Message!]! @skipAuth
        }

        input SendMessageInput {
          roomId: ID!
          from: String!
          body: String!
        }

        type Mutation {
          sendMessage(input: SendMessageInput!): Message! @skipAuth
        }
      `
      expect(() => validateSchema(document)).toThrowErrorMatchingSnapshot()
    })
  })

  test('because uses a reserved name as an input', () => {
    const document = gql`
      type Message {
        from: String
        body: String
      }

      type Query {
        room(id: ID!): [Message!]! @skipAuth
      }

      input Float {
        roomId: ID!
        from: String!
        body: String!
      }

      type Mutation {
        sendMessage(input: SendMessageInput!): Message! @skipAuth
      }
    `
    expect(() => validateSchema(document)).toThrowErrorMatchingSnapshot()
  })

  test('because uses a reserved name as an interface', () => {
    const document = gql`
      interface Float {
        id: ID!
      }

      type Message implements Float {
        id: ID!
        from: String
        body: String
      }

      type Query {
        room(id: ID!): [Message!]! @skipAuth
      }

      input SendMessageInput {
        roomId: ID!
        from: String!
        body: String!
      }

      type Mutation {
        sendMessage(input: SendMessageInput!): Message! @skipAuth
      }
    `
    expect(() => validateSchema(document)).toThrowErrorMatchingSnapshot()
  })
})
