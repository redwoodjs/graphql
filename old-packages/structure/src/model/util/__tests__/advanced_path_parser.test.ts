import { describe, test } from 'vitest'

import { advanced_path_parser } from '../advanced_path_parser'

describe('advanced_path_parser', () => {
  test('it works', () => {
    const route = '/foo/{param1}/bar/{baz:Int}/x'
    advanced_path_parser(route) //?
  })
})
