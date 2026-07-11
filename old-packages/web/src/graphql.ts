import { Kind, type DocumentNode } from 'graphql'

/**
 * Given a query like the one below this function will return
 * `FindBlogPostQuery`
 *
 * ```
 *   export const QUERY = gql`
 *     query FindBlogPostQuery($id: Int!) {
 *       blogPost: post(id: $id) {
 *         id
 *         title
 *         body
 *         createdAt
 *       }
 *     }
 *   `
 * ```
 *
 * @param {DocumentNode} document
 *   graphql query or mutation to get the operation name for
 * @returns {string} empty string if no operation name could be found
 */
export function getOperationName(document: DocumentNode) {
  for (const definition of document.definitions) {
    if (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.name?.value
    ) {
      return definition.name.value
    }
  }

  return ''
}
