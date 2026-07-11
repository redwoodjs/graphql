import type { DataObject } from './cellTypes.js'

/**
 * The default `isEmpty` implementation checks if any of the fields are `null`
 * or an empty array.
 *
 * Consider the following queries. The former returns an object, the latter a list:
 *
 * ```js
 * export const QUERY = gql`
 *   post {
 *     title
 *   }
 * `
 *
 * export const QUERY = gql`
 *   posts {
 *     title
 *   }
 * `
 * ```
 *
 * If either are "empty", they return:
 *
 * ```js
 * {
 *   data: {
 *     post: null
 *   }
 * }
 *
 * {
 *   data: {
 *     posts: []
 *   }
 * }
 * ```
 *
 * Note that the latter can return `null` as well depending on the SDL (`posts: [Post!]`).
 */
export function isDataEmpty(data?: DataObject) {
  return (
    !data ||
    Object.values(data).every((fieldValue) => {
      return fieldValue === null || isFieldEmptyArray(fieldValue)
    })
  )
}

function isFieldEmptyArray(field: unknown) {
  return Array.isArray(field) && field.length === 0
}
