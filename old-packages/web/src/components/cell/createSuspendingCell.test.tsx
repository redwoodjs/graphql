import React from 'react'

import type { useReadQuery, useBackgroundQuery } from '@apollo/client'
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev'
import { render, screen } from '@testing-library/react'
import { vi, describe, beforeAll, test } from 'vitest'

import { GraphQLHooksProvider } from '../GraphQLHooksProvider.js'

import { createSuspendingCell } from './createSuspendingCell.js'

type ReadQueryHook = typeof useReadQuery
type BgQueryHook = typeof useBackgroundQuery

vi.mock('@apollo/client/react/hooks/hooks.cjs', () => {
  return {
    useApolloClient: vi.fn(),
  }
})

// @TODO: once we have finalised implementation, we need to add tests for
// all the other states. We would also need to figure out how to test the Suspense state.
// No point doing this now, as the implementation is in flux!

describe('createSuspendingCell', () => {
  beforeAll(() => {
    globalThis.RWJS_ENV = {
      RWJS_EXP_STREAMING_SSR: true,
    }
    loadDevMessages()
    loadErrorMessages()
  })

  const mockedUseBgQuery = (() => {
    return ['mocked-query-ref', { refetch: vi.fn(), fetchMore: vi.fn() }]
  }) as unknown as BgQueryHook

  const mockedQueryHook = () => ({ data: {} })

  test('Renders a static Success component', () => {
    const TestCell = createSuspendingCell({
      // @ts-expect-error - Purposefully using a plain string here.
      QUERY: 'query TestQuery { answer }',
      Success: () => <>Great success!</>,
    })

    render(
      <GraphQLHooksProvider
        useBackgroundQuery={mockedUseBgQuery as any}
        useReadQuery={mockedQueryHook as any}
      >
        <TestCell />
      </GraphQLHooksProvider>,
    )
    screen.getByText(/^Great success!$/)
  })

  test('Renders Success with data', () => {
    const TestCell = createSuspendingCell({
      // @ts-expect-error - Purposefully using a plain string here.
      QUERY: 'query TestQuery { answer }',
      Success: ({ answer }) => (
        <>
          <dl>
            <dt>What&apos;s the meaning of life?</dt>
            <dd>{answer}</dd>
          </dl>
        </>
      ),
    })

    const myUseQueryHook = (() => {
      return { data: { answer: 42 } }
    }) as unknown as ReadQueryHook

    render(
      <GraphQLHooksProvider
        useReadQuery={myUseQueryHook}
        useBackgroundQuery={mockedUseBgQuery}
      >
        <TestCell />
      </GraphQLHooksProvider>,
    )

    screen.getByText(/^What's the meaning of life\?$/)
    screen.getByText(/^42$/)
  })

  test('Renders Success if any of the fields have data (i.e. not just the first)', () => {
    const TestCell = createSuspendingCell({
      // @ts-expect-error - Purposefully using a plain string here.
      QUERY: 'query TestQuery { users { name } posts { title } }',
      Empty: () => <>No users or posts</>,
      Success: ({ users, posts }) => (
        <>
          <div>
            {users.length > 0 ? (
              <ul>
                {users.map(({ name }) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              'no users'
            )}
          </div>
          <div>
            {posts.length > 0 ? (
              <ul>
                {posts.map(({ title }) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            ) : (
              'no posts'
            )}
          </div>
        </>
      ),
    })

    const myReadQueryHook = (() => {
      return {
        data: {
          users: [],
          posts: [{ title: 'bazinga' }, { title: 'kittens' }],
        },
      }
    }) as unknown as ReadQueryHook

    render(
      <GraphQLHooksProvider
        useReadQuery={myReadQueryHook}
        useBackgroundQuery={mockedUseBgQuery}
      >
        <TestCell />
      </GraphQLHooksProvider>,
    )

    screen.getByText(/bazinga/)
    screen.getByText(/kittens/)
  })
})
