import path from 'path'

import pluginTester from 'babel-plugin-tester'

import plugin from '../babel-plugin-redwood-mock-cell-data'

describe('babel plugin redwood mock cell data', () => {
  const __fixtures__ = path.resolve(__dirname, '../../../../../__fixtures__')
  process.env.RWJS_CWD = path.join(__fixtures__, 'example-todo-main')

  pluginTester({
    plugin,
    tests: {
      'cell with afterQuery': {
        fixture: path.join(
          __fixtures__,
          'example-todo-main/web/src/components/TodoListCell/TodoListCell.mock.js',
        ),
        outputFixture: path.join(
          __dirname,
          '__fixtures__/mock-cell-data/output_TodoListCell.mock.js',
        ),
      },
      'cell without afterQuery': {
        fixture: path.join(
          __fixtures__,
          'example-todo-main/web/src/components/NumTodosCell/NumTodosCell.mock.js',
        ),
        outputFixture: path.join(
          __dirname,
          '__fixtures__/mock-cell-data/output_NumTodosCell.mock.js',
        ),
      },
      'exporting a function declaration': {
        fixture: path.join(
          __fixtures__,
          'example-todo-main/web/src/components/NumTodosTwoCell/NumTodosTwoCell.mock.js',
        ),
        outputFixture: path.join(
          __dirname,
          '__fixtures__/mock-cell-data/output_NumTodosTwoCell.mock.js',
        ),
      },
    },
  })
})
