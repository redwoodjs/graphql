import { describe, it, expect } from 'vitest'

import {
  paramsForRoute,
  matchPath,
  parseSearch,
  validatePath,
  flattenSearchParams,
  replaceParams,
} from '../util.js'

describe('paramsForRoute', () => {
  it.each([
    ['/post/{slug}', [['slug', 'String', '{slug}']]],
    ['/post/{slug...}', [['slug', 'Glob', '{slug...}']]],
    ['/id/{id:Int}', [['id', 'Int', '{id:Int}']]],
  ])('extracts name and type info', (route, info) => {
    expect(paramsForRoute(route)).toEqual(info)
  })
})

describe('matchPath', () => {
  it.each([
    ['/post/{id:Int}', '/post/notAnInt'],
    ['/post/{id:Int}', '/post/2.0'],
    ['/post/{id:Int}', '/post/.1'],
    ['/post/{id:Int}', '/post/0.1'],
    ['/post/{id:Int}', '/post/123abcd'],
    ['/post/{id:Int}', '/post/abcd123'],
    ['/blog/{year}/{month:Int}/{day}', '/blog/2019/december/07'],
    ['/blog/{year}/{month}/{day}', '/blog/2019/07'],
    ['/posts/{id}/edit', '/posts//edit'],
    ['/about', '/'],
  ])('does not match route "%s" with path "%s"', (route, pathname) => {
    expect(matchPath(route, pathname)).toEqual({ match: false })
  })

  it('matches valid paths and extracts params correctly', () => {
    expect(matchPath('/blog/{year}/{month}/{day}', '/blog/2019/12/07')).toEqual(
      { match: true, params: { day: '07', month: '12', year: '2019' } },
    )
  })

  it('transforms a param for Int', () => {
    expect(matchPath('/post/{id}', '/post/1337')).toEqual({
      match: true,
      params: { id: '1337' },
    })

    expect(matchPath('/post/{id:Int}', '/post/1337')).toEqual({
      match: true,
      params: { id: 1337 },
    })

    expect(matchPath('/post/id-{id:Int}', '/post/id-37')).toEqual({
      match: true,
      params: { id: 37 },
    })

    expect(matchPath('/post/{id:Int}-id', '/post/78-id')).toEqual({
      match: true,
      params: { id: 78 },
    })

    expect(matchPath('/post/id-{id:Int}-id', '/post/id-789-id')).toEqual({
      match: true,
      params: { id: 789 },
    })

    expect(matchPath('/{id:Int}/bazinga', '/89/bazinga')).toEqual({
      match: true,
      params: { id: 89 },
    })
  })

  it('transforms a param for Boolean', () => {
    expect(matchPath('/signedUp/{status:Boolean}', '/signedUp/true')).toEqual({
      match: true,
      params: {
        status: true,
      },
    })

    expect(matchPath('/signedUp/{status:Boolean}', '/signedUp/false')).toEqual({
      match: true,
      params: {
        status: false,
      },
    })

    expect(
      matchPath('/signedUp/x-{status:Boolean}', '/signedUp/x-false'),
    ).toEqual({
      match: true,
      params: {
        status: false,
      },
    })

    expect(
      matchPath('/signedUp/{status:Boolean}y', '/signedUp/falsey'),
    ).toEqual({
      match: true,
      params: {
        status: false,
      },
    })

    expect(
      matchPath('/signedUp/e{status:Boolean}y', '/signedUp/efalsey'),
    ).toEqual({
      match: true,
      params: {
        status: false,
      },
    })

    expect(
      matchPath('/signedUp/{status:Boolean}', '/signedUp/somethingElse'),
    ).toEqual({
      match: false,
    })
  })

  it('transforms a param for Floats', () => {
    expect(
      matchPath('/version/{floatyMcFloat:Float}', '/version/1.58'),
    ).toEqual({
      match: true,
      params: {
        floatyMcFloat: 1.58,
      },
    })

    expect(matchPath('/version/{floatyMcFloat:Float}', '/version/626')).toEqual(
      {
        match: true,
        params: {
          floatyMcFloat: 626,
        },
      },
    )

    expect(
      matchPath('/version/{floatyMcFloat:Float}', '/version/+0.92'),
    ).toEqual({
      match: true,
      params: {
        floatyMcFloat: 0.92,
      },
    })

    expect(
      matchPath('/version/{floatyMcFloat:Float}', '/version/-5.5'),
    ).toEqual({
      match: true,
      params: {
        floatyMcFloat: -5.5,
      },
    })

    expect(matchPath('/version/{floatyMcFloat:Float}', '/version/4e8')).toEqual(
      {
        match: true,
        params: {
          floatyMcFloat: 4e8,
        },
      },
    )

    expect(
      matchPath('/version/{floatyMcFloat:Float}', '/version/noMatchMe'),
    ).toEqual({
      match: false,
    })
  })

  it('transforms a param for Globs', () => {
    //single
    expect(matchPath('/version/{path...}', '/version/path/to/file')).toEqual({
      match: true,
      params: {
        path: 'path/to/file',
      },
    })

    //  multiple
    expect(matchPath('/a/{a...}/b/{b...}/c', '/a/1/2/b/3/4/c')).toEqual({
      match: true,
      params: {
        a: '1/2',
        b: '3/4',
      },
    })

    // adjacent
    expect(matchPath('/a/{a...}{b...}/c', '/a/1/2/3/4/c')).toEqual({
      match: true,
      params: {
        a: '1/2/3/4',
        b: '',
      },
    })

    // adjacent with a slash
    expect(matchPath('/a/{a...}/{b...}/c', '/a/1/2/3/4/c')).toEqual({
      match: true,
      params: {
        a: '1/2/3',
        b: '4',
      },
    })

    // prefixed
    expect(matchPath('/a-{a...}', '/a-1/2')).toEqual({
      match: true,
      params: {
        a: '1/2',
      },
    })

    // suffixed
    expect(matchPath('/{a...}-a/kittens', '/1/2-a/kittens')).toEqual({
      match: true,
      params: {
        a: '1/2',
      },
    })
  })

  it('handles multiple typed params', () => {
    expect(
      matchPath(
        '/dashboard/document/{id:Int}/{version:Float}/edit/{edit:Boolean}/{path...}/terminate',
        '/dashboard/document/44/1.8/edit/false/path/to/file/terminate',
      ),
    ).toEqual({
      match: true,
      params: { id: 44, version: 1.8, edit: false, path: 'path/to/file' },
    })
  })
})

describe('validatePath', () => {
  it.each([
    { path: 'invalid/route', routeName: 'isInvalid' },
    { path: '{id}/invalid/route', routeName: 'isInvalid' },
    { path: ' /invalid/route', routeName: 'isInvalid' },
  ])(
    'rejects "%s" path that does not begin with a slash',
    ({ path, routeName }) => {
      expect(() => validatePath(path, routeName)).toThrowError(
        `Route path for ${routeName} does not begin with a slash: "${path}"`,
      )
    },
  )

  it.each([
    { path: '/path/to/user profile', routeName: 'hasSpaces' },
    { path: '/path/ to/userprofile', routeName: 'hasSpaces' },
    { path: '/path/to /userprofile', routeName: 'hasSpaces' },
    { path: '/path/to/users/{id: Int}', routeName: 'hasSpaces' },
    { path: '/path/to/users/{id :Int}', routeName: 'hasSpaces' },
    { path: '/path/to/users/{id : Int}', routeName: 'hasSpaces' },
    { path: '/path/to/users/{ id:Int}', routeName: 'hasSpaces' },
    { path: '/path/to/users/{id:Int }', routeName: 'hasSpaces' },
    { path: '/path/to/users/{ id:Int }', routeName: 'hasSpaces' },
    { path: '/path/to/users/{ id : Int }', routeName: 'hasSpaces' },
  ])('rejects paths with spaces: "%s"', ({ path, routeName }) => {
    expect(() => validatePath(path, routeName)).toThrowError(
      `Route path for ${routeName} contains spaces: "${path}"`,
    )
  })

  it.each([
    { path: '/users/{id}/photos/{id}', routeName: 'hasDuplicateParams' },
    { path: '/users/{id}/photos/{id:Int}', routeName: 'hasDuplicateParams' },
    { path: '/users/{id:Int}/photos/{id}', routeName: 'hasDuplicateParams' },
    {
      path: '/users/{id:Int}/photos/{id:Int}',
      routeName: 'hasDuplicateParams',
    },
  ])('rejects path "%s" with duplicate params', ({ path, routeName }) => {
    expect(() => validatePath(path, routeName)).toThrowError(
      `Route path contains duplicate parameter: "${path}"`,
    )
  })

  it.each([
    {
      path: '/users/{id:Int}/photos/{photo_id:Int}',
      routeName: 'validCorrectPath',
    },
    { path: '/users/{id}/photos/{photo_id}', routeName: 'validCorrectPath' },
    {
      path: '/users/{id}/photos/{photo_id}?format=jpg&w=400&h=400',
      routeName: 'validCorrectPath',
    },
    { path: '/', routeName: 'validCorrectPath' },
    { path: '/404', routeName: 'validCorrectPath' },
    { path: '/about', routeName: 'validCorrectPath' },
    { path: '/about/redwood', routeName: 'validCorrectPath' },
  ])('validates correct path "%s"', ({ path, routeName }) => {
    expect(() => validatePath(path, routeName)).not.toThrow()
  })

  it.each([
    { path: '/path/{ref}', routeName: 'ref' },
    { path: '/path/{ref}/bazinga', routeName: 'ref' },
    { path: '/path/{ref:Int}', routeName: 'ref' },
    { path: '/path/{ref:Int}/bazinga', routeName: 'ref' },
    { path: '/path/{key}', routeName: 'key' },
    { path: '/path/{key}/bazinga', routeName: 'key' },
    { path: '/path/{key:Int}', routeName: 'key' },
    { path: '/path/{key:Int}/bazinga', routeName: 'key' },
  ])(
    'rejects paths with ref or key as path parameters: "%s"',
    ({ path, routeName }) => {
      expect(() => validatePath(path, routeName)).toThrowError(
        [
          `Route for ${routeName} contains ref or key as a path parameter: "${path}"`,
          "`ref` and `key` shouldn't be used as path parameters because they're special React props.",
          'You can fix this by renaming the path parameter.',
        ].join('\n'),
      )
    },
  )

  it.each([
    { path: '/path/{reff}', routeName: 'validRefKeyVariations' },
    { path: '/path/{reff:Int}', routeName: 'validRefKeyVariations' },
    { path: '/path/{reff}/bazinga', routeName: 'validRefKeyVariations' },
    { path: '/path/{keys}', routeName: 'validRefKeyVariations' },
    { path: '/path/{keys:Int}', routeName: 'validRefKeyVariations' },
    { path: '/path/key', routeName: 'validRefKeyVariations' },
    { path: '/path/key/bazinga', routeName: 'validRefKeyVariations' },
  ])(
    `doesn't reject paths with variations on ref or key as path parameters: "%s"`,
    ({ path, routeName }) => {
      expect(() => validatePath(path, routeName)).not.toThrowError()
    },
  )
})

describe('parseSearch', () => {
  it('deals silently with an empty search string', () => {
    expect(parseSearch('')).toEqual({})
  })

  it('correctly parses a search string', () => {
    expect(
      parseSearch('?search=all+dogs+go+to+heaven&category=movies'),
    ).toEqual({ category: 'movies', search: 'all dogs go to heaven' })
  })
})

describe('flattenSearchParams', () => {
  it('returns a flat array from query string', () => {
    expect(
      flattenSearchParams('?search=all+dogs+go+to+heaven&category=movies'),
    ).toEqual([{ search: 'all dogs go to heaven' }, { category: 'movies' }])
  })

  it('returns an empty array', () => {
    expect(flattenSearchParams('')).toEqual([])
  })
})

describe('replaceParams', () => {
  it('throws an error on missing params', () => {
    expect(() => replaceParams('/tags/{tag}', {})).toThrowError(
      "Missing parameter 'tag' for route '/tags/{tag}' when generating a navigation URL.",
    )
  })

  it('replaces named parameter with value from the args object', () => {
    expect(replaceParams('/tags/{tag}', { tag: 'code' })).toEqual('/tags/code')
  })

  it('replaces multiple named parameters with values from the args object', () => {
    expect(
      replaceParams('/posts/{year}/{month}/{day}', {
        year: '2021',
        month: '09',
        day: '19',
      }),
    ).toEqual('/posts/2021/09/19')
  })

  it('appends extra parameters as search parameters', () => {
    expect(replaceParams('/extra', { foo: 'foo' })).toEqual('/extra?foo=foo')
    expect(replaceParams('/tags/{tag}', { tag: 'code', foo: 'foo' })).toEqual(
      '/tags/code?foo=foo',
    )
  })

  it('handles falsy parameter values', () => {
    expect(replaceParams('/category/{categoryId}', { categoryId: 0 })).toEqual(
      '/category/0',
    )

    expect(replaceParams('/boolean/{bool}', { bool: false })).toEqual(
      '/boolean/false',
    )

    expect(() =>
      replaceParams('/undef/{undef}', { undef: undefined }),
    ).toThrowError(
      "Missing parameter 'undef' for route '/undef/{undef}' when generating a navigation URL.",
    )
  })

  it('handles typed params', () => {
    expect(replaceParams('/post/{id:Int}', { id: 7 })).toEqual('/post/7')
    expect(replaceParams('/post/{id:Float}', { id: 7 })).toEqual('/post/7')
    expect(replaceParams('/post/{id:Bool}', { id: true })).toEqual('/post/true')
    expect(replaceParams('/post/{id:Bool}', { id: false })).toEqual(
      '/post/false',
    )
    expect(replaceParams('/post/{id:String}', { id: 7 })).toEqual('/post/7')
  })

  it('handles globs', () => {
    expect(replaceParams('/path/{path...}', { path: 'foo/bar' })).toEqual(
      '/path/foo/bar',
    )

    expect(replaceParams('/a/{b...}/c/{d...}/e', { b: 1, d: 2 })).toEqual(
      '/a/1/c/2/e',
    )
  })

  // See link below for the rules
  // https://blog.lunatech.com/posts/2009-02-03-what-every-web-developer-must-know-about-url-encoding
  it('properly encodes search parameters', () => {
    expect(replaceParams('/search', { q: 'foo bar' })).toEqual(
      '/search?q=foo+bar',
    )

    expect(replaceParams('/index-value', { 's&p500': '2024-01-17' })).toEqual(
      '/index-value?s%26p500=2024-01-17',
    )

    expect(replaceParams('/search', { q: 'home & garden' })).toEqual(
      '/search?q=home+%26+garden',
    )

    expect(replaceParams('/dir', { path: '/Users/rob/Photos' })).toEqual(
      '/dir?path=%2FUsers%2Frob%2FPhotos',
    )

    expect(replaceParams('/calc', { expr: '1+2' })).toEqual('/calc?expr=1%2B2')
  })

  it('skips search parameters with `undefined` and `null` values', () => {
    expect(replaceParams('/s', { a: '', b: 0, c: undefined, d: null })).toEqual(
      '/s?a=&b=0',
    )
  })
})
