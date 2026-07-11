import { vi, describe, it, expect } from 'vitest'

import * as ValidationErrors from '@redwoodjs/api'

import datamodel from '../__fixtures__/datamodel.js'
import RedwoodRecord from '../RedwoodRecord'
import Reflection from '../Reflection'
import RelationProxy from '../RelationProxy'

const db = { user: vi.fn() }

describe('reflect()', () => {
  it('returns instance of Reflection', () => {
    expect(RedwoodRecord.reflect instanceof Reflection).toEqual(true)
  })
})

describe('build()', () => {
  class Post extends RedwoodRecord {}
  class User extends RedwoodRecord {}
  class Comment extends RedwoodRecord {}
  User.requiredModels = [Post, Comment]
  User.schema = datamodel

  it('adds relation properties', () => {
    const user = User.build({})

    expect(user.posts instanceof RelationProxy).toEqual(true)
  })
})

describe('save()', () => {
  it('returns false if save fails', async () => {
    class User extends RedwoodRecord {
      static schema = datamodel
      static validates = {
        email: { presence: true },
      }
    }
    const user = new User()

    expect(await user.save()).toEqual(false)
  })

  it('throws an error if given the option', async () => {
    class User extends RedwoodRecord {
      static schema = datamodel
      static validates = {
        email: { presence: true },
      }
    }
    const user = new User()

    expect(user.save({ throw: true })).rejects.toThrow(
      ValidationErrors.PresenceValidationError,
    )
  })

  it('adds an error if not valid before saving', async () => {
    class User extends RedwoodRecord {
      static schema = datamodel
      static validates = {
        email: { presence: true },
      }
    }
    const user = new User()
    await user.save()

    expect(user.errors.email).toEqual(['Email must be present'])
  })
})

describe('_createPropertyForAttribute()', () => {
  it('creates error attribute placeholders', () => {
    RedwoodRecord.schema = datamodel
    const attrs = { foo: 'bar' }
    const record = RedwoodRecord.build(attrs)

    expect(record.errors.foo).toEqual([])
  })
})

describe('_onSaveError()', () => {
  class Post extends RedwoodRecord {}
  class User extends RedwoodRecord {}
  class Comment extends RedwoodRecord {}
  User.requiredModels = [Post, Comment]
  User.schema = datamodel
  User.db = db

  it('returns false if save fails', async () => {
    db.user.update = vi.fn(() => {
      throw new Error('Argument email must not be null')
    })
    const user = User.build({ id: 1, email: null })

    expect(await user.save()).toEqual(false)
  })

  it('adds an error if save fails', async () => {
    db.user.update = vi.fn(() => {
      throw new Error('Argument email must not be null')
    })
    const user = User.build({ id: 1, email: null })
    await user.save()

    expect(user.errors.email).toEqual(['must not be null'])
  })
})
