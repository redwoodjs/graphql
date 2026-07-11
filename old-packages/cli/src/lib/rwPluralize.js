import * as plurals from 'pluralize'

const mappings = {
  toSingular: {},
  toPlural: {},
}

/**
 * Find Bar in FooBazBar
 *
 * @type {(str: string) => string }
 */
function lastWord(str) {
  const capitals = str.match(/[A-Z]/g)
  const lastIndex = str.lastIndexOf(capitals?.slice(-1)[0])

  return lastIndex >= 0 ? str.slice(lastIndex) : str
}

/**
 * Returns the plural form of the given word
 *
 * @type {(word: string) => string }
 */
export function pluralize(word) {
  if (mappings.toPlural[word]) {
    return mappings.toPlural[word]
  }

  // Sometimes `word` is a PascalCased multi-word, like FarmEquipment
  // In those cases we only want to pass the last word on to the `pluralize`
  // library
  const singular = lastWord(word)
  const base = word.slice(0, word.length - singular.length)

  if (mappings.toPlural[singular]) {
    return base + mappings.toPlural[singular]
  }

  return base + plurals.plural(singular)
}

/**
 * Returns the singular form of the given word
 *
 * @type {(word: string) => string }
 */
export function singularize(word) {
  if (mappings.toSingular[word]) {
    return mappings.toSingular[word]
  }

  const plural = lastWord(word)
  const base = word.slice(0, word.length - plural.length)

  if (mappings.toSingular[plural]) {
    return base + mappings.toSingular[plural]
  }

  return base + plurals.singular(plural)
}

/** @type {(word: string) => boolean } */
export function isPlural(word) {
  return plurals.isPlural(lastWord(word))
}

/** @type {(word: string) => boolean } */
export function isSingular(word) {
  return plurals.isSingular(lastWord(word))
}

/**
 * Adds a new mapping from singular to plural
 *
 * With the input 'pokemon', 'pokemonii' we'll add mappings for singular
 * 'pokemon' to plural 'pokemonii'. We also add the reverse, so plural
 * 'pokemonii' to singular 'pokemon'. We *also* have to make sure that
 * the singular of 'pokemon' is 'pokemon', and that the plural of
 * 'pokemonii' is 'pokemonii'
 *
 * After calling with 'pokemon', 'pokemonii' we'll have this
 *
 * mappings = {
 *   toSingular: {
 *     pokemonii: 'pokemon',
 *     pokemon: 'pokemon'
 *   },
 *   toPlural: {
 *     pokemon: 'pokemonii',
 *     pokemonii: 'pokemonii'
 *   }
 * }
 *
 * Furthermore we need to handle changing the mappings (this is only done in
 * tests). So if the method is called again, with input 'pokemon', 'pokemons'
 * all the old mappings first have to be removed, before adding the new ones
 *
 * @param {string} singular
 * @param {string} plural
 *
 * @returns {undefined}
 */
export function addSingularPlural(singular, plural) {
  const existingPlural = Object.keys(mappings.toSingular).find(
    (key) => mappings.toSingular[key] === singular,
  )
  delete mappings.toSingular[existingPlural]
  delete mappings.toPlural[existingPlural]

  mappings.toPlural[singular] = plural
  mappings.toPlural[plural] = plural
  mappings.toSingular[plural] = singular
  mappings.toSingular[singular] = singular
}
