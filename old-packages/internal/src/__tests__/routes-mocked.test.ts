import { vi, describe, it, expect } from 'vitest'

vi.mock('@redwoodjs/project-config', () => ({
  getPaths: () => ({
    base: '',
  }),
}))

vi.mock('@redwoodjs/structure/dist/model/RWRoute', () => ({
  RWRoute: {},
}))

vi.mock('@redwoodjs/structure', () => {
  return {
    getProject: () => {
      return {
        router: {
          // <Router useAuth={useAuth}>
          //   <Route path="/login" page={LoginPage} name="login" />
          //   <Route path="/" redirect="/dashboard" />
          //   <Route notfound page={NotFoundPage} />
          // </Router>
          routes: [
            {
              name: 'login',
              page_identifier_str: 'LoginPage',
              path: '/login',
            },
            {
              path: '/',
            },
            {
              page_identifier_str: 'NotFoundPage',
            },
          ],
        },
      }
    },
  }
})

import { getDuplicateRoutes, warningForDuplicateRoutes } from '../routes'

describe('notfound and redirect routes', () => {
  it('Detects no duplicate routes', () => {
    expect(getDuplicateRoutes()).toStrictEqual([])
  })

  it('Produces the correct warning message', () => {
    expect(warningForDuplicateRoutes()).toBe('')
  })
})
