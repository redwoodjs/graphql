globalThis.__dirname = __dirname
// Load mocks
import '../../../../lib/test'

import { describe, test, expect } from 'vitest'

import * as service from '../service'

describe('the scenario generator', () => {
  test('parseSchema returns an object with required scalar fields', async () => {
    const { scalarFields } = await service.parseSchema('UserProfile')

    expect(scalarFields).toEqual([
      {
        name: 'username',
        kind: 'scalar',
        isList: false,
        isRequired: true,
        isUnique: true,
        isId: false,
        isReadOnly: false,
        type: 'String',
        hasDefaultValue: false,
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        hasDefaultValue: false,
        isGenerated: false,
        isId: false,
        isList: false,
        isReadOnly: true,
        isRequired: true,
        isUnique: false,
        isUpdatedAt: false,
        kind: 'scalar',
        name: 'userId',
        type: 'Int',
      },
    ])
  })

  test('parseSchema returns an object with BigINt scalar fields', async () => {
    const { scalarFields } = await service.parseSchema('Favorite')

    expect(scalarFields).toEqual([
      {
        name: 'postId',
        kind: 'scalar',
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isReadOnly: true,
        type: 'Int',
        hasDefaultValue: false,
        isGenerated: false,
        isUpdatedAt: false,
      },
      {
        name: 'likes',
        kind: 'scalar',
        isList: false,
        isRequired: true,
        isUnique: false,
        isId: false,
        isReadOnly: false,
        type: 'BigInt',
        hasDefaultValue: false,
        isGenerated: false,
        isUpdatedAt: false,
      },
    ])
  })

  test('parseSchema returns an empty object when no relation fields', async () => {
    const { relations } = await service.parseSchema('User')

    expect(relations).toEqual({})
  })

  test('parseSchema returns an object with relation fields', async () => {
    const { relations } = await service.parseSchema('UserProfile')

    expect(relations).toEqual({
      user: { foreignKey: ['userId'], type: 'User' },
    })
  })

  test('parseSchema returns an object with foreign keys', async () => {
    const { foreignKeys } = await service.parseSchema('UserProfile')

    expect(foreignKeys).toEqual(['userId'])
  })

  test('scenarioFieldValue returns a plain string for non-unique String types', () => {
    const field = { type: 'String', isUnique: false }
    const value = service.scenarioFieldValue(field)

    expect(value).toEqual(expect.any(String))
    expect(typeof value).toBe('string')
  })

  test('scenarioFieldValue returns a unique string for unique String types', () => {
    const field = { type: 'String', isUnique: true }
    const value = service.scenarioFieldValue(field)

    expect(value).toEqual(expect.any(String))
    // contains some unique digits somewhere
    expect(value).toMatch(/\d{1,}$/)
    expect(typeof value).toBe('string')
  })

  test('scenarioFieldValue returns a true for BigInt types', () => {
    const field = { type: 'BigInt' }
    const value = service.scenarioFieldValue(field)

    expect(value).toMatch(/^\d+n$/)
    expect(typeof value).toBe('string') // pseudo-bigint
  })

  test('scenarioFieldValue returns a true for Boolean types', () => {
    const field = { type: 'Boolean' }
    const value = service.scenarioFieldValue(field)

    expect(value).toEqual(true)
    expect(typeof value).toBe('boolean')
  })

  test('scenarioFieldValue returns a float for Decimal types', () => {
    const field = { type: 'Decimal' }
    const value = service.scenarioFieldValue(field)

    expect(value).toEqual(parseFloat(value))
    expect(typeof value).toBe('number')
  })

  test('scenarioFieldValue returns a float for Float types', () => {
    const field = { type: 'Float' }
    const value = service.scenarioFieldValue(field)

    expect(value).toEqual(parseFloat(value))
    expect(typeof value).toBe('number')
  })

  test('scenarioFieldValue returns a number for Int types', () => {
    const field = { type: 'Int' }
    const value = service.scenarioFieldValue(field)

    expect(value).toEqual(parseInt(value))
    expect(typeof value).toBe('number')
  })

  test('scenarioFieldValue returns a valid Date for DateTime types', () => {
    const field = { type: 'DateTime' }
    const value = service.scenarioFieldValue(field)

    expect(value instanceof Date).toBe(true)
    expect(!isNaN(value)).toBe(true)
  })

  test('scenarioFieldValue returns JSON for Json types', () => {
    const field = { type: 'Json' }

    expect(service.scenarioFieldValue(field)).toEqual({ foo: 'bar' })
  })

  test('scenarioFieldValue returns the first enum option for enum kinds', () => {
    const field = {
      type: 'Color',
      kind: 'enum',
      enumValues: [
        { name: 'Red', dbValue: null },
        { name: 'Blue', dbValue: null },
      ],
    }

    expect(service.scenarioFieldValue(field)).toEqual('Red')
  })

  test('scenarioFieldValue returns the dbName for enum types if present', () => {
    const field = {
      type: 'Color',
      kind: 'enum',
      enumValues: [
        { name: 'Red', dbName: 'color-red' },
        { name: 'Blue', dbName: 'color-blue' },
      ],
    }

    expect(service.scenarioFieldValue(field)).toEqual('color-red')
  })

  test('fieldsToScenario returns scenario data for scalarFields', async () => {
    const scalarFields = [
      {
        name: 'firstName',
        type: 'String',
        isUnique: false,
      },
      {
        name: 'lastName',
        type: 'String',
        isUnique: true,
      },
    ]
    const scenario = await service.fieldsToScenario(scalarFields, [], [])

    expect(Object.keys(scenario).length).toEqual(2)
    expect(scenario.firstName).toEqual(expect.any(String))
    expect(scenario.lastName).toEqual(expect.any(String))
    expect(scenario.lastName).toMatch(/\d{1,}$/)
  })

  test('fieldsToScenario returns scenario data for nested relations', async () => {
    const { scalarFields, relations, foreignKeys } =
      await service.parseSchema('UserProfile')

    const scenario = await service.fieldsToScenario(
      scalarFields,
      relations,
      foreignKeys,
    )

    expect(scenario.user).toEqual(
      expect.objectContaining({
        create: expect.objectContaining({
          email: expect.any(String),
        }),
      }),
    )
  })
})
