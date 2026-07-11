import React from 'react'

import { render } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

import PortalHead from '../PortalHead.js'
import * as ServerInject from '../ServerInject.js'

const serverInsertionHookSpy = vi
  .spyOn(ServerInject, 'useServerInsertedHTML')
  .mockImplementation(vi.fn())

describe('Portal head', () => {
  const TestUsage = () => {
    return (
      <PortalHead>
        <title>Test title</title>
        <link rel="canonical" href="https://example.com" />
        <meta name="description" content="Kittens are soft and cuddly" />
      </PortalHead>
    )
  }

  it('Should add children to the <head> on the client, and call serverInsertion hook', () => {
    render(<TestUsage />)
    // Actually doesn't do anything on the client underneath, but we
    // still want to make sure its called
    expect(serverInsertionHookSpy).toHaveBeenCalled()

    const head = document.querySelector('head') as HTMLHeadElement

    expect(head.childNodes).toHaveLength(3)
    expect(head.childNodes[0]).toHaveTextContent('Test title')

    expect(head.childNodes[1]).toHaveAttribute('rel', 'canonical')
    expect(head.childNodes[1]).toHaveAttribute('href', 'https://example.com')

    expect(head.childNodes[2]).toHaveAttribute('name', 'description')
    expect(head.childNodes[2]).toHaveAttribute(
      'content',
      'Kittens are soft and cuddly',
    )
  })
})
