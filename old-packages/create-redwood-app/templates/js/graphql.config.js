// This file is used by the VSCode GraphQL extension

const { getPaths } = require('@redwoodjs/project-config')

/** @type {import('graphql-config').IGraphQLConfig} */
const config = {
  schema: getPaths().generated.schema,
  documents: './web/src/**/!(*.d).{ts,tsx,js,jsx}',
}

module.exports = config
