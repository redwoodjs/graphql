import { makeExecutableSchema } from '@graphql-tools/schema'

export const testSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      me: User!
    }

    type Query {
      forbiddenUser: User!
      getUser(id: Int!): User!
    }

    type User {
      id: ID!
      name: String!
    }
  `,
  resolvers: {
    Query: {
      me: () => {
        return { _id: 1, firstName: 'Ba', lastName: 'Zinga' }
      },
      forbiddenUser: () => {
        throw Error('You are forbidden')
      },
      getUser: (id) => {
        return { id, firstName: 'Ba', lastName: 'Zinga' }
      },
    },
    User: {
      id: (u) => u._id,
      name: (u) => `${u.firstName} ${u.lastName}`,
    },
  },
})

export const testLiveSchema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    """
    Instruction for establishing a live connection that is updated once the underlying data changes.
    """
    directive @live(
      """
      Whether the query should be live or not.
      """
      if: Boolean = true

      """
      Propose a desired throttle interval ot the server in order to receive updates to at most once per "throttle" milliseconds. The server must not accept this value.
      """
      throttle: Int
    ) on QUERY

    type Query {
      me: User!
    }

    type Query {
      forbiddenUser: User!
      getUser(id: Int!): User!
    }

    type User {
      id: ID!
      name: String!
    }
  `,
  resolvers: {
    Query: {
      me: () => {
        return { _id: 1, firstName: 'Ba', lastName: 'Zinga' }
      },
      forbiddenUser: () => {
        throw Error('You are forbidden')
      },
      getUser: (id) => {
        return { id, firstName: 'Ba', lastName: 'Zinga' }
      },
    },
    User: {
      id: (u) => u._id,
      name: (u) => `${u.firstName} ${u.lastName}`,
    },
  },
})
export const testQuery = /* GraphQL */ `
  query meQuery {
    me {
      id
      name
    }
  }
`

export const testFilteredQuery = /* GraphQL */ `
  query FilteredQuery {
    me {
      id
      name
    }
  }
`

export const testErrorQuery = /* GraphQL */ `
  query forbiddenUserQuery {
    forbiddenUser {
      id
      name
    }
  }
`

export const testLiveQuery = /* GraphQL */ `
  query meQuery @live {
    me {
      id
      name
    }
  }
`

export const testParseErrorQuery = /* GraphQL */ `
  query ParseErrorQuery {
    me {
      id
      name
      unknown_field
    }
  }
`

export const testValidationErrorQuery = /* GraphQL */ `
  query ValidationErrorQuery(id: Int!) {
    getUser(id: 'one') {
      id
      name
    }
  }
`
