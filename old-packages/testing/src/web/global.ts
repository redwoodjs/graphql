import type {
  mockGraphQLQuery as _mockGraphQLQuery,
  mockGraphQLMutation as _mockGraphQLMutation,
} from './mockRequests'

declare global {
  const mockGraphQLQuery: typeof _mockGraphQLQuery
  const mockGraphQLMutation: typeof _mockGraphQLMutation
  // @NOTE: not exposing mockCurrentUser here, because api side also has this functionality
  // We do this in the type generator
}
