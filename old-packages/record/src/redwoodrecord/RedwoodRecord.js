import Core from './Core'
import Reflection from './Reflection'
import RelationProxy from './RelationProxy'
import ValidationMixin from './ValidationMixin'

export default class RedwoodRecord extends ValidationMixin(Core) {
  static get reflect() {
    return new Reflection(this)
  }

  // Call original build, but add related attributes
  static build(attributes) {
    const record = super.build(attributes)
    RelationProxy.addRelations(record, this.constructor.schema)
    return record
  }

  // Don't even try to save if data isn't valid
  async save(options = {}) {
    if (this.validate({ throw: options.throw })) {
      return await super.save(options)
    } else {
      return false
    }
  }

  // Call original method, but add error keys for validation
  _createPropertyForAttribute(name) {
    super._createPropertyForAttribute(name)
    this._errors[name] = []
  }

  // Add validation error on save error
  _onSaveError(...args) {
    super._onSaveError(...args)
    this.addError(...args)
  }
}
