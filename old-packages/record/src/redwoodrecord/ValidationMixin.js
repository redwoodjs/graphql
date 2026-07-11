import { validate as validateField } from '@redwoodjs/api'

export default (Base) =>
  class extends Base {
    // Stores error messages internally
    _errors = { base: [] }

    // Removes all error messages.
    _clearErrors() {
      for (const [attribute, _array] of Object.entries(this._errors)) {
        this._errors[attribute] = []
      }
    }

    // Denotes validations that need to run for the given fields. Must be in the
    // form of { field: options } where `field` is the name of the field and
    // `options` are the validation options. See Service Validations docs for
    // usage examples: https://redwoodjs.com/docs/services.html#service-validations
    //
    //   static validates = {
    //     emailAddress: { email: true },
    //     name: { presence: true, length: { min: 2, max: 255 } }
    //   }
    static validates = {}

    // Whether or not this instance is valid and has no errors. Essentially the
    // opposite of `hasError`, but runs validations first. This means it will
    // reset any custom errors added with `addError()`
    get isValid() {
      this.validate()
      return !this.hasError
    }

    get errors() {
      return this._errors
    }

    // Whether or not this instance contains any errors according to validation
    // rules. Does not run valiations, (and so preserves custom errors) returns
    // the state of error objects. Essentially the opposite of `isValid`.
    get hasError() {
      return !Object.entries(this._errors).every(
        ([_name, errors]) => !errors.length,
      )
    }

    // Adds an error to the _errors object. Can be called manually via instance,
    // however any errors added this way will be wiped out if calling `validate()`
    addError(attribute, message) {
      if (!this._errors[attribute]) {
        this._errors[attribute] = []
      }
      this._errors[attribute].push(message)
    }

    // Checks each field against validate directives. Creates errors if so and
    // returns `false`, otherwise returns `true`.
    validate(options = {}) {
      this._clearErrors()

      // If there are no validations, then we're valid! The database could still
      // throw an error though, but that's handled elsewhere.
      if (this.constructor.validates.length === 0) {
        return true
      }

      const results = []

      for (const [name, recipe] of Object.entries(this.constructor.validates)) {
        // TODO: Throw error if attribute is not present at all? Does that mess up undefined validation?
        try {
          validateField(this[name], name, recipe)
          results.push(true)
        } catch (e) {
          this.addError(name, e.message)
          if (options.throw) {
            throw e
          } else {
            results.push(false)
          }
        }
      }

      return results.every((result) => result)
    }
  }
