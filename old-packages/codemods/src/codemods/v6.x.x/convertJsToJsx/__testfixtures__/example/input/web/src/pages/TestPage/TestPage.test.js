import { render } from '@redwoodjs/testing/web'

import TestPage from './TestPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('TestPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TestPage />)
    }).not.toThrow()
  })
})
