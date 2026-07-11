import { describe, it, expect, test } from 'vitest'
import {
  DiagnosticSeverity,
  Position,
  Range,
} from 'vscode-languageserver-types'

import type { ExtendedDiagnostic } from '../vscode-languageserver-types'
import {
  ExtendedDiagnostic_format,
  Position_compare,
  Position_fromOffset,
  Range_contains,
} from '../vscode-languageserver-types'

describe('Position_compare', () => {
  it('', () => {
    x(0, 0, 0, 0, 'equal')

    x(0, 0, 0, 1, 'smaller')
    x(0, 0, 1, 0, 'smaller')
    x(0, 0, 1, 1, 'smaller')

    x(0, 1, 0, 0, 'greater')
    x(1, 0, 0, 0, 'greater')
    x(1, 1, 0, 0, 'greater')

    x(0, 2, 1, 0, 'smaller')
    function x(l1: number, c1: number, l2: number, c2: number, r: string) {
      expect(
        Position_compare(Position.create(l1, c1), Position.create(l2, c2)),
      ).toEqual(r)
    }
  })
})

describe('Range_contains', () => {
  it('', () => {
    const r = Range.create(0, 1, 0, 3)
    x(r, 0, 0, false)
    x(r, 0, 1, true)
    x(r, 0, 2, true)
    x(r, 0, 3, true)
    x(r, 0, 4, false)
    function x(r: Range, l: number, c: number, res: boolean) {
      expect(Range_contains(r, Position.create(l, c))).toEqual(res)
    }
  })
})

describe('ExtendedDiagnostic_format', () => {
  it('can format diagnostics', () => {
    const d: ExtendedDiagnostic = {
      uri: 'file:///path/to/app/b.ts',
      diagnostic: {
        range: Range.create(1, 2, 1, 6),
        severity: DiagnosticSeverity.Error,
        message: 'this is a message',
      },
    }
    const str = ExtendedDiagnostic_format(d, { cwd: '/path/to/app/' })
    expect(str).toEqual('b.ts:2:3: error: this is a message')

    const str2 = ExtendedDiagnostic_format(d)
    expect(str2).toEqual('/path/to/app/b.ts:2:3: error: this is a message')

    const str3 = ExtendedDiagnostic_format(d, {
      getSeverityLabel: (s) => `<${s}>`,
    })
    expect(str3).toEqual('/path/to/app/b.ts:2:3: <1>: this is a message')
  })
})

describe('Position_fromOffset', () => {
  test('it works', () => {
    x(0, 'foo', 0, 0)
    x(1, 'foo', 0, 1)
    x(3, 'foo\nbar', 0, 3)
    x(4, 'foo\nbar', 1, 0)
    expect(Position_fromOffset(1000, 'foo')).toBeUndefined()
    function x(
      offset: number,
      text: string,
      expectedLine: number,
      expectedCharacter: number,
    ) {
      const pos = Position_fromOffset(offset, text)
      expect(pos).toEqual({ line: expectedLine, character: expectedCharacter })
    }
  })
})
