// @ts-nocheck
/* eslint-disable */

import type { BazingaQuery } from 'types/graphql'

import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'

export const QUERY = gql`
  query BazingaQuery($id: String!) {
    member: member(id: $id) {
      id
    }
  }
`

const someOtherQuery = gql`
query FindSoftKitten($id: String!) {
    softKitten: softKitten(id: $id) {
      id
    }
  }
`

gql`query JustForFun {
  itsFriday {}
}`

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }: CellFailureProps) => (
  <div style={{ color: 'red' }}>Error: {error.message}</div>
)

export const success = () => {
  return Success ? <Success {...standard()} /> : null
}
