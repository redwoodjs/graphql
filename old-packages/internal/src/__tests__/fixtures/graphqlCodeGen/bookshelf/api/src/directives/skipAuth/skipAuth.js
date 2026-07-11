import gql from 'graphql-tag'

import { createValidatorDirective } from '@redwoodjs/graphql-server'

export const schema = gql`
  directive @skipAuth on FIELD_DEFINITION
`

const skipAuth = createValidatorDirective(schema, () => {
  return
})

export default skipAuth
