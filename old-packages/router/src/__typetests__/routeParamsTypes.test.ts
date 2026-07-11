import { describe, expect, test } from 'tstyche'

import type { RouteParams, ParamType } from '@redwoodjs/router'

/**
 * FAQ:
 * - why aren't you using .toBeAssignable() in all tests?
 * because {b: string} is assignable to Record, and then test isn't accurate enough
 *
 * - why aren't you just checking the entire type?
 * because sometimes, the parser returns {Params & GenericParams} (and that's ok!), checking the full type will cause failures
 *
 * - why are you assigning the const values if you're just checking the types?
 * for readability: param?.id! everywhere is ugly - it helps with making these tests read like documentation
 *
 */

describe('RouteParams<>', () => {
  test('Single parameters', () => {
    const simple: RouteParams<'bazinga/{id:Int}'> = {
      id: 2,
    }

    expect(simple.id).type.toBeNumber()
  })

  test('Starts with parameter', () => {
    const startParam: RouteParams<'/{position:Int}/{driver:Float}/stats'> = {
      position: 1,
      driver: 44,
    }

    expect(startParam.driver).type.toBeNumber()
    expect(startParam.position).type.toBeNumber()
  })

  test('Route string with no types defaults to string', () => {
    const untypedParams: RouteParams<'/blog/{year}/{month}/{day}/{slug}'> = {
      year: '2020',
      month: '01',
      day: '01',
      slug: 'hello-world',
    }

    expect(untypedParams.year).type.toBeString()
    expect(untypedParams.month).type.toBeString()
    expect(untypedParams.day).type.toBeString()
    expect(untypedParams.slug).type.toBeString()
  })

  test('Custom param types', () => {
    const customParams: RouteParams<'/post/{name:slug}'> = {
      name: 'hello-world-slug',
    }

    expect(customParams.name).type.toBeString()
  })

  test('Parameter inside string', () => {
    const stringConcat: RouteParams<'/signedUp/e{status:Boolean}y'> = {
      status: true,
    }

    expect(stringConcat.status).type.toBeBoolean()
  })

  test('Multiple Glob route params', () => {
    const globRoutes: RouteParams<'/from/{fromDate...}/to/{toDate...}'> = {
      fromDate: '2021/11/03',
      toDate: '2021/11/17',
    }

    expect(globRoutes.fromDate).type.toBeString()
    expect(globRoutes.toDate).type.toBeString()
  })

  test('Single Glob route params', () => {
    const globRoutes: RouteParams<'/from/{fromDate...}'> = {
      fromDate: '2021/11/03',
    }

    expect(globRoutes.fromDate).type.toBeString()
  })

  test('Starts with Glob route params', () => {
    const globRoutes: RouteParams<'/{description...}-little/kittens'> = {
      description: 'cute',
    }

    expect(globRoutes.description).type.toBeString()
  })

  test('Glob params in the middle', () => {
    const middleGlob: RouteParams<'/repo/{folders...}/edit'> = {
      folders: 'src/lib/auth.js',
    }

    expect(middleGlob.folders).type.toBeString()
  })

  test('Mixed typed and untyped params', () => {
    const untypedFirst: RouteParams<'/mixed/{b}/{c:Boolean}'> = {
      b: 'bazinga',
      c: true,
    }

    const typedFirst: RouteParams<'/mixed/{b:Float}/{c}'> = {
      b: 1245,
      c: 'stringy-string',
    }

    expect(untypedFirst.b).type.toBeString()
    expect(untypedFirst.c).type.toBeBoolean()

    expect(typedFirst.b).type.toBeNumber()
    expect(typedFirst.c).type.toBeString()
  })

  test('Params in the middle', () => {
    const paramsInTheMiddle: RouteParams<'/posts/{authorId:string}/{id:Int}/edit'> =
      {
        authorId: 'id:author',
        id: 10,
      }

    expect(paramsInTheMiddle.authorId).type.toBeString()
    expect(paramsInTheMiddle.id).type.toBeNumber()
  })
})

describe('ParamType<>', () => {
  test('Float', () => {
    expect<ParamType<'Float'>>().type.toBeAssignableWith(1.02)
  })

  test('Boolean', () => {
    expect<ParamType<'Boolean'>>().type.toBeAssignableWith(true)
    expect<ParamType<'Boolean'>>().type.toBeAssignableWith(false)
  })

  test('Int', () => {
    expect<ParamType<'Int'>>().type.toBeAssignableWith(51)
  })

  test('String', () => {
    expect<ParamType<'String'>>().type.toBeAssignableWith('bazinga')
  })
})
