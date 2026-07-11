export const schema = `
  type User {
    id: Int!
    email: String!
    fullName: String!
    roles: String
    posts: [Post]!
  }

  type Query {
    user(id: Int!): User @skipAuth
  }

  input CreateUserInput {
    email: String!
    fullName: String!
    roles: String
  }

  input UpdateUserInput {
    email: String
    fullName: String
    roles: String
  }
`;
