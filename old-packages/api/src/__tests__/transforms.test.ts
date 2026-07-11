import { describe, it, expect } from 'vitest'

import { removeNulls } from '../transforms'

describe('removeNulls utility', () => {
  it('Changes nulls to undefined', () => {
    const input = {
      a: null,
      b: 'b',
      c: {
        d: null, // nested null
        e: 3,
        f: {
          g: null, // deeply nested null
          h: [null, null], // array of nulls is also transformed
          i: [1, 2, null, 4],
        },
      },
      myDate: new Date('2020-01-01'),
    }

    const result = removeNulls(input)

    expect(result).toEqual({
      a: undefined,
      b: 'b',
      c: {
        d: undefined,
        e: 3,
        f: {
          g: undefined,
          h: [undefined, undefined],
          i: [1, 2, undefined, 4],
        },
      },
      myDate: new Date('2020-01-01'),
    })
  })
})
