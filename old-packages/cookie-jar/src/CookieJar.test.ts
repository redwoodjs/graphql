/* to keep the tests a little cleaner by using ! */

import { describe, expect, test } from 'vitest'

import { CookieJar } from './CookieJar'

describe('CookieJar', () => {
  // Grabbed from github
  const cookieJar = new CookieJar(
    'color_mode=%7B%22color_mode%22%3A%22light%22%2C%22light_theme%22%3A%7B%22name%22%3A%22light%22%2C%22color_mode%22%3A%22light%22%7D%2C%22dark_theme%22%3A%7B%22name%22%3A%22dark_dimmed%22%2C%22color_mode%22%3A%22dark%22%7D%7D; preferred_color_mode=dark; tz=Asia%2FBangkok',
  )

  test('instantiates cookie jar from a cookie string', () => {
    expect(cookieJar.get('color_mode')).toStrictEqual(
      JSON.stringify({
        color_mode: 'light',
        light_theme: { name: 'light', color_mode: 'light' },
        dark_theme: { name: 'dark_dimmed', color_mode: 'dark' },
      }),
    )

    expect(cookieJar.get('preferred_color_mode')).toStrictEqual('dark')

    expect(cookieJar.get('tz')).toStrictEqual('Asia/Bangkok')
  })

  test('instatiation behavior with invalid string', () => {
    expect(new CookieJar('; session').get('foo')).toBeUndefined()
    expect(new CookieJar('; session').get('session')).toBeUndefined()
    expect(new CookieJar('session').get('session')).toBeUndefined()
    expect(new CookieJar('; session=woof-1234').get('session')).toEqual(
      'woof-1234',
    )
    expect(new CookieJar('kittens; session=woof-1234').get('session')).toEqual(
      'woof-1234',
    )
    expect(
      new CookieJar('kittens; session=woof-1234').get('kittens'),
    ).toBeUndefined()
    expect(
      new CookieJar('kittens; session=woof-1234; foo').get('foo'),
    ).toBeUndefined()
    expect(
      new CookieJar('kittens; session=woof-1234; foo=').get('foo'),
    ).toEqual('')
  })

  test('getWithOptions', () => {
    const jar = new CookieJar()
    jar.set('kittens', 'soft', { path: '/bazinga' })

    expect(jar.getWithOptions('kittens')).toStrictEqual({
      value: 'soft',
      options: {
        path: '/bazinga',
      },
    })
  })

  describe('Helper methods like JS Map', () => {
    test('has', () => {
      expect(cookieJar.has('color_mode')).toBe(true)
      expect(cookieJar.has('bazinga')).toBe(false)
    })

    test('size', () => {
      expect(cookieJar.size).toBe(3)
    })

    test('entries', () => {
      const iterator = cookieJar.entries()

      expect(iterator.next().done).toBe(false)
      expect(iterator.next().done).toBe(false)

      const finalItem = iterator.next()
      expect(finalItem.done).toBe(false)
      expect(finalItem.value).toStrictEqual(['tz', { value: 'Asia/Bangkok' }])

      expect(iterator.next().done).toBe(true)
    })

    // @MARK: API convention worth discussing!
    // Unset is a little special, it doesn't actually delete the cookie
    // but sets it to expire and sets an empty value
    test('unset', () => {
      const myJar = new CookieJar('auth_provider=kittens; session=woof-124556')

      myJar.unset('auth_provider')

      const authProviderValue = myJar.get('auth_provider')

      expect(authProviderValue).toBeFalsy()
    })

    test('clear All', () => {
      const myJar = new CookieJar('auth_provider=kittens; session=woof-124556')
      myJar.clear()
      expect(myJar.size).toBe(0)
    })

    test('clear by name', () => {
      const myJar = new CookieJar('auth_provider=kittens; session=woof-124556')
      myJar.clear('session')
      expect(myJar.size).toBe(1)
      expect(myJar.get('session')).toBeUndefined()
    })
  })
})
