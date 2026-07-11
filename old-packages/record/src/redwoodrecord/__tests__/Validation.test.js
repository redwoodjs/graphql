import { beforeEach, describe, it, expect } from 'vitest'

import { PresenceValidationError } from '@redwoodjs/api'

import Validation from '../ValidationMixin'

class Mixin {}
class TestClass extends Validation(Mixin) {}

beforeEach(() => {
  TestClass.validates = {}
})

describe('hasError', () => {
  it('defaults to false', () => {
    const record = new TestClass()

    expect(record.hasError).toEqual(false)
  })

  it('returns true if there are base errors', () => {
    const record = new TestClass()
    record.addError('base', 'base is invalid')

    expect(record.hasError).toEqual(true)
  })

  it('returns true if there are field errors', () => {
    const record = new TestClass()
    record.addError('foo', 'foo is invalid')

    expect(record.hasError).toEqual(true)
  })

  it('resets once validations are run', () => {
    const record = new TestClass()
    record.addError('base', 'base is invalid')
    expect(record.hasError).toEqual(true)

    record.validate()
    expect(record.hasError).toEqual(false)
  })
})

describe('isValid', () => {
  it('returns true if record has no validations', () => {
    const record = new TestClass()

    expect(record.isValid).toEqual(true)
  })

  it('returns true if record is valid', () => {
    TestClass.validates = {
      email: { presence: true },
    }

    const record = new TestClass()
    record.email = 'rob@redwoodjs.com'

    expect(record.isValid).toEqual(true)
  })

  it('returns false if record is invalid', () => {
    TestClass.validates = {
      email: { presence: true },
    }

    const record = new TestClass()
    record.email = null

    expect(record.isValid).toEqual(false)
  })
})

describe('validate', () => {
  it('returns true if record has no validations', () => {
    const record = new TestClass()

    expect(record.validate()).toEqual(true)
  })

  it('sets no errors if no validations', () => {
    const record = new TestClass()

    expect(record.errors).toEqual({ base: [] })
  })

  it('returns true if single validation passes', () => {
    TestClass.validates = {
      email: { presence: true },
    }
    const record = new TestClass()
    record.email = 'rob@redwoodjs.com'

    expect(record.validate()).toEqual(true)
  })

  it('sets no error message if validation passes', () => {
    TestClass.validates = {
      email: { presence: true },
    }
    const record = new TestClass()
    record.email = 'rob@redwoodjs.com'
    record.validate()

    expect(record.errors).toEqual({ base: [] })
  })

  it('returns true if multiple validations pass', () => {
    TestClass.validates = {
      email: { presence: true, email: true },
    }
    const record = new TestClass()
    record.email = 'rob@redwoodjs.com'

    expect(record.validate()).toEqual(true)
  })

  it('returns false if single validation fails', () => {
    TestClass.validates = {
      email: { presence: true },
    }
    const record = new TestClass()
    record.email = null

    expect(record.validate()).toEqual(false)
  })

  it('sets error message if validation fails', () => {
    TestClass.validates = {
      email: { presence: true },
    }
    const record = new TestClass()
    record.email = null
    record.validate()

    expect(record.errors.email).toEqual(['Email must be present'])
  })

  it('returns false if any one of multiple validations on single field fails', () => {
    TestClass.validates = {
      email: { presence: true, email: true },
    }
    const record = new TestClass()
    record.email = 'invalid'

    expect(record.validate()).toEqual(false)
  })

  it('returns false if any one of multiple validations on multiple fields fails', () => {
    TestClass.validates = {
      email: { email: true },
      name: { presence: true },
    }
    const record = new TestClass()
    record.email = 'invalid'
    record.name = null

    expect(record.validate()).toEqual(false)
  })

  it('sets multiple error message if multiple validations fail', () => {
    TestClass.validates = {
      email: { email: true },
      name: { presence: true },
    }
    const record = new TestClass()
    record.email = 'invalid'
    record.name = null
    record.validate()

    expect(record.errors.email).toEqual([
      'Email must be formatted like an email address',
    ])
    expect(record.errors.name).toEqual(['Name must be present'])
  })

  it('throws error on validation if option provided', () => {
    TestClass.validates = {
      email: { presence: true },
    }
    const record = new TestClass()
    record.email = null

    expect(() => record.validate({ throw: true })).toThrow(
      PresenceValidationError,
    )
  })
})
