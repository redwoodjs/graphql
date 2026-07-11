import fs from 'node:fs'
import path from 'node:path'

import { describe, test } from 'vitest'

import { findUp } from '@redwoodjs/project-config'

describe('fragments graphQLClientConfig', () => {
  test('App.tsx with no graphQLClientConfig', async () => {
    await matchFolderTransform('appGqlConfigTransform', 'config-simple', {
      useJsCodeshift: true,
    })
  })

  test('App.tsx with existing inline graphQLClientConfig', async () => {
    await matchFolderTransform('appGqlConfigTransform', 'existingPropInline', {
      useJsCodeshift: true,
    })
  })

  test('App.tsx with existing graphQLClientConfig in separate variable', async () => {
    await matchFolderTransform(
      'appGqlConfigTransform',
      'existingPropVariable',
      {
        useJsCodeshift: true,
      },
    )
  })

  test('App.tsx with existing graphQLClientConfig in separate variable, without cacheConfig property', async () => {
    await matchFolderTransform(
      'appGqlConfigTransform',
      'existingPropVariableNoCacheConfig',
      {
        useJsCodeshift: true,
      },
    )
  })

  test('App.tsx with existing graphQLClientConfig in separate variable with non-standard name', async () => {
    await matchFolderTransform(
      'appGqlConfigTransform',
      'existingPropVariableCustomName',
      {
        useJsCodeshift: true,
      },
    )
  })

  test('test-project App.tsx', async () => {
    const rootFwPath = path.dirname(findUp('lerna.json') || '')
    const testProjectAppTsx = fs.readFileSync(
      path.join(
        rootFwPath,
        '__fixtures__',
        'test-project',
        'web',
        'src',
        'App.tsx',
      ),
      'utf-8',
    )
    await matchInlineTransformSnapshot(
      'appGqlConfigTransform',
      testProjectAppTsx,
      `import type { ReactNode } from 'react'

      import { FatalErrorBoundary, RedwoodProvider } from \"@redwoodjs/web\";
      import { RedwoodApolloProvider } from \"@redwoodjs/web/apollo\";

      import FatalErrorPage from \"src/pages/FatalErrorPage\";

      import { AuthProvider, useAuth } from \"./auth\";

      import \"./index.css\";
      import \"./scaffold.css\";

      interface AppProps {
        children?: ReactNode;
      }

      const graphQLClientConfig = {
        cacheConfig: {
          possibleTypes: possibleTypes.possibleTypes,
        },
      };

      const App = ({ children }: AppProps) => (
        <FatalErrorBoundary page={FatalErrorPage}>
          <RedwoodProvider titleTemplate=\"%PageTitle | %AppTitle\">
            <AuthProvider>
              <RedwoodApolloProvider
                useAuth={useAuth}
                graphQLClientConfig={graphQLClientConfig}
              >
                {children}
              </RedwoodApolloProvider>
            </AuthProvider>
          </RedwoodProvider>
        </FatalErrorBoundary>
      );

      export default App;
      `,
    )
  })
})
