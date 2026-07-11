import React from 'react'

import { render } from '@testing-library/react'
import { describe, beforeAll, it, expect } from 'vitest'

import { Metadata } from '../Metadata.js'

// DOCS: can return a structured object from the database and just give it to `og` and it works

describe('Metadata', () => {
  beforeAll(() => {
    // TODO: remove this once SSR is released
    // this is just a workaround so we force the usage of PortalHead instead of Helmet for testing
    globalThis.RWJS_ENV = {
      RWJS_EXP_STREAMING_SSR: true,
    }
  })

  it('renders nothing if no props or children', () => {
    const input = <Metadata />
    const output = <></>

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toEqual(render(output, { container: document.head }).container.innerHTML)
  })

  it('renders non-namespaced props', () => {
    const input = <Metadata title="My Title" />
    const output = (
      <>
        <meta name="title" content="My Title" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders children', () => {
    const input = (
      <Metadata>
        <meta name="foo" content="bar" />
      </Metadata>
    )
    const output = (
      <>
        <meta name="foo" content="bar" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders props and children', () => {
    const input = (
      <Metadata title="My Title">
        <meta httpEquiv="refresh" content="30" />
      </Metadata>
    )
    const output = (
      <>
        <meta name="title" content="My Title" />
        <meta httpEquiv="refresh" content="30" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders first-level namespaced props', () => {
    const input = <Metadata og={{ image: 'http://host.test/image.jpg' }} />
    const output = (
      <>
        <meta property="og:image" content="http://host.test/image.jpg" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders multiple first-level namespaced props', () => {
    const input = (
      <Metadata
        og={{ image: 'http://host.test/image.jpg' }}
        twitter={{ card: 'summary' }}
      />
    )
    const output = (
      <>
        <meta property="og:image" content="http://host.test/image.jpg" />
        <meta property="twitter:card" content="summary" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders second-level namespaced props', () => {
    const input = <Metadata og={{ image: { width: 100 } }} />
    const output = (
      <>
        <meta property="og:image:width" content="100" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders combined first-level and second-level namespaced props', () => {
    const input = (
      <Metadata
        og={{
          image: 'http://host.test/image.jpg',
          display: { type: 'screen' },
        }}
      />
    )
    const output = (
      <>
        <meta property="og:image" content="http://host.test/image.jpg" />
        <meta property="og:display:type" content="screen" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders an array of non-namespaced props', () => {
    const input = <Metadata title={['Title 1', 'Title 2']} />
    const output = (
      <>
        <meta name="title" content="Title 1" />
        <meta name="title" content="Title 2" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders an array of namespaced props', () => {
    const input = (
      <Metadata
        og={{
          image: ['http://host.test/image1.jpg', 'http://host.test/image2.jpg'],
        }}
      />
    )
    const output = (
      <>
        <meta property="og:image" content="http://host.test/image1.jpg" />
        <meta property="og:image" content="http://host.test/image2.jpg" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders a mixture of namespaced array strings and objects', () => {
    const input = (
      <Metadata
        og={{
          image: [
            'http://host.test/image1.jpg',
            { width: 1024, height: 768 },
            'http://host.test/image2.jpg',
            'http://host.test/image3.jpg',
            { width: 640 },
            { height: 480 },
          ],
        }}
      />
    )
    const output = (
      <>
        <meta property="og:image" content="http://host.test/image1.jpg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="768" />
        <meta property="og:image" content="http://host.test/image2.jpg" />
        <meta property="og:image" content="http://host.test/image3.jpg" />
        <meta property="og:image:width" content="640" />
        <meta property="og:image:height" content="480" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('adds a <title> tag if `title` attribute present', () => {
    const input = <Metadata title="My Title" />
    const output = (
      <>
        <title>My Title</title>
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('adds multiple <title> tags in proper order if `title` attribute is an array', () => {
    const input = <Metadata title={['Title 1', 'Title 2']} />
    const output = (
      <>
        <title>Title 1</title>
        <title>Title 2</title>
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('adds an `og:title` tag if any `og` key present', () => {
    const input = <Metadata title="My Title" og />
    const output = (
      <>
        <meta name="title" content="My Title" />
        <meta property="og:title" content="My Title" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not automatically add `og:title` if already present', () => {
    const input = <Metadata title="My Title" og={{ title: 'OG Title' }} />
    const output = (
      <>
        <meta name="title" content="My Title" />
        <meta property="og:title" content="OG Title" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not automatically add `og:title` if set to null', () => {
    const input = <Metadata title="My Title" og={{ title: null }} />
    const output = (
      <>
        <meta name="og:title" content="My Title" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).not.toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('adds an `og:description` tag if any `og` key present', () => {
    const input = <Metadata description="Lorem ipsum" og />
    const output = (
      <>
        <meta name="description" content="Lorem ipsum" />
        <meta property="og:description" content="Lorem ipsum" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not automatically add `og:description` if already present', () => {
    const input = (
      <Metadata
        description="Lorem ipsum"
        og={{ description: 'Dolar sit amet' }}
      />
    )
    const output = (
      <>
        <meta name="description" content="Lorem ipsum" />
        <meta property="og:description" content="Dolar sit amet" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not automatically add `og:description` if set to null', () => {
    const input = (
      <Metadata description="Lorem ipsum" og={{ description: null }} />
    )
    const output = (
      <>
        <meta property="og:description" content="Lorem ipsum" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).not.toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('adds an `og:type` tag if any `og` key present', () => {
    const input = <Metadata rel="test" og />
    const output = (
      <>
        <meta property="og:type" content="website" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not automatically add `og:type` if already present', () => {
    const input = <Metadata og={{ type: 'article' }} />
    const output = (
      <>
        <meta property="og:type" content="article" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not automatically add `og:type` if set to null', () => {
    const input = <Metadata og={{ type: null }} />
    const output = (
      <>
        <meta property="og:type" content="website" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).not.toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('does not create a standard name/content tag for the `charSet` prop', () => {
    const input = <Metadata charSet="utf-8" />
    const output = (
      <>
        <meta name="charSet" content="utf-8" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).not.toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('adds a special `charSet` meta tag if `charSet` prop present', () => {
    const input = <Metadata charSet="utf-8" />
    const output = (
      <>
        <meta charSet="utf-8" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toContain(
      render(output, { container: document.head }).container.innerHTML,
    )
  })

  it('renders a typical collection of <meta> tags', () => {
    const input = (
      <Metadata
        title="My Title"
        description="Lorem ipsum"
        charSet="utf-8"
        locale="en-US"
        og={{
          image: ['http://host.test/image1.jpg', { width: 1024, height: 768 }],
        }}
        twitter={{
          card: 'summary',
          site: '@username',
        }}
      />
    )
    const output = (
      <>
        <title>My Title</title>
        <meta name="title" content="My Title" />
        <meta name="description" content="Lorem ipsum" />
        <meta name="locale" content="en-US" />
        <meta property="og:image" content="http://host.test/image1.jpg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="768" />
        <meta property="twitter:card" content="summary" />
        <meta property="twitter:site" content="@username" />
        <meta charSet="utf-8" />
        <meta property="og:title" content="My Title" />
        <meta property="og:description" content="Lorem ipsum" />
        <meta property="og:type" content="website" />
      </>
    )

    expect(
      render(input, { container: document.head }).container.innerHTML,
    ).toEqual(render(output, { container: document.head }).container.innerHTML)
  })
})
