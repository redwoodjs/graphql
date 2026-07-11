import prompts from 'prompts'
import { test, expect } from 'vitest'

import * as helpers from '../pluralHelpers'
import { pluralize, singularize } from '../rwPluralize'

test('validatePlural returns true if plural is single word and unique from singular', () => {
  const result = helpers.validatePlural('plural', 'singular')
  expect(result).toBe(true)
})

test('validatePlural returns error message if plural is more than one word', () => {
  const result = helpers.validatePlural('plural word', 'singular')
  expect(result).toBe('Only one word please!')
})

test('validatePlural returns error message if plural is same as singular', () => {
  const result = helpers.validatePlural('same', 'same')
  expect(result).toBe('Plural can not be same as singular.')
})

test('validatePlural returns error message if plural is empty - unicode ETB', () => {
  const result = helpers.validatePlural('\u0017', 'singular')
  expect(result).toBe('Plural can not be empty.')
})

test('ensureUniquePlural sets irregular rule from user input if singular is same as plural', async () => {
  const uncountableModel = 'pokemon'
  const userPluralInput = 'pikapika'
  prompts.inject(userPluralInput)

  await helpers.ensureUniquePlural({ model: uncountableModel })

  expect(singularize(uncountableModel)).toBe(uncountableModel)
  expect(pluralize(uncountableModel)).toBe(userPluralInput)
})

test('ensureUniquePlural skips any rule if singular and plural are already different', async () => {
  const singular = 'post'
  const plural = 'posts'
  // prompts.inject('pikapika') // should not ask for input

  await helpers.ensureUniquePlural({ model: singular })

  expect(singularize(singular)).toBe(singular)
  expect(pluralize(singular)).toBe(plural)
})

test('ensureUniquePlural handles PascalCase models', async () => {
  const uncountableModel = 'CustomPokemon'
  const userPluralInput = 'CustomPokemonii'
  prompts.inject(userPluralInput)

  await helpers.ensureUniquePlural({ model: uncountableModel })

  expect(singularize(uncountableModel)).toBe(uncountableModel)
  expect(pluralize(uncountableModel)).toBe(userPluralInput)
})

test('ensureUniquePlural handles PascalCase models, with *List input', async () => {
  const uncountableModel = 'FarmEquipment'
  const userPluralInput = 'FarmEquipmentList'
  prompts.inject(userPluralInput)

  await helpers.ensureUniquePlural({ model: uncountableModel })

  expect(singularize(uncountableModel)).toBe(uncountableModel)
  expect(pluralize(uncountableModel)).toBe(userPluralInput)
})
