import path from 'path'

import { vi, test, expect } from 'vitest'

import { prettify } from '../index.js'

vi.mock('../paths', () => {
  return {
    getPaths: () => {
      return {
        base: path.resolve(
          __dirname,
          '../../../../../__fixtures__/example-todo-main',
        ),
      }
    },
  }
})

test('prettify formats tsx content', async () => {
  const content = `import React from 'react'

  interface Props { foo: number, bar: number }

  const FooBarComponent: React.FC<Props> = ({ foo, bar }) => {
    if (foo % 3 === 0 && bar % 5 === 0) {
      return <>FooBar</>
    }

    if (foo % 3 === 0 || bar % 3 === 0) {
      return <>Foo</>;
    }

    if (foo % 5 === 0 || bar % 5 === 0) { return <>Bar</>}

    return <>{foo}, {bar}</>}`

  expect(
    await prettify('FooBarComponent.template.tsx', content),
  ).toMatchSnapshot()
})
