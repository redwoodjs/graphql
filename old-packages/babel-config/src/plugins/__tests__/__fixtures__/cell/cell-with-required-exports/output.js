import { createCell } from '@redwoodjs/web'
export const QUERY = gql`
  query {
    posts {
      id
      title
      body
    }
  }
`
export const beforeQuery = () => ({})
export const afterQuery = () => ({})
export function Loading() {
  return 'Loading'
}
export function Empty() {
  return 'Empty'
}
export function Failure({ error }) {
  return error.message
}
export const Success = ({ posts }) => {
  return JSON.stringify(posts, null, 2)
}
export default createCell({
  QUERY,
  beforeQuery,
  afterQuery,
  Loading,
  Empty,
  Failure,
  Success,
  displayName: 'code',
})
