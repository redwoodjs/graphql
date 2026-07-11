import { describe, expect, it } from 'vitest'

import { defaultGetRoles } from '../defaultGetRoles.js'

describe('dbAuth: defaultGetRoles', () => {
  it('returns an empty array if no roles are present', () => {
    const decoded = {
      aud: 'authenticated',
      exp: 1716806712,
      iat: 1716803112,
      iss: 'https://bubnfbrfzfdryapcuybr.supabase.co/auth/v1',
      sub: '75fd8091-e0a7-4e7d-8a8d-138d0eb3ca5a',
      email: 'dannychoudhury+1@gmail.com',
      phone: '',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      user_metadata: {
        'full-name': 'Danny Choudhury 1',
      },
      role: 'authenticated', // <-- ⭐ this refers to supabase role, not app role
      aal: 'aal1',
      amr: [
        {
          method: 'password',
          timestamp: 1716803107,
        },
      ],
      session_id: '39b4ae31-c57a-4ac1-8f01-e9d6ccbd9365',
      is_anonymous: false,
    }

    const roles = defaultGetRoles(decoded)
    expect(roles).toEqual([])
  })

  it('always returns an array of roles, even when currentUser has a string', () => {
    const decoded = {
      aud: 'authenticated',
      exp: 1716806712,
      iat: 1716803112,
      iss: 'https://bubnfbrfzfdryapcuybr.supabase.co/auth/v1',
      sub: '75fd8091-e0a7-4e7d-8a8d-138d0eb3ca5a',
      email: 'dannychoudhury+1@gmail.com',
      phone: '',
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        roles: 'admin', // <-- ⭐ this is the role we are looking for, set by the app
      },
      user_metadata: {
        'full-name': 'Danny Choudhury 1',
      },
      role: 'IGNORE_ME', // <-- ⭐ not this one
      aal: 'aal1',
      amr: [
        {
          method: 'password',
          timestamp: 1716803107,
        },
      ],
      session_id: '39b4ae31-c57a-4ac1-8f01-e9d6ccbd9365',
      is_anonymous: false,
    }

    const roles = defaultGetRoles(decoded)
    expect(roles).toEqual(['admin'])
  })

  it('falls back to an empty array if the decoded object is null', () => {
    const decoded = null
    const roles = defaultGetRoles(decoded as any)
    expect(roles).toEqual([])
  })
})
