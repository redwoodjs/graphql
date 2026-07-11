import path from 'path'

import gql from 'graphql-tag'
import { test, expect } from 'vitest'

import { listQueryTypeFieldsInProject, parseDocumentAST } from '../gql'

test('parses a document AST', () => {
  const QUERY = gql`
    query POSTS {
      posts {
        id
        title
        body
        createdAt
      }
      numberOfPosts
    }
  `

  expect(parseDocumentAST(QUERY)).toMatchInlineSnapshot(`
    [
      {
        "fields": [
          {
            "posts": [
              "id",
              "title",
              "body",
              "createdAt",
            ],
          },
          "numberOfPosts",
        ],
        "name": "POSTS",
        "operation": "query",
      },
    ]
  `)
})

test('handles inline fragments', () => {
  const QUERY = gql`
    query MyCellQuery {
      something {
        ... on SomeType {
          __typename
        }
        ... on SomeOtherType {
          __typename
        }
      }
    }
  `

  expect(parseDocumentAST(QUERY)).toMatchInlineSnapshot(`
    [
      {
        "fields": [
          {
            "something": [
              "__typename",
              "__typename",
            ],
          },
        ],
        "name": "MyCellQuery",
        "operation": "query",
      },
    ]
  `)
})

test('handles fragments', () => {
  const QUERY = gql`
    fragment ABC on B {
      a
    }
    query MyCellQuery {
      something {
        ...ABC
      }
    }
  `

  expect(parseDocumentAST(QUERY)).toMatchInlineSnapshot(`
    [
      {
        "fields": [
          {
            "something": [],
          },
        ],
        "name": "MyCellQuery",
        "operation": "query",
      },
    ]
  `)
})

test('listQueryTypeFieldsInProject', async () => {
  const FIXTURE_PATH = path.resolve(
    __dirname,
    '../../../../__fixtures__/example-todo-main',
  )
  // Set fixture path so it reads the sdls from example-todo-main
  process.env.RWJS_CWD = FIXTURE_PATH

  // Reimport, because rwjs/internal already calculates the paths
  const result = await listQueryTypeFieldsInProject()

  expect(result).toContain('redwood')
  expect(result).toContain('currentUser')
  expect(result).toContain('todos')
  expect(result).toContain('todosCount')

  // Restore RWJS config
  delete process.env.RWJS_CWD
})
