export const schema = `
  type Post {
    id: Int!
    title: String!
    body: String!
    authorId: Int!
    author: User!
    createdAt: DateTime!
  }

  type Query {
    posts: [Post!]! @skipAuth
    post(id: Int!): Post @skipAuth
  }

  input CreatePostInput {
    title: String!
    body: String!
    authorId: Int!
  }

  input UpdatePostInput {
    title: String
    body: String
    authorId: Int
  }

  type Mutation {
    createPost(input: CreatePostInput!): Post! @requireAuth
    updatePost(id: Int!, input: UpdatePostInput!): Post! @requireAuth
    deletePost(id: Int!): Post! @requireAuth
  }
`;
