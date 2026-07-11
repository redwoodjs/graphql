// These are normally auto-imported by babel
import React from 'react'

import { gql } from 'graphql-tag'
import { describe, expect, test } from 'tstyche'

import type { CellProps, CellSuccessProps } from '@redwoodjs/web'

type ExampleQueryVariables = {
  category: string
  saved: boolean
}

// Just an example model returned from the query
type Recipe = {
  __typename?: 'Recipe'
  id: string
  name: string
}

// This is the type returned by querying
// e.g. query ListRecipes { recipes { id name } }
type QueryResult = {
  __typename?: 'Query'
  recipes: Recipe[]
}

// This is how graphql-codegen defines queries that don't take vars
type EmptyVariables = { [key: string]: never }

// This Cell takes a customProp i.e. one not provided by the Cell's query
interface SuccessProps extends CellSuccessProps<QueryResult> {
  customProp: number
}

const recipeCell = {
  QUERY: gql`
    query ListRecipes {
      recipes {
        id
        name
      }
    }
  `,
  Loading: () => null,
  Empty: () => null,
  Failure: () => null,
  Success: (props: SuccessProps) => {
    return (
      <>
        <h1>Example Component</h1>
        <ul>
          <li>Recipe prop {props.recipes.length} </li>
          <li>Custom prop {props.customProp}</li>
        </ul>
      </>
    )
  },
}

describe('CellProps mapper type', () => {
  describe('when beforeQuery does not exist', () => {
    test('Inputs expect props outside cell', () => {
      type CellInputs = CellProps<
        typeof recipeCell.Success,
        QueryResult,
        typeof recipeCell,
        ExampleQueryVariables
      >

      expect<CellInputs>().type.toBeAssignableWith({
        customProp: 55,
        category: 'Dinner',
        saved: true,
      })
    })

    test('Inputs still expect custom props when query does not take variables', () => {
      type CellWithoutVariablesInputs = CellProps<
        typeof recipeCell.Success,
        QueryResult,
        typeof recipeCell,
        EmptyVariables
      >

      expect<CellWithoutVariablesInputs>().type.toBeAssignableWith({
        customProp: 55,
      })
    })
  })

  describe('when beforeQuery exists and has arguments', () => {
    test('Inputs expect props outside cell', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cellWithBeforeQuery = {
        ...recipeCell,
        beforeQuery: ({ word }: { word: string }) => {
          return {
            variables: {
              category: word,
              saved: !!word,
            },
          }
        },
      }

      type CellWithBeforeQueryInputs = CellProps<
        typeof cellWithBeforeQuery.Success,
        QueryResult,
        typeof cellWithBeforeQuery,
        ExampleQueryVariables
      >

      // Note that the gql variables are no longer required here
      expect<CellWithBeforeQueryInputs>().type.toBeAssignableWith({
        word: 'abracadabra',
        customProp: 99,
      })
    })

    test('Inputs still expect custom props when query does not take variables', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cellWithBeforeQuery = {
        ...recipeCell,
        beforeQuery: ({ fetchPolicy }: { fetchPolicy: string }) => {
          return {
            fetchPolicy,
          }
        },
      }

      type CellWithBeforeQueryInputs = CellProps<
        typeof cellWithBeforeQuery.Success,
        QueryResult,
        typeof cellWithBeforeQuery,
        EmptyVariables
      >

      expect<CellWithBeforeQueryInputs>().type.toBeAssignableWith({
        fetchPolicy: 'cache-only',
        customProp: 55,
      })
    })
  })

  describe('when beforeQuery exists and has no arguments', () => {
    test('Inputs expect props outside cell', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cellWithBeforeQuery = {
        ...recipeCell,
        beforeQuery: () => {
          return {
            variables: {
              category: 'Dinner',
              saved: true,
            },
          }
        },
      }

      type CellWithBeforeQueryInputs = CellProps<
        typeof cellWithBeforeQuery.Success,
        QueryResult,
        typeof cellWithBeforeQuery,
        ExampleQueryVariables
      >

      // Note that the gql variables are no longer required here
      expect<CellWithBeforeQueryInputs>().type.toBeAssignableWith({
        customProp: 99,
      })
    })

    test('Inputs still expect custom props when query does not take variables', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cellWithBeforeQuery = {
        ...recipeCell,
        beforeQuery: () => {
          return {
            fetchPolicy: 'cache-only',
          }
        },
      }

      type CellWithBeforeQueryInputs = CellProps<
        typeof cellWithBeforeQuery.Success,
        QueryResult,
        typeof cellWithBeforeQuery,
        EmptyVariables
      >

      expect<CellWithBeforeQueryInputs>().type.toBeAssignableWith({
        customProp: 55,
      })
    })
  })
})
