import type { InMemoryClient } from '@redwoodjs/api/cache'

type AsymmetricMatcher = {
  $$typeof: symbol
}

type ExpectedValue = Array<any> | any | AsymmetricMatcher
type ExpectedKey = string | RegExp
// Custom Jest matchers to be used with Redwood's server caching
// Just needs a global import like import '@redwoodjs/testing/cache'

expect.extend({
  toHaveCached(
    cacheClient: InMemoryClient,
    keyOrExpectedValue: ExpectedKey | ExpectedValue,
    expectedValue?: ExpectedValue
  ) {
    let value: ExpectedValue
    let regexKey: RegExp | undefined
    let stringKey: string | undefined

    // Figures out which form of this function we're calling:
    // with one or two arguments

    if (_isKVPair(keyOrExpectedValue, expectedValue)) {
      // Two argument form, the key that is caching it and the value that is cached:
      // toHaveCached('cache-key', { foo: 'bar' })
      if (keyOrExpectedValue instanceof RegExp) {
        regexKey = keyOrExpectedValue
      } else {
        stringKey = keyOrExpectedValue
      }
      value = expectedValue
    } else {
      // One argument form, only check the value that's cached:
      //  toHaveCached({ foo: 'bar' })
      value = keyOrExpectedValue
    }

    const serializedValue = JSON.stringify(value)

    let foundKVPair: { key: string; value: any } | undefined
    let found = false

    // If its a stringKey we can do direct lookup
    if (stringKey) {
      return _checkValueForKey(cacheClient, stringKey, value)
    } else {
      // For RegEx expectedKey or just a value check, we need to iterate
      for (const [cachedKey, cachedValue] of Object.entries(
        cacheClient.storage
      )) {
        if (regexKey?.test(cachedKey)) {
          found = true
          foundKVPair = { key: cachedKey, value: cachedValue.value }
          break
        } else {
          // no key was passed, just match on value
          found = cachedValue.value === serializedValue
          break
        }
      }
    }

    // Key was supplied as a regex
    // So we check if the value is cached, and return early
    if (foundKVPair) {
      return _checkValueForKey(cacheClient, foundKVPair.key, value)
    }

    if (found) {
      return {
        pass: true,
        message: () => 'Found cached value',
      }
    } else {
      return {
        pass: false,
        message: () =>
          `Expected Cached Value: ${this.utils.printExpected(
            serializedValue
          )}\n` +
          `Cache Contents: ${this.utils.printReceived(cacheClient.storage)}`,
      }
    }
  },
})

const _isKVPair = (
  keyOrCachedValue: ExpectedKey | ExpectedValue,
  cachedValue?: ExpectedValue
): keyOrCachedValue is ExpectedKey => {
  return !!cachedValue && !!keyOrCachedValue
}

const _checkValueForKey = (
  cacheClient: InMemoryClient,
  cacheKey: string,
  expectedValue: ExpectedValue
) => {
  try {
    const cachedStringValue = cacheClient.storage[cacheKey]?.value

    // Check if its a jest asymmetric matcher i.e. objectContaining, arrayContaining
    const expectedValueOrMatcher =
      expectedValue?.$$typeof === Symbol.for('jest.asymmetricMatcher')
        ? expectedValue
        : // Because e.g. dates get converted to string, when cached
          /**  @MARK, @TODO: Should we be doing this?
           * It makes testing with scenarios much easier:
           * expect(testCacheClient).toHaveCached(scenario.post.three)

          *  BUT..... is it a bit too much magic?
           *
           *  If we don't do this, the user would need to do this:
           * expect(testCacheClient).toHaveCached(JSON.parse(JSON.stringify(scenario.post.three)))
           *
           * It also introduces in consistency with the other matchers e.g.
           *
           *
           *     expect(testCacheClient).toHaveCached(
                    /posts-findMany.*\/,
                  partialMatch([scenario.post.two])
                  ) 🛑 won't work, because the createdAt and updatedAt fields are not strings

           * Maybe its a bit of pain we actually want... so it's obvious that the cache only contains
                  serialized values?
           */
          JSON.parse(JSON.stringify(expectedValue))

    expect(cachedStringValue && JSON.parse(cachedStringValue)).toEqual(
      expectedValueOrMatcher
    )

    return {
      pass: true,
      message: () => `Found cached value with ${cacheKey}`,
    }
  } catch (e: any) {
    // Return the message from jest's helpers so they get a nice diff
    // and exit early!
    return {
      pass: false,
      message: () => e.message,
    }
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /**
       *
       * The expected value you provide will be serialized and deseriliazed for you.
       *
       * NOTE: Does not support partialMatch - use cacheClient.contents or test with a key!
       * @param expectedValue The value that is cached, must be serializable
       */
      toHaveCached(expectedValue: unknown): R

      /**
       *
       * Use this helper to simplify testing your InMemoryCache client.
       *
       *
       * @param cacheKey They key that your value is cached under
       * @param expectedValue The expected value. Can be a jest asymmetric matcher (using `partialMatch`)
       */
      toHaveCached(cacheKey: ExpectedKey, expectedValue: ExpectedValue): R
    }
  }
}

/**
 * This is just syntactic sugar, to help with testing cache contents.
 *
 * If you pass an array, it will check arrays for a partial match of the object.
 *
 * If you pass an object, it will check for a partial match
 *
 * @example
 * expect(testCacheClient.contents).toContainEqual(partialMatch({ title: 'Only look for this title'}))
 *
 * @example
 * expect(testCacheClient.contents).toContainEqual(partialMatch([{id: 1}]))
 *
 * @param value Object or Array of object to match
 */
export const partialMatch = (
  value: Record<any, any> | Array<Record<any, any>>
) => {
  return Array.isArray(value)
    ? expect.arrayContaining([expect.objectContaining(value[0])])
    : expect.objectContaining(value)
}
