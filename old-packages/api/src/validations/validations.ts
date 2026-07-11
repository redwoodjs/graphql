// Handles validating values in services

import { PrismaClient } from '@prisma/client'
import pascalcase from 'pascalcase'

import * as ValidationErrors from './errors'

type WithOptionalMessage<T = Record<string, unknown>> = T & {
  /**
   * A message to be shown if the validation fails.
   */
  message?: string
}
type WithRequiredMessage<T = Record<string, unknown>> =
  Required<WithOptionalMessage> & T

interface AbsenceValidatorOptions extends WithOptionalMessage {
  /**
   * Will count an empty string as being absent (that is, null, undefined and "" will pass this validation)
   */
  allowEmptyString?: boolean
}

interface AcceptanceValidatorOptions extends WithOptionalMessage {
  /**
   * An array of values that, if any match, will pass the validation.
   */
  in?: unknown[]
}

type EmailValidatorOptions = WithOptionalMessage

interface ExclusionValidatorOptions extends WithOptionalMessage {
  /**
   * The list of values that cannot be used.
   */
  in?: unknown[]
  caseSensitive?: boolean
}

interface FormatValidatorOptions extends WithOptionalMessage {
  /**
   * The regular expression to use.
   */
  pattern?: RegExp
}

interface InclusionValidatorOptions extends WithOptionalMessage {
  /**
   * The list of values that can be used.
   */
  in?: unknown[]
  caseSensitive?: boolean
}

interface LengthValidatorOptions extends WithOptionalMessage {
  /**
   * Must be at least this number of characters long.
   */
  min?: number
  /**
   * Must be no more than this number of characters long.
   */
  max?: number
  /**
   * Must be exactly this number of characters long.
   */
  equal?: number
  /**
   * Convenience syntax for defining min and max as an array
   *
   * @example
   * validate(input.title, 'Title', {
   *  length: { between: [2, 255] }
   * })
   */
  between?: number[]
}

interface NumericalityValidatorOptions extends WithOptionalMessage {
  /**
   * The number must be an integer.
   */
  integer?: boolean
  /**
   * The number must be less than the given value.
   */
  lessThan?: number
  /**
   * The number must be less than or equal to the given value.
   */
  lessThanOrEqual?: number
  /**
   * The number must be greater than the given value.
   */
  greaterThan?: number
  /**
   * The number must be greater than or equal to the given number.
   */
  greaterThanOrEqual?: number
  /**
   * The number must be equal to the given number.
   */
  equal?: number
  /**
   * The number must not be equal to the given number.
   */
  otherThan?: number
  /**
   * The number must be even.
   */
  even?: boolean
  /**
   * The number must be odd.
   */
  odd?: boolean
  /**
   * The number must be positive.
   */
  positive?: boolean
  /**
   * The number must be negative.
   */
  negative?: boolean
}

interface PresenceValidatorOptions extends WithOptionalMessage {
  /**
   * Whether or not to allow null to be considered present.
   *
   * @default false
   */
  allowNull?: boolean
  /**
   * Whether or not to allow undefined to be considered present.
   *
   * @default false
   */
  allowUndefined?: boolean
  /**
   * Whether or not to allow an empty string "" to be considered present.
   *
   * @default false
   */
  allowEmptyString?: boolean
}

interface CustomValidatorOptions extends WithOptionalMessage {
  /**
   * A function which should either throw or return nothing
   */
  with: () => void
}

interface UniquenessValidatorOptions extends WithOptionalMessage {
  db?: PrismaClient
}
type UniquenessWhere = Record<'AND' | 'NOT', Record<string, unknown>[]>

interface ValidationRecipe {
  /**
   * Requires that a field NOT be present, meaning it must be `null` or `undefined`.
   *
   * Opposite of the [`presence`](https://redwoodjs.com/docs/services.html#presence) validator.
   */
  absence?: boolean | AbsenceValidatorOptions
  /**
   * Requires that the passed value be `true`, or within an array of allowed values that will be considered "true".
   */
  acceptance?: boolean | AcceptanceValidatorOptions
  /**
   * Requires that the value be formatted like an email address by comparing against a regular expression.
   * The regex is extremely lax: `/^[^@\s]+@[^.\s]+\.[^\s]+$/`
   *
   * This says that the value:
   *
   * * Must start with one or more characters that aren't a whitespace or literal @
   * * Followed by a @
   * * Followed by one or more characters that aren't a whitespace or literal .
   * * Followed by a .
   * * Ending with one or more characters that aren't whitespace
   *
   * Since the official email regex is around 6,300 characters long, we though this one was good enough.
   * If you have a different, preferred email validation regular expression, use the format validation.
   */
  email?: boolean | EmailValidatorOptions
  /**
   * Requires that the given value not equal to any in a list of given values.
   *
   * Opposite of the [inclusion](https://redwoodjs.com/docs/services.html#inclusion) validation.
   */
  exclusion?: unknown[] | ExclusionValidatorOptions
  /**
   * Requires that the value match a given regular expression.
   */
  format?: RegExp | FormatValidatorOptions
  /**
   * Requires that the given value is equal to one in a list of given values.
   *
   * Opposite of the [exclusion](https://redwoodjs.com/docs/services.html#exclusion) validation.
   */
  inclusion?: unknown[] | InclusionValidatorOptions
  /**
   * Requires that the value meet one or more of a number of string length validations.
   */
  length?: LengthValidatorOptions
  /**
   * The awesomely-named Numericality Validation requires that the value passed meet one or more criteria that are all number related.
   */
  numericality?: boolean | NumericalityValidatorOptions
  /**
   * Requires that a field be present, meaning it must not be null or undefined.
   *
   * Opposite of the [absence](https://redwoodjs.com/docs/services.html#absence) validator.
   */
  presence?: boolean | PresenceValidatorOptions

  /**
   * Run a custom validation function which should either throw or return nothing.
   * If the function throws an error, the error message will be used as the validation error associated with the field.
   */
  custom?: CustomValidatorOptions
}
// We extend ValidationRecipe to get its method's documentation.
// Adding docs below will completely overwrite ValidationRecipe's.
interface ValidationWithMessagesRecipe extends ValidationRecipe {
  absence?: WithRequiredMessage<AbsenceValidatorOptions>
  acceptance?: WithRequiredMessage<AcceptanceValidatorOptions>
  email?: WithRequiredMessage<EmailValidatorOptions>
  exclusion?: WithRequiredMessage<ExclusionValidatorOptions>
  format?: WithRequiredMessage<FormatValidatorOptions>
  inclusion?: WithRequiredMessage<InclusionValidatorOptions>
  length?: WithRequiredMessage<LengthValidatorOptions>
  numericality?: WithRequiredMessage<NumericalityValidatorOptions>
  presence?: WithRequiredMessage<PresenceValidatorOptions>
  custom?: WithRequiredMessage<CustomValidatorOptions>
}

const VALIDATORS = {
  // Requires that the given value is `null` or `undefined`
  //
  // `allowEmptyString`: if true, counts "" as being absent (does not throw)
  //
  // { absence: true }
  // { absence: { allowEmptyString: true, message: '...' } }
  absence: (
    value: unknown,
    name: string,
    options: boolean | AbsenceValidatorOptions,
  ) => {
    const absenceOptions = { allowEmptyString: false }
    Object.assign(absenceOptions, options)

    if (value === '') {
      if (!absenceOptions.allowEmptyString) {
        validationError('absence', name, options)
      }
    } else if (value != null) {
      validationError('absence', name, options)
    }
  },

  // Requires that the given field be `true` and nothing else, unless an array
  // of valid values is included with an `in` option
  //
  // { acceptance: true }
  // { acceptance: { in: ['true','1'], message: '...' } }
  acceptance: (
    value: unknown,
    name: string,
    options: boolean | AcceptanceValidatorOptions,
  ) => {
    let acceptedValues: unknown[]

    if (typeof options === 'object') {
      acceptedValues = options.in || []
    } else {
      acceptedValues = [true]
    }

    if (!acceptedValues.includes(value)) {
      validationError('acceptance', name, options)
    }
  },

  // Requires that the given value be formatted like an email address. Uses a
  // very simple regex which checks for at least 1 character that is not an @,
  // then an @, then at least one character that isn't a period, then a period,
  // then any character. There cannot be any spaces present.
  //
  // { email: true }
  // { email: { message: '...' } }
  email: (
    value: unknown,
    name: string,
    options: boolean | EmailValidatorOptions,
  ) => {
    const pattern = /^[^@\s]+@[^.\s]+\.[^\s]+$/

    if (!pattern.test(String(value))) {
      validationError('email', name, options)
    }
  },

  // Requires that the given value NOT be in the list of possible values
  //
  // { exclusion: ['foo', 'bar'] }
  // { exclusion: { in: ['foo','bar'], message: '...' } }
  exclusion: (
    value: unknown,
    name: string,
    options: unknown[] | ExclusionValidatorOptions,
  ) => {
    const [exclusionList, val] = prepareExclusionInclusion(value, options)

    if (exclusionList.includes(val)) {
      validationError('exclusion', name, options)
    }
  },

  // Requires that the given value match a regular expression
  //
  // { format: /^foobar$/ }
  // { format: { pattern: /^foobar$/, message: '...' } }
  format: (
    value: unknown,
    name: string,
    options: RegExp | FormatValidatorOptions,
  ) => {
    const pattern = options instanceof RegExp ? options : options.pattern

    if (pattern == null) {
      throw new ValidationErrors.FormatValidationError(
        name,
        'No pattern for format validation',
      )
    }

    if (!pattern.test(String(value))) {
      validationError('format', name, options)
    }
  },

  // Requires that the given value be in the list of possible values
  //
  // { inclusion: ['foo', 'bar'] }
  // { inclusion: { in: ['foo','bar'], message: '...' } }
  inclusion: (
    value: unknown,
    name: string,
    options: unknown[] | InclusionValidatorOptions,
  ) => {
    const [inclusionList, val] = prepareExclusionInclusion(value, options)

    if (!inclusionList.includes(val)) {
      validationError('inclusion', name, options)
    }
  },

  // Requires that the given string be a certain length:
  //
  // `min`: must be at least `min` characters
  // `max`: must be no more than `max` characters
  // `equal`: must be exactly `equal` characters
  // `between`: an array consisting of the `min` and `max` length
  //
  // { length: { min: 4 } }
  // { length: { min: 2, max: 16 } }
  // { length: { between: [2, 16], message: '...' } }
  length: (value: unknown, name: string, options: LengthValidatorOptions) => {
    const len = String(value).length

    if (options.min && len < options.min) {
      validationError('minLength', name, options, { min: options.min })
    }
    if (options.max && len > options.max) {
      validationError('maxLength', name, options, { max: options.max })
    }
    if (options.equal && len !== options.equal) {
      validationError('equalLength', name, options, { equal: options.equal })
    }
    if (
      options.between &&
      (len < options.between[0] || len > options.between[1])
    ) {
      validationError('betweenLength', name, options, {
        min: options.between[0],
        max: options.between[1],
      })
    }
  },

  // Requires that number value meets some criteria:
  //
  // `integer`: value must be an integer
  // `lessThan`: value must be less than `lessThan`
  // `lessThanOrEqual`: value must be less than or equal to `lessThanOrEqual`
  // `greaterThan`: value must be greater than `greaterThan`
  // `greaterThanOrEqual`: value must be greater than or equal to `greaterThanOrEqual`
  // `equal`: value must equal `equal`
  // `otherThan`: value must be anything other than `otherThan`
  // `even`: value must be an even number
  // `odd`: value must be an odd number
  // `positive`: value must be a positive number
  // `negative`: value must be a negative number
  //
  // { numericality: true }
  // { numericality: { integer: true } }
  // { numericality: { greaterThan: 3.5, message: '...' } }
  numericality: (
    value: unknown,
    name: string,
    options: boolean | NumericalityValidatorOptions,
  ) => {
    if (typeof value !== 'number') {
      validationError('typeNumericality', name, options)
    }

    // if there are no options, all we can do is check that value is a number
    if (typeof options === 'boolean') {
      return
    } else {
      if (options.integer && !Number.isInteger(value)) {
        validationError('integerNumericality', name, options)
      }
      if (options.lessThan != null && (value as number) >= options.lessThan) {
        validationError('lessThanNumericality', name, options, {
          lessThan: options.lessThan,
        })
      }
      if (
        options.lessThanOrEqual != null &&
        (value as number) > options.lessThanOrEqual
      ) {
        validationError('lessThanOrEqualNumericality', name, options, {
          lessThanOrEqual: options.lessThanOrEqual,
        })
      }
      if (
        options.greaterThan != null &&
        (value as number) <= options.greaterThan
      ) {
        validationError('greaterThanNumericality', name, options, {
          greaterThan: options.greaterThan,
        })
      }
      if (
        options.greaterThanOrEqual != null &&
        (value as number) < options.greaterThanOrEqual
      ) {
        validationError('greaterThanOrEqualNumericality', name, options, {
          greaterThanOrEqual: options.greaterThanOrEqual,
        })
      }
      if (options.equal != null && value !== options.equal) {
        validationError('equalNumericality', name, options, {
          equal: options.equal,
        })
      }
      if (options.otherThan != null && value === options.otherThan) {
        validationError('otherThanNumericality', name, options, {
          otherThan: options.otherThan,
        })
      }
      if (options.even && (value as number) % 2 !== 0) {
        validationError('evenNumericality', name, options)
      }
      if (options.odd && (value as number) % 2 !== 1) {
        validationError('oddNumericality', name, options)
      }
      if (options.positive && (value as number) <= 0) {
        validationError('positiveNumericality', name, options)
      }
      if (options.negative && (value as number) >= 0) {
        validationError('negativeNumericality', name, options)
      }
    }
  },

  // Requires that the given value is not `null` or `undefined`. By default will
  // consider an empty string to pass
  //
  // `allowEmptyString`: if set to `false` will throw an error if value is ""
  // `allowNull`: if `true` will allow `null`
  // `allowUndefined`: if `true` will allow `undefined`
  //
  // Default behavior is equivalent to:
  //   { allowNull: false, allowUndefined: false, allowEmptyString: true }
  //
  // { presence: true }
  // { presence: { allowEmptyString: false, message: '...' } }
  presence: (
    value: unknown,
    name: string,
    options: boolean | PresenceValidatorOptions,
  ) => {
    const presenceOptions = {
      allowNull: false,
      allowUndefined: false,
      allowEmptyString: true,
    }
    Object.assign(presenceOptions, options)

    if (
      (!presenceOptions.allowNull && value === null) ||
      (!presenceOptions.allowUndefined && value === undefined) ||
      (!presenceOptions.allowEmptyString && value === '')
    ) {
      validationError('presence', name, options)
    }
  },

  custom: (_value: unknown, name: string, options: CustomValidatorOptions) => {
    try {
      options.with()
    } catch (e) {
      const message = options.message || (e as Error).message || (e as string)

      validationError('custom', name, { message })
    }
  },
}

// Turns the keys of an object into a comma-delimited string
//
// { email: 'rob@redwood.com', name: 'Rob' } => 'email, name'
const fieldsToString = (fields: Record<string, unknown>) => {
  const output = []
  for (const [key, _value] of Object.entries(fields)) {
    output.push(key)
  }
  return output.join(', ')
}

// Throws the requisite error message for a failed validation
const validationError = (
  type: string,
  name: string,
  options: any,
  substitutions = {},
) => {
  const errorClassName = `${pascalcase(
    type,
  )}ValidationError` as keyof typeof ValidationErrors
  const ErrorClass = ValidationErrors[errorClassName]
  const errorMessage =
    typeof options === 'object' ? (options.message as string) : undefined

  throw new ErrorClass(name, errorMessage, substitutions)
}

// Generate the final list and value used for exclusion/inclusion by taking
// case-sensitivity into consideration. The returned array and value then
// can simply be used with Array.includes to perform exclusion/inclusion checks.
const prepareExclusionInclusion = (
  value: unknown,
  options: unknown[] | InclusionValidatorOptions | ExclusionValidatorOptions,
): [unknown[], unknown] => {
  const inputList = (Array.isArray(options) && options) || options.in || []

  // default case sensitivity to true
  const caseSensitive = Array.isArray(options)
    ? true
    : (options.caseSensitive ?? true)

  return caseSensitive
    ? [inputList, value]
    : [
        inputList.map((s) => (s as string).toLowerCase()),
        (value as string).toLowerCase(),
      ]
}

// Main validation function, `directives` decides which actual validators
// above to use
//
// validate('firstName', 'Rob', { presence: true, length: { min: 2 } })
export function validate(
  value: unknown,
  labelOrRecipe: ValidationWithMessagesRecipe,
  recipe?: never,
): void
export function validate(
  value: unknown,
  labelOrRecipe: string,
  recipe: ValidationRecipe,
): void
export function validate(
  value: unknown,
  labelOrRecipe: string | ValidationWithMessagesRecipe,
  recipe?: ValidationRecipe,
): void {
  let label, validationRecipe

  if (typeof labelOrRecipe === 'object') {
    label = ''
    validationRecipe = labelOrRecipe
  } else {
    label = labelOrRecipe
    validationRecipe = recipe as ValidationRecipe
  }

  for (const [validator, options] of Object.entries(validationRecipe)) {
    if (typeof options === 'undefined') {
      continue
    }

    VALIDATORS[validator as keyof typeof VALIDATORS](value, label, options)
  }
}

// Run a custom validation function which should either throw or return nothing.
// Why not just write your own function? Because GraphQL will swallow it and
// just send "Something went wrong" back to the client. This captures any custom
// error you throw and turns it into a ServiceValidationError which will show
// the actual error message.
export const validateWithSync = (func: () => void) => {
  try {
    func()
  } catch (e) {
    const message = (e as Error).message || (e as string)
    throw new ValidationErrors.ServiceValidationError(message)
  }
}

// Async version is the default
export const validateWith = async (func: () => Promise<any>) => {
  try {
    await func()
  } catch (e) {
    const message = (e as Error).message || (e as string)
    throw new ValidationErrors.ServiceValidationError(message)
  }
}

// Wraps `callback` in a transaction to guarantee that `field` is not found in
// the database and that the `callback` is executed before someone else gets a
// chance to create the same value.
//
// In the case of updating an existing record, a uniqueness check will fail
// (because the existing record itself will be returned from the database). In
// this case you can provide a `$self` key with the `where` object to exclude
// the current record.
//
// There is an optional `$scope` key which contains additional the `where`
// clauses to include when checking whether the field is unique. So rather than
// a product name having to be unique across the entire database, you could
// check that it is only unique among a subset of records with the same
// `companyId`.
//
// return validateUniqueness('user', { email: 'rob@redwoodjs.com' }, { message: '...'}, (db) => {
//   return db.create(data: { email })
// })
//
// return validateUniqueness('user', {
//   email: 'rob@redwoodjs.com',
//   $self: { id: 123 }
// }, (db) => {
//   return db.create(data: { email })
// })
//
// return validateUniqueness('user', {
//   email: 'rob@redwoodjs.com',
//   $scope: { companyId: input.companyId }
// }, (db) => {
//   return db.create(data: { email })
// })
//
// const myCustomDb = new PrismaClient({
//   log: emitLogLevels(['info', 'warn', 'error']),
//   datasources: {
//     db: {
//       url: process.env.DATABASE_URL,
//     },
//   },
// })
// return validateUniqueness('user', { email: 'rob@redwoodjs.com' }, { prismaClient: myCustomDb}, (db) => {
//   return db.create(data: { email })
// })
export async function validateUniqueness(
  model: string,
  fields: Record<string, unknown>,
  optionsOrCallback: (tx: PrismaClient) => Promise<any>,
  callback: never,
): Promise<any>
export async function validateUniqueness(
  model: string,
  fields: Record<string, unknown>,
  optionsOrCallback: UniquenessValidatorOptions,
  callback?: (tx: PrismaClient) => Promise<any>,
): Promise<any>
export async function validateUniqueness(
  model: string,
  fields: Record<string, unknown>,
  optionsOrCallback:
    | UniquenessValidatorOptions
    | ((tx: PrismaClient) => Promise<any>),
  callback?: (tx: PrismaClient) => Promise<any>,
): Promise<any> {
  const { $self, $scope, ...rest } = fields
  let options: UniquenessValidatorOptions = {}
  let validCallback: (tx: PrismaClient) => Promise<any>
  let db = null

  if (typeof optionsOrCallback === 'function') {
    validCallback = optionsOrCallback
  } else {
    options = optionsOrCallback
    validCallback = callback as (tx: PrismaClient) => Promise<any>
  }

  if (options.db) {
    const { db: customDb, ...restOptions } = options
    options = restOptions
    db = customDb
  } else {
    db = new PrismaClient()
  }

  const where: UniquenessWhere = {
    AND: [rest],
    NOT: [],
  }
  if ($scope) {
    where.AND.push($scope as Record<string, unknown>)
  }
  if ($self) {
    where.NOT.push($self as Record<string, unknown>)
  }

  return await db.$transaction(async (tx: PrismaClient) => {
    const found = await tx[model].findFirst({ where })

    if (found) {
      validationError('uniqueness', fieldsToString(fields), options)
    }

    return validCallback(tx)
  })
}
