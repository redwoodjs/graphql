import React from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import { describe, test, expect } from 'vitest'

import {
  GraphQLHooksProvider,
  useQuery,
  useMutation,
  useSubscription,
} from '../GraphQLHooksProvider.js'

const TestUseQueryHook: React.FunctionComponent = () => {
  // @ts-expect-error - Purposefully not passing in a DocumentNode type here.
  const result = useQuery('query TestQuery { answer }', {
    variables: {
      question: 'What is the answer to life, the universe and everything?',
    },
  })

  return <>{JSON.stringify(result)}</>
}

const TestUseMutationHook: React.FunctionComponent = () => {
  // @ts-expect-error - Purposefully not passing in a DocumentNode type here.
  const result = useMutation('mutation UpdateThing(input: "x") { answer }', {
    variables: {
      question: 'What is the answer to life, the universe and everything?',
    },
  })

  return <>{JSON.stringify(result)}</>
}

const TestUseSubscriptionHook: React.FunctionComponent = () => {
  // @ts-expect-error - Purposefully not passing in a DocumentNode type here.
  const result = useSubscription('subscription TestQuery { answer }', {
    variables: {
      question: 'What is the answer to life, the universe and everything?',
    },
  })

  return <>{JSON.stringify(result)}</>
}

describe('QueryHooksProvider', () => {
  test('useQueryHook is called with the correct query and arguments', () =>
    new Promise<void>((done) => {
      const myUseQueryHook = (query, options) => {
        expect(query).toEqual('query TestQuery { answer }')
        expect(options.variables.question).toEqual(
          'What is the answer to life, the universe and everything?',
        )
        done()
        return { loading: false, data: { answer: 42 } }
      }
      render(
        <GraphQLHooksProvider
          useQuery={myUseQueryHook}
          useMutation={null}
          useSubscription={null}
        >
          <TestUseQueryHook />
        </GraphQLHooksProvider>,
      )
    }))

  test('useMutationHook is called with the correct query and arguments', () =>
    new Promise<void>((done) => {
      const myUseMutationHook = (query, options) => {
        expect(query).toEqual('mutation UpdateThing(input: "x") { answer }')
        expect(options.variables.question).toEqual(
          'What is the answer to life, the universe and everything?',
        )
        done()
        return { loading: false, data: { answer: 42 } }
      }
      render(
        <GraphQLHooksProvider
          useQuery={null}
          useMutation={myUseMutationHook}
          useSubscription={null}
        >
          <TestUseMutationHook />
        </GraphQLHooksProvider>,
      )
    }))

  test('useQueryHook returns the correct result', async () => {
    const myUseQueryHook = () => {
      return { loading: false, data: { answer: 42 } }
    }
    render(
      <GraphQLHooksProvider useQuery={myUseQueryHook} useMutation={null}>
        <TestUseQueryHook />
      </GraphQLHooksProvider>,
    )
    await waitFor(() =>
      screen.getByText('{"loading":false,"data":{"answer":42}}'),
    )
  })

  test('useMutationHook returns the correct result', async () => {
    const myUseMutationHook = () => {
      return { loading: false, data: { answer: 42 } }
    }
    render(
      <GraphQLHooksProvider useQuery={null} useMutation={myUseMutationHook}>
        <TestUseMutationHook />
      </GraphQLHooksProvider>,
    )
    await waitFor(() =>
      screen.getByText('{"loading":false,"data":{"answer":42}}'),
    )
  })

  test('useSubscriptionHook returns the correct result', async () => {
    const myUseSubscriptionHook = () => {
      return { loading: false, data: { answer: 42 } }
    }
    render(
      <GraphQLHooksProvider
        useQuery={null}
        useMutation={null}
        useSubscription={myUseSubscriptionHook}
      >
        <TestUseSubscriptionHook />
      </GraphQLHooksProvider>,
    )
    await waitFor(() =>
      screen.getByText('{"loading":false,"data":{"answer":42}}'),
    )
  })
})
