import { vi, describe, afterEach, test, expect } from 'vitest'

import { useOgImage, OGIMAGE_DEFAULTS } from './hooks'

const mockLocation = vi.fn()

vi.mock('@redwoodjs/router', () => {
  return {
    useLocation: () => mockLocation(),
  }
})

describe('useOgImage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('returns a plain URL with a default extension', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { url } = useOgImage()

    expect(url).toBe('http://localhost/user/1.png')
  })

  test('returns the default width of the image', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { width } = useOgImage()

    expect(width).toBe(OGIMAGE_DEFAULTS.width)
  })

  test('returns the default height of the image', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { height } = useOgImage()

    expect(height).toBe(OGIMAGE_DEFAULTS.height)
  })

  test('returns the default quality of the image', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { quality } = useOgImage()

    expect(quality).toBe(OGIMAGE_DEFAULTS.quality)
  })

  test('returns all the props necessary to build the og:image meta tags', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { ogProps } = useOgImage()

    expect(ogProps).toEqual({
      image: ['http://localhost/user/1.png', { width: 1200, height: 630 }],
    })
  })

  test('returns index.png if at the root', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/',
      searchParams: new URLSearchParams(),
    })

    const { url } = useOgImage()

    expect(url).toBe('http://localhost/index.png')
  })

  test('preserves existing query variables', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/about',
      searchParams: new URLSearchParams('foo=bar'),
    })

    const { url } = useOgImage()

    expect(url).toBe('http://localhost/about.png?foo=bar')
  })

  test('can include additional query variables in the form of URLSearchParams', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/about',
      searchParams: new URLSearchParams('foo=bar'),
    })

    const { url } = useOgImage({
      searchParams: new URLSearchParams({ baz: 'qux' }),
    })

    expect(url).toBe('http://localhost/about.png?foo=bar&baz=qux')
  })

  test('can include additional query variables in the form of an object', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/about',
      searchParams: new URLSearchParams('foo=bar'),
    })

    const { url } = useOgImage({
      searchParams: { baz: 'qux' },
    })

    expect(url).toBe('http://localhost/about.png?foo=bar&baz=qux')
  })

  test('searchParams should override existing query variables', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/about',
      searchParams: new URLSearchParams('foo=bar'),
    })

    const { url } = useOgImage({
      searchParams: { foo: 'baz' },
    })

    expect(url).toBe('http://localhost/about.png?foo=baz')
  })

  test('allows setting a custom extension', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1/edit',
      searchParams: new URLSearchParams(),
    })

    const { url } = useOgImage({ extension: 'jpg' })

    expect(url).toBe('http://localhost/user/1/edit.jpg')
  })

  test('allows setting a custom width', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { url, width, height } = useOgImage({ width: 1000 })

    expect(url).toBe('http://localhost/user/1.png?width=1000')
    expect(width).toBe(1000)
    expect(height).toBe(OGIMAGE_DEFAULTS.height)
  })

  test('allows setting a custom height', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { url, width, height } = useOgImage({ height: 500 })

    expect(url).toBe('http://localhost/user/1.png?height=500')
    expect(width).toBe(OGIMAGE_DEFAULTS.width)
    expect(height).toBe(500)
  })

  test('allows setting a custom quality', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams(),
    })

    const { url, quality } = useOgImage({ quality: 50 })

    expect(url).toBe('http://localhost/user/1.png?quality=50')
    expect(quality).toBe(50)
  })

  test('merges existing query variables with custom ones', () => {
    mockLocation.mockReturnValue({
      origin: 'http://localhost',
      pathname: '/user/1',
      searchParams: new URLSearchParams('foo=bar'),
    })

    const { url, width, height, quality } = useOgImage({
      extension: 'png',
      width: 1024,
      height: 768,
      quality: 75,
      searchParams: new URLSearchParams({ baz: 'qux' }),
    })

    expect(url).toBe(
      'http://localhost/user/1.png?foo=bar&baz=qux&width=1024&height=768&quality=75',
    )
    expect(width).toBe(1024)
    expect(height).toBe(768)
    expect(quality).toBe(75)
  })
})
