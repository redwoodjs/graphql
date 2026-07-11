export const schema = gql`
  type Todo {
    id: Int!
    body: String!
    status: String!
  }

  type Query {
    todos: [Todo] @skipAuth
    todosCount: Int! @skipAuth
  }

  type Mutation {
    createTodo(body: String!): Todo @skipAuth
    updateTodoStatus(id: Int!, status: String!): Todo @skipAuth
    renameTodo(id: Int!, body: String!): Todo @skipAuth
  }
`
