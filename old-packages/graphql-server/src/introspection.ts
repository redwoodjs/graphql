import type { GraphQLYogaOptions } from './types'

export const configureGraphQLIntrospection = ({
  allowIntrospection,
}: {
  allowIntrospection?: GraphQLYogaOptions['allowIntrospection']
}) => {
  const isDevEnv = process.env.NODE_ENV === 'development'

  const disableIntrospection =
    isDevEnv && (allowIntrospection ?? true) ? false : !allowIntrospection

  return {
    disableIntrospection,
  }
}
