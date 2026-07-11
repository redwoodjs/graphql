import camelCase from 'camelcase'

import * as Errors from '../errors'

export default class Core {
  ////////////////////////////
  // Public class properties
  ////////////////////////////

  // Set in child class to override DB accessor name. This is the name of the
  // property you would call on an instance of Prisma Client in order the query
  // a model in your schema. i.e. For the call `db.user` the accessorName is
  // "user". Not setting this property will use the default camelCase version of
  // the class name itself as the accessor.
  //
  //   static accessorName = 'users'
  static accessorName

  // Set in child class to override primary key field name for this model.
  //
  //   static primaryKey = 'userId'
  static primaryKey = 'id'

  // Parsed schema.prisma for use in subclasses
  static schema = null

  // Any other model that may be required by this model
  static requiredModels = []

  /////////////////////////
  // Public class methods
  /////////////////////////

  // Access the raw Prisma Client for doing low level query manipulation
  static db = null

  // Returns the Prisma DB accessor instance (ex. db.user)
  static get accessor() {
    return this.db[this.accessorName || camelCase(this.name)]
  }

  // Alias for where({})
  static all(args) {
    return this.where({}, args)
  }

  static build(attributes) {
    const record = new this()
    // TODO: creating a record through the RelationProxy will put that relationship into `attributes` here. Ideally that would only be used for the create and then discarded.
    record.attributes = attributes
    return record
  }

  // Create a new record. Instantiates a new instance and then calls .save() on it
  static async create(attributes, options = {}) {
    const record = this.build(attributes)

    return await record.save(options)
  }

  // Find a single record by ID.
  static async find(id, options = {}) {
    const record = await this.findBy(
      {
        [this.primaryKey]: id,
        ...(options.where || {}),
      },
      options,
    )
    if (record === null) {
      throw new Errors.RedwoodRecordNotFoundError(this.name)
    }

    return record
  }

  // Returns the first record matching the given `where`, otherwise first in the
  // whole table (whatever the DB determines is the first record)
  static async findBy(attributes, options = {}) {
    const record = await this.accessor.findFirst({
      where: attributes,
      ...options,
    })

    return record ? await this.build(record) : null
  }

  // Alias for findBy
  static async first(...args) {
    return this.findBy(...args)
  }

  // Find all records
  static async where(attributes, options = {}) {
    const records = await this.accessor.findMany({
      where: attributes,
      ...options,
    })

    return Promise.all(
      records.map(async (record) => {
        return await this.build(record)
      }),
    )
  }

  ///////////////////////////////
  // Private instance properties
  ///////////////////////////////

  // Stores instance attributes object internally
  #attributes = {}

  ////////////////////////////
  // Public instance methods
  ////////////////////////////

  constructor() {}

  get attributes() {
    return this.#attributes
  }

  set attributes(attrs) {
    if (attrs) {
      this.#attributes = attrs
      this._createPropertiesForAttributes()
    }
  }

  async destroy(options = {}) {
    const { throw: shouldThrow, ...rest } = options

    try {
      await this.constructor.accessor.delete({
        where: { [this.constructor.primaryKey]: this.attributes.id },
        ...rest,
      })
      return this
    } catch (e) {
      this._deleteErrorHandler(e, shouldThrow)
      return false
    }
  }

  // Saves the attributes to the database
  async save(options = {}) {
    const saveAttributes = JSON.parse(JSON.stringify(this.attributes))

    try {
      let newAttributes

      if (this.attributes[this.constructor.primaryKey]) {
        // update existing record
        delete saveAttributes[this.constructor.primaryKey]

        newAttributes = await this.constructor.accessor.update({
          where: {
            [this.constructor.primaryKey]:
              this.attributes[this.constructor.primaryKey],
          },
          data: saveAttributes,
        })
      } else {
        // create new record
        newAttributes = await this.constructor.accessor.create({
          data: saveAttributes,
        })
      }

      // update attributes in case someone else changed since we last read them
      this.attributes = newAttributes
    } catch (e) {
      this._saveErrorHandler(e, options.throw)
      return false
    }

    return this
  }

  async update(attributes = {}, options = {}) {
    this.#attributes = Object.assign(this.#attributes, attributes)
    return await this.save(options)
  }

  ////////////////////////////
  // Private instance methods
  ////////////////////////////

  // Turns a plain object's properties into getters/setters on the instance:
  //
  // const user = new User({ name: 'Rob' })
  // user.name  // => 'Rob'
  _createPropertiesForAttributes() {
    for (const [name, value] of Object.entries(this.attributes)) {
      // Has attribute already been created on this instance?
      // eslint-disable-next-line
      if (this.hasOwnProperty(name)) {
        continue
      }
      // Is this a relationship attribute?
      if (
        value &&
        typeof value === 'object' &&
        (Object.keys(value).includes('create') ||
          Object.keys(value).includes('connect'))
      ) {
        continue
      }

      this._createPropertyForAttribute(name)
    }
  }

  // Create property for a single attribute
  _createPropertyForAttribute(name) {
    Object.defineProperty(this, name, {
      get() {
        return this._attributeGetter(name)
      },
      set(value) {
        this._attributeSetter(name, value)
      },
      enumerable: true,
    })
  }

  _attributeGetter(name) {
    return this.#attributes[name]
  }

  _attributeSetter(name, value) {
    return (this.#attributes[name] = value)
  }

  _onSaveError(_name, _message) {
    // to be implemented in RedwoodRecord which knows how to handle errors
  }

  _deleteErrorHandler(error, shouldThrow) {
    if (error.message.match(/Record to delete does not exist/)) {
      this._onSaveError(
        'base',
        `${this.constructor.name} record to destroy not found`,
      )
      if (shouldThrow) {
        throw new Errors.RedwoodRecordNotFoundError()
      }
    } else {
      this._onSaveError(
        'base',
        `${this.constructor.name} record threw uncaught error: ${error.message}`,
      )
      if (shouldThrow) {
        throw new Errors.RedwoodRecordUncaughtError(error.message)
      }
    }
  }

  // Handles errors from saving a record (either update or create), converting
  // to this.#errors messages, or throwing RedwoodRecord errors
  _saveErrorHandler(error, shouldThrow) {
    if (error.message.match(/Record to update not found/)) {
      this._onSaveError(
        'base',
        `${this.constructor.name} record to update not found`,
      )
      if (shouldThrow) {
        throw new Errors.RedwoodRecordNotFoundError(this.constructor.name)
      }
    } else if (error.message.match(/must not be null/)) {
      const [_all, name] = error.message.match(/Argument (\w+)/)
      this._onSaveError(name, 'must not be null')
      if (shouldThrow) {
        throw new Errors.RedwoodRecordNullAttributeError(name)
      }
    } else if (error.message.match(/is missing/)) {
      const [_all, name] = error.message.match(/Argument (\w+)/)
      this._onSaveError('base', `${name} is missing`)
      if (shouldThrow) {
        throw new Errors.RedwoodRecordMissingAttributeError(name)
      }
    } else {
      this._onSaveError('base', error.message)
      if (shouldThrow) {
        throw new Errors.RedwoodRecordUncaughtError(error.message)
      }
    }
  }
}
