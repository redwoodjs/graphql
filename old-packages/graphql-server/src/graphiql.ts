import type { GraphiQLOptions } from './types'
// import { isDevEnv } from './util'

const DEFAULT_QUERY = `query Redwood {
  redwood {
    version
  }
}`

export const configureGraphiQLPlayground = ({
  allowGraphiQL,
  generateGraphiQLHeader,
}: GraphiQLOptions) => {
  const isDevEnv = process.env.NODE_ENV === 'development'

  const disableGraphiQL =
    isDevEnv && (allowGraphiQL ?? true) ? false : !allowGraphiQL

  return !disableGraphiQL
    ? {
        title: 'Redwood GraphQL Playground',
        headers: generateGraphiQLHeader?.(),
        defaultQuery: DEFAULT_QUERY,
        headerEditorEnabled: true,
      }
    : false
}
