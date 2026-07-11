import path from 'path'

import fs from 'fs-extra'
import { expect, it, describe, test } from 'vitest'

import { merge } from '../merge'
import {
  concatUnique,
  interleave,
  keepBoth,
  keepBothStatementParents,
} from '../merge/strategy'

import { unindented } from './fixtures/unindented'

// A particular merge strategy for combining JS-config-style files.
// This is the only strategy tested in this file.
async function mergeConfig(base, ext) {
  return merge(base, ext, {
    ImportDeclaration: interleave,
    ArrayExpression: concatUnique,
    ObjectExpression: concatUnique,
    ArrowFunctionExpression: keepBothStatementParents,
    FunctionDeclaration: keepBoth,
  })
}

const expectMerged = async (base, ext, merged) => {
  expect(await mergeConfig(unindented(base), unindented(ext))).toBe(
    unindented(merged),
  )
}

describe('Import behavior', () => {
  it('deduplicates identical import namespace identifiers', async () => {
    await expectMerged(
      "import * as React from 'react'",
      "import * as React from 'react'",
      "import * as React from 'react'\n",
    )
  })

  it('deduplicates identical import specifiers', async () => {
    await expectMerged(
      "import { foo } from 'source'",
      "import { foo } from 'source'",
      "import { foo } from 'source'\n",
    )
  })

  it('merges import specifiers from the same source into one import', async () => {
    await expectMerged(
      "import { bar } from 'source'",
      "import { foo } from 'source'",
      "import { bar, foo } from 'source'\n",
    )
  })

  it('deduplicates identical import specifiers from the same source', async () => {
    await expectMerged(
      "import { foo, bar } from 'source'",
      "import { bar, baz } from 'source'",
      "import { foo, bar, baz } from 'source'\n",
    )
  })

  it('merges import default specifiers and import specifiers', async () => {
    await expectMerged(
      "import def from 'source'",
      "import { foo } from 'source'",
      "import def, { foo } from 'source'\n",
    )
  })

  it('merges import default specifiers alongisde import specifiers with import specifiers', async () => {
    await expectMerged(
      "import def, { foo } from 'source'",
      "import { bar } from 'source'",
      "import def, { foo, bar } from 'source'\n",
    )
  })

  it('merges import default specifiers and import specifiers, even if it must reorder them', async () => {
    await expectMerged(
      "import { foo } from 'source'",
      "import def from 'source'",
      "import def, { foo } from 'source'\n",
    )
  })

  it('does not merge import namespace identifiers with conflicting local names', async () => {
    await expectMerged(
      "import * as One from 'source'",
      "import * as Two from 'source'",
      "import * as One from 'source'\nimport * as Two from 'source'\n",
    )
  })

  it('does not merge default specifiers with conflicting local names', async () => {
    await expectMerged(
      "import One from 'source'",
      "import Two from 'source'",
      "import One from 'source'\nimport Two from 'source'\n",
    )
  })

  it('does not merge side-effect imports and default imports', async () => {
    await expectMerged(
      "import 'source'",
      "import Def from 'source'",
      `\
      import 'source'
      import Def from 'source'
      `,
    )
  })

  it('does not merge side-effect imports and namespace imports', async () => {
    await expectMerged(
      "import 'source'",
      "import * as Name from 'source'",
      `\
      import 'source'
      import * as Name from 'source'
      `,
    )
  })

  it('does not merge side-effect imports import specifiers', async () => {
    await expectMerged(
      "import 'source'",
      "import { foo, bar } from 'source'",
      `\
      import 'source'
      import { foo, bar } from 'source'
      `,
    )
  })

  it('adds extension side-effect imports', async () => {
    await expectMerged(
      "import def, { foo, bar } from 'source'",
      "import 'source'",
      `\
      import def, { foo, bar } from 'source'
      import 'source'
      `,
    )
  })

  it('merges import default specifiers and import namespace identifiers', async () => {
    await expectMerged(
      "import src from 'source'",
      "import * as Source from 'source'",
      "import src, * as Source from 'source'\n",
    )
  })

  it('merges import default specifiers and import namespace identifiers, even if it must reorder them', async () => {
    await expectMerged(
      "import * as Source from 'source'",
      "import src from 'source'",
      "import src, * as Source from 'source'\n",
    )
  })

  it('merges multiple imports with the same source', async () => {
    await expectMerged(
      "import { foo } from 'source'",
      `\
      import { bar } from 'source'
      import { baz } from 'source'
      `,
      "import { foo, bar, baz } from 'source'\n",
    )
  })

  it('merges multiple default imports with the same source', async () => {
    await expectMerged(
      "import default1 from 'source'",
      `\
      import default2 from 'source'
      import { foo } from 'source'
      `,
      `\
      import default1, { foo } from 'source'
      import default2 from 'source'
      `,
    )
  })

  it('merges multiple types of imports with the same source', async () => {
    await expectMerged(
      `\
      import default1 from 'source'
      import * as namespace from 'source'
      `,
      `\
      import default2 from 'source'
      import { foo } from 'source'
      `,
      `\
      import default1, { foo } from 'source'
      import default2 from 'source'
      import * as namespace from 'source'
      `,
    )
  })
})

describe('Object behavior', () => {
  it('merges basic objects without conflicts', async () => {
    await expectMerged(
      'const x = { foo: "foo" }',
      'const x = { bar: "bar" }',
      `\
      const x = {
        foo: 'foo',
        bar: 'bar',
      }
      `,
    )
  })

  it('deduplicates object properties', async () => {
    await expectMerged(
      'const x = { foo: "foo", bar: "bar" }',
      'const x = { bar: "bar", baz: "baz" }',
      `\
      const x = {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz',
      }
      `,
    )
  })

  it('merges nested object properties', async () => {
    await expectMerged(
      'const x = { foo: { nest: "nest" } }',
      'const x = { foo: { bird: "bird" } }',
      `\
      const x = {
        foo: {
          nest: 'nest',
          bird: 'bird',
        },
      }
      `,
    )
  })

  it('deduplicates nested object properties', async () => {
    await expectMerged(
      'const x = { foo: { nest: "nest", bird: "bird" } }',
      'const x = { foo: { bird: "bird" } }',
      `\
      const x = {
        foo: {
          nest: 'nest',
          bird: 'bird',
        },
      }
      `,
    )
  })

  it('merges nested arrays', async () => {
    await expectMerged(
      'const x = { foo: { arr: [1, 2, 3] } }',
      'const x = { foo: { arr: [3, 4, 5] } }',
      `\
      const x = {
        foo: {
          arr: [1, 2, 3, 4, 5],
        },
      }
      `,
    )
  })
  it('merges deeply nested objects', async () => {
    await expectMerged(
      'const x = { foo: { bar: { baz: { bat: [1] } } } }',
      'const x = { foo: { bar: { baz: { bat: [2] } } } }',
      `\
      const x = {
        foo: {
          bar: {
            baz: {
              bat: [1, 2],
            },
          },
        },
      }
      `,
    )
  })
})

describe('Array behavior', () => {
  it('merges arrays without duplicates', async () => {
    await expectMerged(
      'const x = [1, 2, 3]',
      'const x = [4, 5, 6]',
      'const x = [1, 2, 3, 4, 5, 6]\n',
    )
  })

  it('does not merge arrays with different identities', async () => {
    await expectMerged(
      'const x = [1, 2, 3]',
      'const y = [4, 5, 6]',
      `\
      const x = [1, 2, 3]
      const y = [4, 5, 6]
      `,
    )
  })

  it('deduplicates values of arrays with the same identity', async () => {
    await expectMerged(
      'const x = [1, 2, 3]',
      'const x = [3, 4, 5]',
      'const x = [1, 2, 3, 4, 5]\n',
    )
  })

  it('Does not merge variable declarations with different types of initalizers', async () => {
    await expectMerged(
      'const x = [1, 2, 3]',
      'const x = { foo: "foo" }',
      `\
      const x = [1, 2, 3]
      const x = {
        foo: 'foo',
      }
      `,
    )
  })

  it('merges nested arrays', async () => {
    await expectMerged(
      "const x = [1, 2, 3, ['a', 'b', 'c']]",
      "const x = [1, 5, ['c', 'd', 'e']]",
      // We might also want [1, 2, 3, 5, ['a', 'b', 'c', 'd', 'e']], but that seems tricky to implement.
      "const x = [1, 2, 3, ['a', 'b', 'c', 'd', 'e'], 5]\n",
    )
  })
})

describe('opaque function behavior', () => {
  it('does not merge semantically equivalent nodes in function bodies', async () => {
    await expectMerged(
      "const x = (a) => ['a', 'b', 'c'].contains(a)",
      "const x = (a) => ['d', 'e', 'f'].contains(a)",
      `\
      const x = (a) => ['a', 'b', 'c'].contains(a)
      const x = (a) => ['d', 'e', 'f'].contains(a)
      `,
    )
  })

  it('does not merge semantically unequal nodes in function bodies', async () => {
    await expectMerged(
      `\
      const x = (a) => {
        const arr = ['a', 'b', 'c']
        return arr.contains(a)
      }
      `,
      `\
      const x = (a) => {
        const array = ['a', 'b', 'c']
        return array.contains(a)
      }
      `,
      `\
      const x = (a) => {
        const arr = ['a', 'b', 'c']
        return arr.contains(a)
      }
      const x = (a) => {
        const array = ['a', 'b', 'c']
        return array.contains(a)
      }
      `,
    )
  })
})

describe('nop behavior', () => {
  it('does not merge strings', async () => {
    await expectMerged(
      'const x = "foo"',
      'const x = "bar"',
      "const x = 'foo'\nconst x = 'bar'\n",
    )
  })

  it('does not merge nested strings', async () => {
    await expectMerged(
      'const x = { foo: { bar: "baz" } }',
      'const x = { foo: { bar: "bat" } }',
      `\
      const x = {
        foo: {
          bar: 'baz',
        },
      }
      `,
    )
  })

  it('does not merge functions', async () => {
    await expectMerged(
      'const x = (x, y) => x + y',
      'const x = (x, y) => x - y',
      `\
      const x = (x, y) => x + y
      const x = (x, y) => x - y
      `,
    )
  })

  it('Does not merge identifiers that differ by exported-ness.', async () => {
    await expectMerged(
      'export const x = [1, 2, 3]',
      'const x = [3, 4, 5]',
      'export const x = [1, 2, 3]\nconst x = [3, 4, 5]\n',
    )
  })
})

describe('Comment behavior', () => {
  it('deduplicates comments on identical declarations', async () => {
    await expectMerged(
      `\
      // This is a test
      const x = [1, 2, 3]
      `,
      `\
      // This is a test
      const x = [4, 5, 6]
      `,
      `\
      // This is a test
      const x = [1, 2, 3, 4, 5, 6]
      `,
    )
  })

  it('deduplicates comments on identical declarations, even if they have different types', async () => {
    await expectMerged(
      `\
      // This is a test
      const x = [1, 2, 3]
      `,
      `\
      /* This is a test */
      const x = [4, 5, 6]
      `,
      `\
      // This is a test
      const x = [1, 2, 3, 4, 5, 6]
      `,
    )
  })

  it('Assumes comments pertain to the subsequent expression; trailing comments are disregarded', async () => {
    await expectMerged(
      `\
      import { foo } from 'source'
      // This is a test
      const x = [1, 2, 3]
      `,
      `\
      import { bar } from 'source'
      // This is a test
      const x = [4, 5, 6]
      `,
      `\
      import { foo, bar } from 'source'
      // This is a test
      const x = [1, 2, 3, 4, 5, 6]
      `,
    )
  })
})

describe('Base precedence', () => {
  it('Preferrs the declaration form of the base', async () => {
    await expectMerged('const x = [1]', 'let x = [2]', 'const x = [1, 2]\n')
  })
})

describe('Integration tests', () => {
  const baseDir = './src/lib/__tests__/fixtures/merge'
  const tests = fs.readdirSync(baseDir).map((caseDir) => {
    return ['it.txt', 'base.jsx', 'ext.jsx', 'expected.jsx'].map((file) =>
      fs.readFileSync(path.join(baseDir, caseDir, file), { encoding: 'utf-8' }),
    )
  })
  test.each(tests)('%s', async (_it, base, ext, expected) => {
    expect(await mergeConfig(base, ext)).toBe(expected)
  })
})
