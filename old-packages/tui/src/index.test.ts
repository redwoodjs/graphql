import { ReactiveTUIContent } from './index'

describe('ReactiveTUIContent validation', () => {
  it('throws if spinner.characters has fewer than 2 entries', () => {
    const r = new ReactiveTUIContent({})
    expect(() =>
      r.update({ spinner: { enabled: true, characters: ['-'] } }),
    ).toThrow(/at least 2/i)
  })

  it('throws if frameInterval is 0 or negative', () => {
    const r = new ReactiveTUIContent({})
    expect(() => r.update({ frameInterval: 0 })).toThrow(/frameInterval.*> 0/i)
    expect(() => r.update({ frameInterval: -5 })).toThrow(/frameInterval.*> 0/i)
  })

  it('accepts valid spinner.characters and frameInterval', () => {
    const r = new ReactiveTUIContent({})
    expect(() =>
      r.update({ spinner: { enabled: true, characters: ['-', '\\'] } }),
    ).not.toThrow()
    expect(() => r.update({ frameInterval: 50 })).not.toThrow()
  })
})
