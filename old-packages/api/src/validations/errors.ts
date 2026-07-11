import humanize from 'humanize-string'
import { titleCase } from 'title-case'

import { RedwoodError } from '../errors'

export class ServiceValidationError extends RedwoodError {
  constructor(message: string, substitutions = {}) {
    let errorMessage = message
    let extensions = {}

    // in the main error message, replace instances of a string like
    // `{max}` with any substituted values that are titlecased and humanized
    for (const [key, value] of Object.entries(substitutions)) {
      errorMessage = errorMessage.replaceAll(
        `\${${key}}`,
        titleCase(humanize(String(value))),
      )

      // this mimics the Apollo Server use of error codes and extensions needed
      // for the web side FormError handlings to show the message at the field level
      // with an UserInputError (aka 'BAD_USER_INPUT" code) style error
      // @see: https://www.apollographql.com/docs/apollo-server/data/errors/#including-custom-error-details
      extensions = {
        code: 'BAD_USER_INPUT',
        properties: {
          messages: {
            [String(value)]: [errorMessage],
          },
        },
      }
    }

    super(errorMessage, extensions)
    this.name = 'ServiceValidationError'

    Object.setPrototypeOf(this, ServiceValidationError.prototype)
  }
}

export class AbsenceValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} is not absent',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'AbsenceValidationError'

    Object.setPrototypeOf(this, AbsenceValidationError.prototype)
  }
}

export class AcceptanceValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be accepted',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'AcceptanceValidationError'

    Object.setPrototypeOf(this, AcceptanceValidationError.prototype)
  }
}

export class EmailValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be formatted like an email address',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'EmailValidationError'

    Object.setPrototypeOf(this, EmailValidationError.prototype)
  }
}
export class ExclusionValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} is reserved',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'ExclusionValidationError'

    Object.setPrototypeOf(this, ExclusionValidationError.prototype)
  }
}

export class FormatValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} is not formatted correctly',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'FormatValidationError'

    Object.setPrototypeOf(this, FormatValidationError.prototype)
  }
}

export class InclusionValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} is reserved',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'InclusionValidationError'

    Object.setPrototypeOf(this, InclusionValidationError.prototype)
  }
}

export class MinLengthValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must have at least ${min} characters',
    substitutions: { min?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'MinLengthValidationError'

    Object.setPrototypeOf(this, MinLengthValidationError.prototype)
  }
}

export class MaxLengthValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must have no more than ${max} characters',
    substitutions: { max?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'MaxLengthValidationError'

    Object.setPrototypeOf(this, MaxLengthValidationError.prototype)
  }
}

export class EqualLengthValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must have exactly ${equal} characters',
    substitutions: { equal?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'EqualLengthValidationError'

    Object.setPrototypeOf(this, EqualLengthValidationError.prototype)
  }
}

export class BetweenLengthValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be between ${min} and ${max} characters',
    substitutions: { min?: number; max?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'BetweenLengthValidationError'

    Object.setPrototypeOf(this, BetweenLengthValidationError.prototype)
  }
}

export class PresenceValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be present',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'PresenceValidationError'

    Object.setPrototypeOf(this, PresenceValidationError.prototype)
  }
}

export class TypeNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must by a number',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'TypeNumericalityValidationError'

    Object.setPrototypeOf(this, TypeNumericalityValidationError.prototype)
  }
}

export class IntegerNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be an integer',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'IntegerNumericalityValidationError'

    Object.setPrototypeOf(this, IntegerNumericalityValidationError.prototype)
  }
}

export class LessThanNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be less than ${lessThan}',
    substitutions: { lessThan?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'LessThanNumericalityValidationError'

    Object.setPrototypeOf(this, LessThanNumericalityValidationError.prototype)
  }
}

export class LessThanOrEqualNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be less than or equal to ${lessThanOrEqual}',
    substitutions: { lessThanOrEqual?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'LessThanOrEqualNumericalityValidationError'
    Object.setPrototypeOf(
      this,
      LessThanOrEqualNumericalityValidationError.prototype,
    )
  }
}

export class GreaterThanNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be greater than ${greaterThan}',
    substitutions: { greaterThan?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'GreaterThanNumericalityValidationError'
    Object.setPrototypeOf(
      this,
      GreaterThanNumericalityValidationError.prototype,
    )
  }
}

export class GreaterThanOrEqualNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be greater than or equal to ${greaterThanOrEqual}',
    substitutions: { greaterThanOrEqual?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'GreaterThanOrEqualNumericalityValidationError'
    Object.setPrototypeOf(
      this,
      GreaterThanOrEqualNumericalityValidationError.prototype,
    )
  }
}

export class EqualNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must equal ${equal}',
    substitutions: { equal?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'EqualNumericalityValidationError'

    Object.setPrototypeOf(this, EqualNumericalityValidationError.prototype)
  }
}

export class OtherThanNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must not equal ${otherThan}',
    substitutions: { otherThan?: number } = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'OtherThanNumericalityValidationError'

    Object.setPrototypeOf(this, OtherThanNumericalityValidationError.prototype)
  }
}

export class EvenNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be even',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'EvenNumericalityValidationError'

    Object.setPrototypeOf(this, EvenNumericalityValidationError.prototype)
  }
}

export class OddNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be odd',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'OddNumericalityValidationError'

    Object.setPrototypeOf(this, OddNumericalityValidationError.prototype)
  }
}

export class PositiveNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be positive',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'PositiveNumericalityValidationError'

    Object.setPrototypeOf(this, PositiveNumericalityValidationError.prototype)
  }
}

export class NegativeNumericalityValidationError extends ServiceValidationError {
  constructor(
    name: string,
    message = '${name} must be negative',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'NegativeNumericalityValidationError'

    Object.setPrototypeOf(this, NegativeNumericalityValidationError.prototype)
  }
}

export class CustomValidationError extends ServiceValidationError {
  constructor(
    name: string,
    // Since CustomValidationError is derived from either a raised error or a string, the message is always passed.
    // but for the sake of consistency, we'll keep the message optional.
    message = '',
    substitutions = {},
  ) {
    super(message, Object.assign(substitutions, { name }))
    this.name = 'CustomValidationError'

    Object.setPrototypeOf(this, CustomValidationError.prototype)
  }
}

export class UniquenessValidationError extends ServiceValidationError {
  constructor(name: string, message: string | undefined, substitutions = {}) {
    const errorMessage = message ? message : `${name} must be unique`

    super(errorMessage, Object.assign(substitutions, { name }))
    this.name = 'UniquenessValidationError'

    Object.setPrototypeOf(this, UniquenessValidationError.prototype)
  }
}
