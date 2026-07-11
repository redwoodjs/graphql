const { getPaths } = require('@redwoodjs/internal')

module.exports = {
  schema: getPaths().generated.schema,
}
