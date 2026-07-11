// mock Telemetry for CLI commands so they don't try to spawn a process
vi.mock('@redwoodjs/telemetry', () => {
  return {
    errorTelemetry: () => vi.fn(),
    timedTelemetry: () => vi.fn(),
  }
})

vi.mock('@redwoodjs/cli-helpers', () => {
  return {
    getPaths: () => {
      return {
        web: {
          src: '',
          app: '',
          routes: 'Routes.tsx',
        },
        base: '',
      }
    },
    standardAuthHandler: () => vi.fn(),
  }
})

vi.mock('fs', async () => ({ default: (await import('memfs')).fs }))

import fs from 'fs'

import { vol } from 'memfs'
import { vi, describe, it, expect } from 'vitest'

import { addRoutingLogic } from '../setupHandler'

describe('addRoutingLogic', () => {
  it('modifies the Routes.{jsx,tsx} file', () => {
    vol.fromJSON({
      'Routes.tsx':
        "// In this file, all Page components from 'src/pages' are auto-imported.\n" +
        `
import { Router, Route } from '@redwoodjs/router'

import { useAuth } from './auth'

const Routes = () => {
  return (
    <Router useAuth={useAuth}>
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/signup" page={SignupPage} name="signup" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
`,
    })

    addRoutingLogic.task()

    expect(fs.readFileSync('Routes.tsx', 'utf-8')).toMatchInlineSnapshot(`
          "// In this file, all Page components from 'src/pages' are auto-imported.

          import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui'

          import { Router, Route } from '@redwoodjs/router'

          import { useAuth, PreBuiltUI } from './auth'

          const Routes = () => {
            if (canHandleRoute(PreBuiltUI)) {
              return getRoutingComponent(PreBuiltUI)
            }

            return (
              <Router useAuth={useAuth}>
                <Route path="/login" page={LoginPage} name="login" />
                <Route path="/signup" page={SignupPage} name="signup" />
                <Route notfound page={NotFoundPage} />
              </Router>
            )
          }

          export default Routes
          "
      `)
  })

  it('handles a Routes.{jsx,tsx} file with a legacy setup', () => {
    vol.fromJSON({
      'Routes.tsx':
        "// In this file, all Page components from 'src/pages' are auto-imported.\n" +
        `
import SuperTokens from 'supertokens-auth-react'

import { Router, Route } from '@redwoodjs/router'

import { useAuth } from './auth'

const Routes = () => {
  if (SuperTokens.canHandleRoute()) {
    return SuperTokens.getRoutingComponent()
  }

  return (
    <Router useAuth={useAuth}>
      <Route path="/login" page={LoginPage} name="login" />
      <Route path="/signup" page={SignupPage} name="signup" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
`,
    })

    addRoutingLogic.task()

    expect(fs.readFileSync('Routes.tsx', 'utf-8')).toMatchInlineSnapshot(`
      "// In this file, all Page components from 'src/pages' are auto-imported.



      import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui'

      import { Router, Route } from '@redwoodjs/router'

      import { useAuth, PreBuiltUI } from './auth'

      const Routes = () => {
        if (canHandleRoute(PreBuiltUI)) {
          return getRoutingComponent(PreBuiltUI)
        }



        return (
          <Router useAuth={useAuth}>
            <Route path="/login" page={LoginPage} name="login" />
            <Route path="/signup" page={SignupPage} name="signup" />
            <Route notfound page={NotFoundPage} />
          </Router>
        )
      }

      export default Routes
      "
    `)
  })
})
