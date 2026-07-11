import path from 'path'

import { test, expect } from 'vitest'

import { fileToAst } from '../ast'
import { getJsxElements } from '../jsx'

const getFixturePath = (relativeFilePath: string) => {
  return path.join(__dirname, `fixtures/${relativeFilePath}`)
}

test('simple jsx tree', () => {
  const simpleAst = fileToAst(getFixturePath('web/src/router/simple.tsx'))
  const elements = getJsxElements(simpleAst, 'Router')
  expect(elements).toMatchInlineSnapshot(`
    [
      {
        "children": [
          {
            "children": [
              {
                "children": [],
                "location": {
                  "column": 8,
                  "line": 5,
                },
                "name": "Route",
                "props": {
                  "name": "home",
                  "page": "HomePage",
                  "path": "/home",
                },
              },
              {
                "children": [],
                "location": {
                  "column": 8,
                  "line": 6,
                },
                "name": "Route",
                "props": {
                  "name": "login",
                  "page": "LoginPage",
                  "path": "/login",
                },
              },
              {
                "children": [],
                "location": {
                  "column": 8,
                  "line": 7,
                },
                "name": "Route",
                "props": {
                  "name": "404",
                  "page": "ArrowFunctionExpression is not supported",
                  "path": "/404",
                },
              },
            ],
            "location": {
              "column": 6,
              "line": 4,
            },
            "name": "Set",
            "props": {
              "private": true,
            },
          },
        ],
        "location": {
          "column": 4,
          "line": 3,
        },
        "name": "Router",
        "props": {},
      },
    ]
  `)
})
