import { render } from '@redwoodjs/testing/web'

import TestComponent from './TestComponent'

//   Improve this test with help from the Redwood Testing Doc:
//    https://redwoodjs.com/docs/testing#testing-components

describe('TestComponent', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<TestComponent />)
    }).not.toThrow()
  })
})
