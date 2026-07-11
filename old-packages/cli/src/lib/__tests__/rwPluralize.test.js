import { test, expect } from 'vitest'

import {
  pluralize,
  singularize,
  isPlural,
  isSingular,
  addSingularPlural,
} from '../rwPluralize'

test('pluralize', () => {
  expect(pluralize('books')).toEqual('books')

  expect(pluralize('book')).toEqual('books')
  expect(pluralize('Book')).toEqual('Books')
  expect(pluralize('tooth')).toEqual('teeth')

  expect(pluralize('equipment')).toEqual('equipment')
  expect(pluralize('News')).toEqual('News')

  expect(pluralize('Data')).toEqual('Data')

  expect(pluralize('DataModel')).toEqual('DataModels')
})

test('singularize', () => {
  expect(singularize('book')).toEqual('book')

  expect(singularize('books')).toEqual('book')
  expect(singularize('Books')).toEqual('Book')
  expect(singularize('teeth')).toEqual('tooth')

  expect(singularize('equipment')).toEqual('equipment')
  expect(singularize('News')).toEqual('News')

  expect(singularize('Data')).toEqual('Datum')

  expect(singularize('DataModels')).toEqual('DataModel')
  expect(singularize('CustomerData')).toEqual('CustomerDatum')
})

test('isPlural', () => {
  expect(isPlural('books')).toEqual(true)
  expect(isPlural('Books')).toEqual(true)
  expect(isPlural('teeth')).toEqual(true)

  expect(isPlural('book')).toEqual(false)
  expect(isPlural('Book')).toEqual(false)
  expect(isPlural('tooth')).toEqual(false)

  expect(isPlural('News')).toEqual(true)
  expect(isPlural('Data')).toEqual(true)
})

test('isSingular', () => {
  expect(isSingular('book')).toEqual(true)
  expect(isSingular('Book')).toEqual(true)
  expect(isSingular('tooth')).toEqual(true)

  expect(isSingular('books')).toEqual(false)
  expect(isSingular('Books')).toEqual(false)
  expect(isSingular('teeth')).toEqual(false)

  expect(isSingular('News')).toEqual(true)
  expect(isSingular('Data')).toEqual(false)
  expect(isSingular('Datum')).toEqual(true)
})

test('addSingularPlural', () => {
  expect(pluralize('Pokemon')).toEqual('Pokemon')
  expect(singularize('Pokemon')).toEqual('Pokemon')
  expect(pluralize('CustomPokemon')).toEqual('CustomPokemon')
  expect(singularize('CustomPokemon')).toEqual('CustomPokemon')

  // "Pokemons" is an unknown word, so it's handled by the default
  // "For words that ends with an s, trim the s" rule
  expect(singularize('Pokemons')).toEqual('Pokemon')

  addSingularPlural('Pokemon', 'Pokemonii')

  expect(pluralize('Pokemon')).toEqual('Pokemonii')
  expect(singularize('Pokemonii')).toEqual('Pokemon')
  expect(singularize('Pokemon')).toEqual('Pokemon')
  expect(pluralize('CustomPokemon')).toEqual('CustomPokemonii')
  expect(singularize('CustomPokemonii')).toEqual('CustomPokemon')
  expect(singularize('CustomPokemon')).toEqual('CustomPokemon')
  expect(singularize('CustomPokemons')).toEqual('CustomPokemon')

  addSingularPlural('CustomPokemon', 'CustomPokemonList')

  expect(pluralize('CustomPokemon')).toEqual('CustomPokemonList')
  expect(singularize('CustomPokemonList')).toEqual('CustomPokemon')
  expect(singularize('CustomPokemon')).toEqual('CustomPokemon')
  expect(pluralize('Pokemon')).toEqual('Pokemonii')
  expect(singularize('Pokemonii')).toEqual('Pokemon')
  expect(singularize('Pokemon')).toEqual('Pokemon')
  expect(singularize('Pokemons')).toEqual('Pokemon')

  addSingularPlural('Pokemon', 'PokemonList')

  expect(pluralize('Pokemon')).toEqual('PokemonList')
  expect(singularize('PokemonList')).toEqual('Pokemon')
  expect(singularize('Pokemon')).toEqual('Pokemon')
  expect(singularize('Pokemons')).toEqual('Pokemon')
  expect(pluralize('CustomPokemon')).toEqual('CustomPokemonList')
  expect(singularize('CustomPokemonList')).toEqual('CustomPokemon')
  expect(singularize('CustomPokemon')).toEqual('CustomPokemon')

  // The Pokemonii rule has been replaced, and so we use the default rule for
  // making words that end with i singular, which is to do nothing
  expect(singularize('Pokemonii')).toEqual('Pokemonii')
})
