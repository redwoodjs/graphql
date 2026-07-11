import React from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import { describe, test, expect } from 'vitest'

import type { AuthContextInterface } from '@redwoodjs/auth'

globalThis.RWJS_API_GRAPHQL_URL = 'https://api.example.com/graphql'

import { FetchConfigProvider, useFetchConfig } from '../FetchConfigProvider.js'

const FetchConfigToString: React.FunctionComponent = () => {
  const c = useFetchConfig()
  return <>{JSON.stringify(c)}</>
}

type UnknownAuthContext = AuthContextInterface<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

describe('FetchConfigProvider', () => {
  test('Unauthenticated user does not receive headers', () => {
    render(
      <FetchConfigProvider
        useAuth={() =>
          ({
            loading: false,
            isAuthenticated: false,
          }) as UnknownAuthContext
        }
      >
        <FetchConfigToString />
      </FetchConfigProvider>,
    )

    expect(
      screen.getByText('{"uri":"https://api.example.com/graphql"}'),
    ).toBeInTheDocument()
  })

  test('Authenticated user does receive headers', async () => {
    render(
      <FetchConfigProvider
        useAuth={() =>
          ({
            loading: false,
            isAuthenticated: true,
            type: 'custom',
          }) as UnknownAuthContext
        }
      >
        <FetchConfigToString />
      </FetchConfigProvider>,
    )
    await waitFor(() =>
      screen.getByText(
        '{"uri":"https://api.example.com/graphql","headers":{"auth-provider":"custom"}}',
      ),
    )
  })
})
