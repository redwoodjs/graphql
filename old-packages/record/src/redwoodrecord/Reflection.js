// Introspects a given model and returns its attributes and figures out what
// other models it belongs to or has many of.

export default class Reflection {
  #hasMany = null
  #belongsTo = null
  #attributes = null

  constructor(model) {
    this.model = model
  }

  get attributes() {
    if (!this.#attributes) {
      this.#parseAttributes()
    }

    return this.#attributes
  }

  get belongsTo() {
    if (!this.#belongsTo) {
      this.#parseBelongsTo()
    }

    return this.#belongsTo
  }

  get hasMany() {
    if (!this.#hasMany) {
      this.#parseHasMany()
    }

    return this.#hasMany
  }

  // Finds the schema for a single model
  #schemaForModel(name = this.model.name) {
    return this.model.schema.models.find((model) => model.name === name)
  }

  #parseHasMany() {
    const selfSchema = this.#schemaForModel()
    this.#hasMany = {}

    selfSchema?.fields?.forEach((field) => {
      if (field.isList) {
        // get other side of relationship to determine foreign key name
        const otherSchema = this.#schemaForModel(field.type)
        const belongsTo = otherSchema.fields.find(
          (field) => field.type === this.model.name,
        )

        this.#hasMany[field.name] = {
          modelName: field.type,
          referenceName: belongsTo.name,
          // a null foreign key denotes an implicit many-to-many relationship
          foreignKey: belongsTo.relationFromFields[0] || null,
          primaryKey: belongsTo.relationToFields[0],
        }
      }
    })
  }

  #parseBelongsTo() {
    const selfSchema = this.#schemaForModel()
    this.#belongsTo = {}

    selfSchema?.fields?.forEach((field) => {
      if (field.relationFromFields?.length) {
        this.#belongsTo[field.name] = {
          modelName: field.type,
          foreignKey: field.relationFromFields[0],
          primaryKey: field.relationToFields[0],
        }
      }
    })
  }

  #parseAttributes() {
    const selfSchema = this.#schemaForModel()
    this.#attributes = {}

    if (!this.#hasMany) {
      this.#parseHasMany()
    }
    if (!this.belongsTo) {
      this.#parseBelongsTo()
    }

    selfSchema?.fields?.forEach((field) => {
      const { name, ...props } = field
      if (
        !Object.keys(this.#hasMany).includes(name) &&
        !Object.keys(this.#belongsTo).includes(name)
      ) {
        this.#attributes[name] = props
      }
    })
  }
}
