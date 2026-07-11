export const schema = gql`
  type Book {
    id: Int!
    title: String!
    Shelf: Shelf
    shelfId: Int
  }

  type Query {
    books: [Book!]! @requireAuth
    book(id: Int!): Book @requireAuth
  }

  input CreateBookInput {
    title: String!
    shelfId: Int
  }

  input UpdateBookInput {
    title: String
    shelfId: Int
  }

  type Mutation {
    createBook(input: CreateBookInput!): Book! @requireAuth
    updateBook(id: Int!, input: UpdateBookInput!): Book! @requireAuth
    deleteBook(id: Int!): Book! @requireAuth
  }
`
