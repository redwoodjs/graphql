export const QUERY = gql`
  query FindTestQuery($id: Int!) {
    test: test(id: $id) {
      id
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => (
  <div style={{ color: 'red' }}>Error: {error?.message}</div>
)

export const Success = ({ test }) => {
  return <div>{JSON.stringify(test)}</div>
}
