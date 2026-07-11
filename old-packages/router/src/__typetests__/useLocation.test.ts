import { expect, test } from 'tstyche'

import { useLocation } from '@redwoodjs/router'

test('useLocation types', () => {
  const location = useLocation()

  // Useful with SSR!
  expect(location.origin).type.toBeString()
  expect(location.host).type.toBeString()
  expect(location.protocol).type.toBeString()

  // The original definition of useLocation, that returned a "partial" location
  expect(location.pathname).type.toBeString()
  expect(location.search).type.toBeString()
  expect(location.hash).type.toBeString()
})
