import { describe, expect, it } from 'vitest'

import { defaultGetRoles } from '../defaultGetRoles.js'

describe('dbAuth: defaultGetRoles', () => {
  it('returns an empty array if no roles are present', () => {
    const decoded = {
      currentUser: {
        id: 1,
        email: 'ba@zin.ga',
      },
    }
    const roles = defaultGetRoles(decoded)
    expect(roles).toEqual([])
  })

  it('always returns an array of roles, even when currentUser has a string', () => {
    const decoded = { currentUser: { roles: 'admin' } }
    const roles = defaultGetRoles(decoded)
    expect(roles).toEqual(['admin'])
  })

  it('falls back to an empty array if the decoded object is null', () => {
    const decoded = null
    const roles = defaultGetRoles(decoded)
    expect(roles).toEqual([])
  })
})
