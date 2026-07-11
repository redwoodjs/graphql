import { RedwoodError } from '@redwoodjs/api'

export class RedwoodRecordError extends RedwoodError {
  constructor() {
    super()
    this.name = 'RedwoodRecordError'
  }
}

export class RedwoodRecordUncaughtError extends RedwoodError {
  constructor(message) {
    super(message)
    this.name = 'RedwoodRecordUncaughtError'
  }
}

export class RedwoodRecordNotFoundError extends RedwoodError {
  constructor(name) {
    super(`${name} record not found`)
    this.name = 'RedwoodRecordNotFoundError'
  }
}

export class RedwoodRecordNullAttributeError extends RedwoodError {
  constructor(name) {
    super(`${name} must not be null`)
    this.name = 'RedwoodRecordNullAttributeError'
  }
}

export class RedwoodRecordMissingAttributeError extends RedwoodError {
  constructor(name) {
    super(`${name} is missing`)
    this.name = 'RedwoodRecordMissingAttributeError'
  }
}

export class RedwoodRecordMissingRequiredModelError extends RedwoodError {
  constructor(modelName, requiredModelName) {
    super(
      `Tried to build a relationship for ${requiredModelName} model but is not listed as a \`requiredModel\` in ${modelName}`,
    )
    this.name = 'RedwoodRecordMissingRequiredModelError'
  }
}
