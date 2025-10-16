# Trusted Documents

RedwoodJS can be setup to enforce [persisted operations](https://the-guild.dev/graphql/yoga-server/docs/features/persisted-operations) – alternatively called [Trusted Documents](https://benjie.dev/graphql/trusted-documents).

Use trusted documents if your GraphQL API is only for your own app (which is the case for most GraphQL APIs) for a massively decreased attack-surface, increased performance, and decreased bandwidth usage.

At app build time, Redwood will extract the GraphQL documents (queries, etc) and make them available to the server. At run time, you must then send "document id" or "hash" instead of the whole document as the server will only accept requests with a known document id.

This prevents malicious attackers from executing arbitrary GraphQL thus helping with unwanted resolver traversal or information leaking.

See [Configure Trusted Documents](#configure-trusted-documents) for more information and usage instructions.

## Trusted Documents Explained

When configured to use Trusted Documents, your project will:

1. When generating types, generate files in `web/src/graphql` needed for persisted aka trusted documents, for example:

```json title=web/src/graphql/persisted-documents.json
{
  "4dd4c49aef34e20af52efb50a1d0ebb0b8062b6d": "query FindAuthorQuery($id: Int!) { __typename author: user(id: $id) { __typename email fullName } }",
  "46e9823d95110ebb2ef17ef82fff5c19a468f8a6": "query FindBlogPostQuery($id: Int!) { __typename blogPost: post(id: $id) { __typename author { __typename email fullName } body createdAt id title } }",
  "421bcffdde84d448ec1a1b30b36eaeb966f00257": "query BlogPostsQuery { __typename blogPosts: posts { __typename author { __typename email fullName } body createdAt id title } }",
  "f6ae606548009c2cd4c69b9aecebad0a730ba23d": "mutation DeleteContactMutation($id: Int!) { __typename deleteContact(id: $id) { __typename id } }",
  "f7d2df28fcf87b0c29d225df79363d1c69159916": "query FindContactById($id: Int!) { __typename contact: contact(id: $id) { __typename createdAt email id message name } }",
  "7af93a7e454d9c59bbb77c14e0c78e99207fd0c6": "query FindContacts { __typename contacts { __typename createdAt email id message name } }",
  "e01ad8e899ac908458eac2d1f989b88160a0494b": "query EditContactById($id: Int!) { __typename contact: contact(id: $id) { __typename createdAt email id message name } }",
  "94f51784b918a52e9af64f3c1fd4356903b611f8": "mutation UpdateContactMutation($id: Int!, $input: UpdateContactInput!) { __typename updateContact(id: $id, input: $input) { __typename createdAt email id message name } }",
  "da35778949e1e8e27b7d1bb6b2a630749c5d7060": "mutation CreateContactMutation($input: CreateContactInput!) { __typename createContact(input: $input) { __typename id } }",
  "4f880f909a16b7fe15898fe33a2ee26933466719": "query EditPostById($id: Int!) { __typename post: post(id: $id) { __typename authorId body createdAt id title } }",
  "32b9225df81ff7845fedfa6d5c86c5d4a76073d2": "mutation UpdatePostMutation($id: Int!, $input: UpdatePostInput!) { __typename updatePost(id: $id, input: $input) { __typename authorId body createdAt id title } }",
  "daf229dcea085f1beff91102a63c2ba9c88e8481": "mutation CreatePostMutation($input: CreatePostInput!) { __typename createPost(input: $input) { __typename id } }",
  "e3405f6dcb6460943dd604423f0f517bc8318aaa": "mutation DeletePostMutation($id: Int!) { __typename deletePost(id: $id) { __typename id } }",
  "43a94ad9a150aa7a7a665c73a931a5b18b6cc28b": "query FindPostById($id: Int!) { __typename post: post(id: $id) { __typename authorId body createdAt id title } }",
  "76308e971322b1ece4cdff75185bb61d7139e343": "query FindPosts { __typename posts { __typename authorId body createdAt id title } }",
  "287beba179ef2c4448b4d3b150701993eddc07d6": "query BlogPostsQueryTrustedPage { __typename blogPosts: posts { __typename author { __typename email fullName } body createdAt id title } }"
}
```

2. They contain the query and hash that represents and identifies that query
3. Files with functions to lookup the generated trusted document such as:

```ts title=web/src/graphql/gql.ts
// ...
export function graphql(
  source: '\n  query FindPosts {\n    posts {\n      id\n      title\n      body\n      authorId\n      createdAt\n    }\n  }\n'
): (typeof documents)['\n  query FindPosts {\n    posts {\n      id\n      title\n      body\n      authorId\n      createdAt\n    }\n  }\n']
// ...
export function gql(source: string) {
  return graphql(source)
}
```

and the generated AST with the hash id in `web/src/graphql/graphql.ts`

```ts title=web/src/graphql/graphql.ts
// ...
export const FindPostsDocument = {
  __meta__: { hash: '76308e971322b1ece4cdff75185bb61d7139e343' },
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'FindPosts' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'posts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'body' } },
                { kind: 'Field', name: { kind: 'Name', value: 'authorId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<FindPostsQuery, FindPostsQueryVariables>
// ...
```

so that when a query or mutation is made, the web side GraphQL client doesn't send the query, but rather **just the hash id** so that the GraphQL Server can lookup the pre-generated query to run.

```http
{"operationName":"FindPosts","variables":{},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"76308e971322b1ece4cdff75185bb61d7139e343"}}}
```

It does so by adding a `api/src/lib/trustedDocumentsStore.ts` file for use on the GraphQL api side.

```ts title=api/src/lib/trustedDocumentsStore.ts
export const store = {
  // ...
  '76308e971322b1ece4cdff75185bb61d7139e343':
    'query FindPosts { __typename posts { __typename authorId body createdAt id title } }',
  // ...
}
```

:::note

See how the `76308e971322b1ece4cdff75185bb61d7139e343` hash ids match?
:::

Now, when the client requests to make a query for `76308e971322b1ece4cdff75185bb61d7139e343`, the GraphQL server knows to execute the corresponding query associated with that hash.

This means that because queries are pre-generated and the hash ids **must match**, there is no way for any un-trusted or ad-hoc queries to get executed by the GraphQL server.

Thus preventing unwanted queries or GraphQL traversal attacks,

- Configure RedwoodJS to use Trusted Documents via `redwood.toml`
- Configure the GraphQL Server

## Configure Trusted Documents

Below are instructions to manually configure Trusted Documents in your RedwoodJS project.

Alternatively, you can use the `yarn redwood setup graphql trusted-documents` [CLI setup command](../cli-commands.md#setup-graphql-trusted-docs).

### Configure redwood.toml

Setting `trustedDocuments` to true will

- populate `web/src/graphql` files with the pre-generated documents
- inform Apollo GraphQL client to send the document hashes and not the query itself

```toml title=redwood.toml
...
[graphql]
  trustedDocuments = true
...
```

### Configure GraphQL Handler

As part of GraphQL type and codegen, the `trustedDocumentsStore` is created in `api/src/lib`.

This is the same information that is created in `web/src/graphql/persisted-documents.json` but wrapped in a `store` that can be easily imported and passed to the GraphQL Handler.

#### Store

To enable trusted documents, configure `trustedDocuments` with the store.

```ts title=api/src/functions/graphql.ts
import { createGraphQLHandler } from '@redwoodjs/graphql-server'

// ...
import { store } from 'src/lib/trustedDocumentsStore'

export const handler = createGraphQLHandler({
  getCurrentUser,
  loggerConfig: { logger, options: {} },
  directives,
  sdls,
  services,
  trustedDocuments: { store },
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
```

#### Disable

You can disable the trustedDocuments `useRedwoodTrustedDocuments` plugin. The `store` is then optional.

```
  trustedDocuments: {
    disabled: true,
  }
```

#### Custom Errors

The `persistedQueryOnly` error message defaults to `'Use Trusted Only!'`.

If you'd like to customize the message when a query is not permitted, you can set the `persistedQueryOnly` configuration setting in `customErrors`:

```ts
  trustedDocuments: {
    store,
    customErrors: {
      persistedQueryOnly: 'This ad-hoc query is not allowed.'
    },
  }
```

You can also define a function to returns a `GraphQLError`. This function has access to the `payload`.

```ts
  trustedDocuments: {
    store,
    customErrors: {
      persistedQueryOnly: (payload) => {
        console.log('payload', payload)
        return new GraphQLError('Sorry!')
      },
    },
  }
```

In addition to the `persistedQueryOnly` custom error option, you can define error message for:

- `notFound` - Error to be thrown when the persisted operation is not found
- `keyNotFound` - Error to be thrown when the extraction of the persisted operation id failed

#### Skipping validation of persisted operations

If you validate your persisted operations while building your store, we recommend to skip the validation on the server. So this will reduce the work done by the server and the latency of the requests.

```
  trustedDocuments: {
    store,
    skipDocumentValidation: true,
  }
```

#### Allowing arbitrary GraphQL operations

Sometimes it is handy to allow non-persisted operations aside from the persisted ones. E.g. you want to allow developers to execute arbitrary GraphQL operations on your production server.

:::note Info
To support authentication, the `redwood.currentUser` query is always allowed.

Even if you define `allowArbitraryOperations` the plugin will always check for this request, so you don't need to add this check to any custom logic.
:::

This can be achieved using the `allowArbitraryOperations` option.

:::warning Important
Override this option with caution!
:::

For example, you can get a header from the request and allow:

```ts
allowArbitraryOperations: (request) => {
  return request.headers.get('x-allow-arbitrary-operations') === 'true'
}
```
