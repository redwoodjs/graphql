global.__dirname = __dirname

vi.mock('fs-extra')

import path from 'path'

// Load mocks
import '../../../../lib/test'

const actualFs = await vi.importActual('fs-extra')
import { vol } from 'memfs'
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest'

import { getPaths } from '../../../../lib'
import * as dbAuth from '../dbAuth'

vi.mock('listr2', async () => {
  return {
    // Return a constructor function, since we're calling `new` on Listr
    Listr: vi.fn().mockImplementation(() => ({
      run: () => {},
      ctx: {},
    })),
  }
})

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.mocked(console).log.mockRestore?.()
})

describe('dbAuth', () => {
  describe('one more thing... message', () => {
    it('does not include setup instructions when dbAuth is already set up in auth.js', async () => {
      vol.reset()
      vol.fromJSON({
        [path.join(getPaths().web.src, 'auth.js')]: `
import { createDbAuthClient, createAuth } from '@redwoodjs/auth-dbauth-web'

const dbAuthClient = createDbAuthClient()

export const { AuthProvider, useAuth } = createAuth(dbAuthClient)
`,
      })

      await dbAuth.handler({
        webauthn: false,
      })

      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /Look in LoginPage, Sign/,
      )
      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).not.toMatch(
        /yarn rw setup auth dbAuth/,
      )
    })

    it('does not include setup instructions when dbAuth is already set up in auth.ts', async () => {
      vol.reset()
      vol.fromJSON({
        [path.join(getPaths().web.src, 'auth.ts')]: `
import { createDbAuthClient, createAuth } from '@redwoodjs/auth-dbauth-web'

const dbAuthClient = createDbAuthClient()

export const { AuthProvider, useAuth } = createAuth(dbAuthClient)
`,
      })

      await dbAuth.handler({
        webauthn: false,
      })

      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /Look in LoginPage, Sign/,
      )
      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).not.toMatch(
        /yarn rw setup auth dbAuth/,
      )
    })

    it('does not include setup instructions when dbAuth is already set up in auth.jsx with a renamed import', async () => {
      vol.reset()
      vol.fromJSON({
        [path.join(getPaths().web.src, 'auth.jsx')]: `
import { createDbAuthClient, createAuth: renamedCreateAuth } from '@redwoodjs/auth-dbauth-web'

const dbAuthClient = createDbAuthClient()

const { AuthProvider, useAuth } = renamedCreateAuth(dbAuthClient)

const CustomAuthProvider = ({ children }) => {
  return (
    <div className="custom-auth-provider">
      <AuthProvider>{children}</AuthProvider>
    </div>
  )
}

export const AuthProvider = CustomAuthProvider
export { useAuth }
`,
      })

      await dbAuth.handler({
        webauthn: false,
      })

      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /Look in LoginPage, Sign/,
      )
      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).not.toMatch(
        /yarn rw setup auth dbAuth/,
      )
    })

    it("includes dbAuth setup instructions if dbAuth isn't already setup", async () => {
      vol.reset()
      vol.fromJSON({
        [path.join(getPaths().web.src, 'auth.jsx')]: `
import React, { useEffect } from 'react'

import { ClerkProvider, useUser } from '@clerk/clerk-react'

import { createAuth } from '@redwoodjs/auth-clerk-web'
import { navigate } from '@redwoodjs/router'

export const { AuthProvider: ClerkRwAuthProvider, useAuth } = createAuth()

const ClerkProviderWrapper = ({ children, clerkOptions }) => {
  const { reauthenticate } = useAuth()

  return (
    <ClerkProvider
      {...clerkOptions}
      navigate={(to) => reauthenticate().then(() => navigate(to))}
    >
      {children}
    </ClerkProvider>
  )
}

export const AuthProvider = ({ children }: Props) => {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY

  return (
    <ClerkRwAuthProvider>
      <ClerkProviderWrapper clerkOptions={{ publishableKey }}>
        {children}
      </ClerkProviderWrapper>
    </ClerkRwAuthProvider>
  )
}
`,
      })

      await dbAuth.handler({
        webauthn: false,
      })

      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /Look in LoginPage, Sign/,
      )
      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /yarn rw setup auth dbAuth/,
      )
    })

    it('does not include setup instructions for when generating the pages in the test project', async () => {
      vol.reset()
      vol.fromJSON({
        [path.join(getPaths().web.src, 'auth.js')]: actualFs.readFileSync(
          path.join(
            __dirname,
            `../../../../../../../__fixtures__/test-project/web/src/auth.ts`,
          ),
          'utf-8',
        ),
      })

      await dbAuth.handler({
        webauthn: false,
      })

      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /Look in LoginPage, Sign/,
      )
      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).not.toMatch(
        /yarn rw setup auth dbAuth/,
      )
    })

    it('is different for when WebAuthn is setup', async () => {
      vol.reset()
      vol.fromJSON({
        [path.join(getPaths().web.src, 'auth.js')]: `
import { createDbAuthClient, createAuth } from '@redwoodjs/auth-dbauth-web'

const dbAuthClient = createDbAuthClient()

export const { AuthProvider, useAuth } = createAuth(dbAuthClient)
`,
      })

      await dbAuth.handler({
        webauthn: true,
      })

      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).toMatch(
        /look for the `REDIRECT`/,
      )
      expect(vi.mocked(console).log.mock.calls.at(-1)[0]).not.toMatch(
        /yarn rw setup auth dbAuth/,
      )
    })
  })
})
