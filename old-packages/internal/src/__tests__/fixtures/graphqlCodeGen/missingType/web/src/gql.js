export const CREATE_TODO_CELL = gql`
  mutation AddTodo_CreateTodo_Cell($body: String!) {
    createTodo(body: $body) {
      id
      task
    }
  }
`
