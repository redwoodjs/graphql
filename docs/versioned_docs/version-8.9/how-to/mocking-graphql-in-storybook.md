# Mocking GraphQL in Storybook

## Pre-requisites

1. Storybook should be running, start it by running `yarn rw storybook`
2. Have a Cell, Query, or Mutation that you would like to mock

## Where to put mock-requests

1. Mock-requests placed in a file ending with `.mock.js|ts` are automatically imported and become globally scoped, which means that they will be available in all of your stories.
2. Mock-requests in a story will be locally scoped and will overwrite globally scoped mocks.

## Mocking a Cell's Query

Locate the file ending with `.mock.js` in your Cell's folder. This file exports a value named `standard`, which is the mock-data that will be returned for your Cell's `QUERY`.

```jsx {3,4,5,11,12,13} title="UserProfileCell/UserProfileCell.js"
export const QUERY = gql`
  query UserProfileQuery {
    userProfile {
      id
    }
  }
`

// UserProfileCell/UserProfileCell.mock.js
export const standard = {
  userProfile: {
    id: 42,
  },
}
```

The value assigned to `standard` is the mock-data associated to the `QUERY`, so modifying the `QUERY` means you need to modify the mock-data.

```diff title="UserProfileCell/UserProfileCell.js"
export const QUERY = gql`
  query UserProfileQuery {
    userProfile {
       id
+       name
    }
  }
`

// UserProfileCell/UserProfileCell.mock.js
export const standard = {
  userProfile: {
    id: 42,
+    name: 'peterp',
  }
}
```

> Behind the scenes: Redwood uses the value associated to `standard` as the second argument to `mockGraphQLQuery`.

### GraphQL request variables

If you want to dynamically modify mock-data based on a queries variables the `standard` export can also be a function, and the first parameter will be an object containing the variables:

```jsx {1,6} title="UserProfileCell/UserProfileCell.mock.js"
export const standard = (variables) => {
  return {
    userProfile: {
      id: 42,
      name: 'peterp',
      profileImage: `https://example.com/profile.png?size=${variables.size}`,
    },
  }
}
```

## Mocking a GraphQL Query

If you're not using a Cell, or if you want to overwrite a globally scoped mock, you can use `mockGraphQLQuery`:

```jsx title="Header/Header.stories.js"
export const withReallyLongName = () => {
  mockGraphQLQuery('UserProfileQuery', () => {
    return {
      userProfile: {
        id: 99,
        name: 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.'
      }
    }
  })
  return <Header />
}
```

## Mocking a GraphQL Mutation

Use `mockGraphQLMutation`:

```jsx title="UserProfileCell/UserProfileCell.mock.js"
export const standard =
  /* ... */

  mockGraphQLMutation('UpdateUserName', ({ name }) => {
    return {
      userProfile: {
        id: 99,
        name,
      },
    }
  })
```

## Mock-requests that intentionally produce errors

`mockGraphQLQuery` and `mockGraphQLMutation` have access to `ctx` which allows you to modify the mock-response:

```jsx
mockGraphQLQuery('UserProfileQuery', (_vars, { ctx }) => {
  // Forbidden
  ctx.status(403)
})
```
