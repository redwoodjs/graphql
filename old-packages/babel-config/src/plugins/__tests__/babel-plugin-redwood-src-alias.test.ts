import path from 'path'

import pluginTester from 'babel-plugin-tester'

import plugin from '../babel-plugin-redwood-src-alias'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../__fixtures__/empty-project',
)

describe('babel plugin redwood import dir - graphql function', () => {
  pluginTester({
    plugin,
    pluginOptions: {
      srcAbsPath: path.join(FIXTURE_PATH, 'api/src'),
    },
    pluginName: 'babel-plugin-redwood-src-alias',
    // We need to set the filename so that state.file.opts.filename is set
    // See https://github.com/babel-utils/babel-plugin-tester/issues/87
    filename: path.join(FIXTURE_PATH, 'api/src/functions/graphql.ts'),
    tests: {
      'transforms auth imports': {
        code: "import { getCurrentUser } from 'src/lib/auth'",
        output: "import { getCurrentUser } from '../lib/auth'",
      },
      'imports prisma instance correctly': {
        code: "import { db } from 'src/lib/db'",
        output: "import { db } from '../lib/db'",
      },
      'kitten utils are correctly found': {
        code: "import cuddles from 'src/lib/kittens/utils'",
        output: "import cuddles from '../lib/kittens/utils'",
      },
    },
  })
})

describe('Handles import statements from a service too', () => {
  pluginTester({
    plugin,
    pluginOptions: {
      srcAbsPath: path.join(FIXTURE_PATH, 'api/src'),
    },
    pluginName: 'babel-plugin-redwood-src-alias',
    // As if the import statement is in another service
    filename: path.join(FIXTURE_PATH, 'api/src/services/bazinga/bazinga.ts'),
    tests: {
      'transforms auth imports from service': {
        code: "import { requireAuth } from 'src/lib/auth'",
        output: "import { requireAuth } from '../../lib/auth'",
      },
      'imports from another service': {
        code: "import posts from 'src/services/posts'",
        output: "import posts from '../posts'",
      },
    },
  })
})

describe('Handles typical web imports', () => {
  pluginTester({
    plugin,
    pluginOptions: {
      srcAbsPath: path.join(FIXTURE_PATH, 'web/src'),
    },
    pluginName: 'babel-plugin-redwood-src-alias',
    // As if the import statement is in another service
    filename: path.join(FIXTURE_PATH, 'web/src/components/Posts/Post.tsx'),
    tests: {
      'handles imports from another component': {
        code: "import { QUERY } from 'src/components/Posts/PostsCell'",
        output: "import { QUERY } from './PostsCell'",
      },
      'handles imports from utils': {
        code: "import { cuddles } from 'src/helpers/kittens'",
        output: "import { cuddles } from '../../helpers/kittens'",
      },
    },
  })
})
