export const someOtherQuery = gql`
  query FindSoftKitten($id: String!) {
    softKitten: softKitten(id: $id) {
      id
    }
  }
`
