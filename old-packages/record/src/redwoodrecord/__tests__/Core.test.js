import { vi, afterEach, describe, it, expect } from 'vitest'

import * as Errors from '../../errors'
import datamodel from '../__fixtures__/datamodel.js'
import Core from '../Core'

// Mock Prisma
const db = { user: vi.fn() }

// Setup Core
Core.schema = datamodel
Core.db = db

// Test Models
class Post extends Core {
  static requiredModels = []
}
class User extends Core {
  static requiredModels = []
}
Post.requiredModels = [User]
User.requiredModels = [Post]

afterEach(() => {
  db.user.mockClear()
  User.primaryKey = 'id'
})

describe('static methods', () => {
  it('returns the name of itself', () => {
    expect(Core.name).toEqual('Core')
  })

  it('returns the db object', () => {
    expect(Core.db).toEqual(db)
  })

  it('defaults `accessor` property to undefined', () => {
    expect(Core.accessorName).toEqual(undefined)
  })

  it('can override the accessor name if needed', () => {
    class TestClass extends Core {
      static accessorName = 'TesterTable'
    }

    expect(TestClass.accessorName).toEqual('TesterTable')
  })

  it('defaults `primaryKey`', () => {
    expect(Core.primaryKey).toEqual('id')
  })

  it('stores the parsed schema.prisma', () => {
    expect(Core.schema).toHaveProperty('models')
  })
})

describe('instance methods', () => {
  describe('build()', () => {
    it('instantiates with a list of attributes', () => {
      const attrs = { foo: 'bar' }
      const record = Core.build(attrs)

      expect(record.attributes).toEqual(attrs)
    })

    it('creates getters for each attribute', () => {
      const record = Core.build({ foo: 'bar' })

      expect(record.foo).toEqual('bar')
    })

    it('creates setters for each attribute', () => {
      const record = Core.build({ foo: 'bar' })
      record.foo = 'baz'

      expect(record.foo).toEqual('baz')
    })

    it('skips getters/setters with a `create` or `connect` child key', () => {
      const connect = Core.build({ id: 1, posts: { connect: { id: 2 } } })
      expect(connect.posts).toEqual(undefined)

      const create = Core.build({ id: 1, comments: { create: { id: 2 } } })
      expect(create.comments).toEqual(undefined)
    })
  })
})

// Subclass behavior, needs to be backed by an actual model to work

describe('User subclass', () => {
  describe('static methods', () => {
    describe('accessor', () => {
      it('returns table representation on prisma client', () => {
        expect(User.accessor).toEqual(db.user)
      })
    })

    describe('where', () => {
      it('returns an array of User records', async () => {
        db.user.findMany = vi.fn(() => [
          {
            id: 1,
            email: 'rob@redwoodjs.com',
          },
        ])

        const where = { email: 'rob@redwoodjs.com' }
        await User.where(where)

        expect(db.user.findMany).toHaveBeenCalledWith({ where })
      })
    })

    describe('all', () => {
      it('calls where with an empty first argument', async () => {
        db.user.findMany = vi.fn(() => [])
        await User.all()

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {},
        })
      })

      it('is an alias for where', async () => {
        db.user.findMany = vi.fn(() => [
          {
            id: 1,
            email: 'rob@redwoodjs.com',
          },
        ])

        expect(await User.all()).toEqual(await User.where())
      })
    })

    describe('create', () => {
      it('initializes and saves a new record from a list of attributes', async () => {
        const attributes = {
          email: 'peter@redwoodjs.com',
          name: 'Peter Pistorius',
          hashedPassword: 'abc',
          salt: 'abc',
        }
        db.user.create = vi.fn(() => ({ id: 1, ...attributes }))

        const user = await User.create(attributes)

        expect(db.user.create).toHaveBeenCalledWith({ data: attributes })
        expect(user instanceof User).toEqual(true)
        expect(user.id).not.toEqual(undefined)
        expect(user.email).toEqual('peter@redwoodjs.com')
        expect(user.name).toEqual('Peter Pistorius')
      })
    })

    describe('find', () => {
      it('finds a user by ID', async () => {
        const id = 1
        db.user.findFirst = vi.fn(() => ({
          id,
          email: 'rob@redwoodjs.com',
        }))
        const user = await User.find(id)

        expect(db.user.findFirst).toHaveBeenCalledWith({ where: { id } })
        expect(user.id).toEqual(id)
      })

      it('throws RedwoodRecordNotFound if ID is not found', async () => {
        db.user.findFirst = vi.fn(() => null)

        try {
          await User.find(999999999)
        } catch (e) {
          expect(e instanceof Errors.RedwoodRecordNotFoundError).toEqual(true)
          expect(e.message).toEqual('User record not found')
        }
        expect.assertions(2)
      })
    })

    describe('findBy', () => {
      it('returns the first record if no arguments', async () => {
        const id = 1
        db.user.findFirst = vi.fn(() => ({
          id,
          email: 'rob@redwoodjs.com',
        }))

        const user = await User.findBy()

        expect(db.user.findFirst).toHaveBeenCalledWith({})
        expect(user.id).toEqual(id)
      })

      it('returns the first record that matches the given attributes', async () => {
        const id = 1
        db.user.findFirst = vi.fn(() => ({
          id,
          email: 'tom@redwoodjs.com',
        }))

        const user = await User.findBy({ email: 'tom@redwoodjs.com' })

        expect(db.user.findFirst).toHaveBeenCalledWith({
          where: { email: 'tom@redwoodjs.com' },
        })
        expect(user.id).toEqual(id)
      })

      it('returns null if no records', async () => {
        db.user.findFirst = vi.fn(() => null)

        expect(await User.findBy()).toEqual(null)
      })
    })

    describe('first', () => {
      it('is an alias for findBy', async () => {
        const id = 1
        db.user.findFirst = vi.fn(() => ({
          id,
          email: 'tom@redwoodjs.com',
        }))

        const userFirst = await User.first()
        const userFindBy = await User.findBy()

        expect(db.user.findFirst).toHaveBeenCalledTimes(2)
        expect(db.user.findFirst).toHaveBeenCalledWith({})
        expect(userFirst).toEqual(userFindBy)
      })
    })
  })

  describe('instance methods', () => {
    describe('destroy', () => {
      it('deletes a record', async () => {
        const data = { id: 1, email: 'tom@redwoodjs.com' }
        db.user.delete = vi.fn(() => data)
        const user = User.build(data)

        await user.destroy()

        expect(db.user.delete).toHaveBeenCalledWith({
          where: { id: data.id },
        })
      })

      it('returns the record that was deleted', async () => {
        const data = { id: 1, email: 'tom@redwoodjs.com' }
        db.user.delete = vi.fn(() => data)
        const user = User.build(data)
        const result = await user.destroy()

        expect(result).toEqual(user)
      })

      it('returns false if record not found', async () => {
        db.user.delete = vi.fn(() => {
          throw new Error('Record to delete does not exist')
        })
        const user = User.build({ id: 99999999 })

        expect(await user.destroy()).toEqual(false)
      })

      it('throws an error if record not found', async () => {
        db.user.delete = vi.fn(() => {
          throw new Error('Record to delete does not exist')
        })
        const user = User.build({ id: 99999999 })

        await expect(user.destroy({ throw: true })).rejects.toThrow(
          Errors.RedwoodRecordNotFoundError,
        )
      })
    })

    describe('save', () => {
      describe('create new', () => {
        it('returns true if create is successful', async () => {
          const attributes = {
            email: 'peter@redwoodjs.com',
            name: 'Peter Pistorius',
            hashedPassword: 'abc',
            salt: 'abc',
          }
          db.user.create = vi.fn(() => ({ id: 1, ...attributes }))
          const user = await User.build(attributes)

          const result = await user.save()

          expect(db.user.create).toHaveBeenCalledWith({ data: attributes })
          expect(result.id).toEqual(1)
        })

        it('returns false if create fails', async () => {
          db.user.create = vi.fn(() => {
            throw new Error()
          })
          const user = await User.build({ email: 'foo@bar.com' })
          const result = await user.save()

          expect(db.user.create).toHaveBeenCalledWith({
            data: { email: 'foo@bar.com' },
          })
          expect(result).toEqual(false)
        })

        it('throws error for missing attribute', async () => {
          db.user.create = vi.fn(() => {
            throw new Error('Argument email is missing')
          })
          const user = await User.build({})

          try {
            await user.save({ throw: true })
          } catch (e) {
            expect(
              e instanceof Errors.RedwoodRecordMissingAttributeError,
            ).toEqual(true)
          }
          expect.assertions(1)
        })

        it('throws error for null attribute', async () => {
          db.user.create = vi.fn(() => {
            throw new Error('Argument email must not be null')
          })
          const user = await User.build({ email: null })

          try {
            await user.save({ throw: true })
          } catch (e) {
            expect(e instanceof Errors.RedwoodRecordNullAttributeError).toEqual(
              true,
            )
          }
          expect.assertions(1)
        })

        it('throws for otherwise uncaught error', async () => {
          db.user.create = vi.fn(() => {
            throw new Error('Something bad happened')
          })
          const user = await User.build({ email: null })

          try {
            await user.save({ throw: true })
          } catch (e) {
            expect(e instanceof Errors.RedwoodRecordUncaughtError).toEqual(true)
          }
          expect.assertions(1)
        })
      })

      describe('update existing', () => {
        it('returns true if update is successful', async () => {
          const attributes = {
            email: 'updated@redwoodjs.com',
            name: 'Peter Pistorius',
            hashedPassword: 'abc',
            salt: 'abc',
          }
          db.user.update = vi.fn(() => attributes)
          const user = await User.build({ id: 1, ...attributes })
          const result = await user.save()

          expect(db.user.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: attributes,
          })
          expect(result.email).toEqual('updated@redwoodjs.com')
        })

        it('allows different primary key', async () => {
          User.primaryKey = 'userId'
          const attributes = {
            email: 'updated@redwoodjs.com',
            name: 'Peter Pistorius',
            hashedPassword: 'abc',
            salt: 'abc',
          }
          db.user.update = vi.fn(() => attributes)
          const user = await User.build({ userId: 1, ...attributes })
          await user.save()

          expect(db.user.update).toHaveBeenCalledWith({
            where: { userId: 1 },
            data: attributes,
          })
        })

        it('returns false if update fails', async () => {
          db.user.update = vi.fn(() => {
            throw new Error('Record to update not found')
          })
          const user = await User.build({ id: 99999999 })
          const result = await user.save()

          expect(result).toEqual(false)
        })

        it('throws if record not found', async () => {
          db.user.update = vi.fn(() => {
            throw new Error('Record to update not found')
          })
          const user = await User.build({ id: 99999999 })

          try {
            await user.save({ throw: true })
          } catch (e) {
            expect(e instanceof Errors.RedwoodRecordNotFoundError).toEqual(true)
          }

          expect.assertions(1)
        })

        it('throws on null required field if given the option', async () => {
          db.user.update = vi.fn(() => {
            throw new Error('Argument email must not be null')
          })
          const user = await User.build({ id: 99999999 })
          user.email = null

          try {
            await user.save({ throw: true })
          } catch (e) {
            expect(e instanceof Errors.RedwoodRecordNullAttributeError).toEqual(
              true,
            )
          }

          expect.assertions(1)
        })
      })
    })

    describe('update', () => {
      it('updates an existing record with new data', async () => {
        const attributes = {
          email: 'updated@redwoodjs.com',
          name: 'Robert Cameron',
          hashedPassword: 'abc',
          salt: 'abc',
        }
        db.user.update = vi.fn(() => attributes)
        const user = await User.build({ id: 1, ...attributes })
        const _result = await user.update({ name: 'Robert Cameron' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: attributes,
        })
        expect(user.name).toEqual('Robert Cameron')
      })
    })
  })
})
