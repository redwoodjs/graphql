export const schema = gql`
  type Query {
    """
    A field that resolves fast.
    """
    fastField: String! @skipAuth

    """
    A field that resolves slowly.
    Maybe you want to @defer this field ;)
    """
    slowField(waitFor: Int! = 5000): String @skipAuth
  }
`
