export const schema = gql`
  type User {
    id: Int!
    email: String!
    fullName: String!
    roles: String
    posts: [Post]!
  }
`

export const isAuthenticated = () => {
  return !!context.currentUser
}
