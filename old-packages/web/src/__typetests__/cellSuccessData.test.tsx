import { describe, expect, it } from 'tstyche'

import type { CellSuccessData } from '@redwoodjs/web'

describe('CellSuccessData', () => {
  describe('when there is exactly one non-typename property', () => {
    it('omits __typename', () => {
      const value: CellSuccessData<{ foo: string; __typename: '' }> = {
        foo: '',
      }

      expect(value).type.toBe<{ foo: string }>()
    })

    it('removes null and undefined from properties', () => {
      const value: CellSuccessData<{ foo?: string | null }> = { foo: '' }

      expect(value).type.toBe<{ foo: string }>()
    })
  })

  describe('when there are multiple non-typename properties', () => {
    it('omits __typename', () => {
      const value: CellSuccessData<{
        foo: string
        bar: string
        __typename: ''
      }> = {
        foo: '',
        bar: '',
      }

      expect(value).type.toBe<{ foo: string; bar: string }>()
    })

    it('does not remove null or undefined from properties', () => {
      const value: CellSuccessData<{
        foo?: string | null
        bar?: string | null
      }> = {
        foo: '',
        bar: '',
      }

      expect(value).type.toBe<{ foo?: string | null; bar?: string | null }>()
    })
  })
})
