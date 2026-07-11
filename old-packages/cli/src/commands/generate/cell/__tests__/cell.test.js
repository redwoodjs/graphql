globalThis.__dirname = __dirname
import path from 'path'

import { vi, describe, it, expect, test, beforeAll } from 'vitest'

// Load mocks
import '../../../../lib/test'
import * as cell from '../cell'

vi.mock('@redwoodjs/structure', () => {
  return {
    getProject: () => ({
      cells: [{ queryOperationName: 'AlreadyDefinedQueryName' }],
    }),
  }
})

describe('Single word files', () => {
  let singleWordFiles

  beforeAll(async () => {
    singleWordFiles = await cell.files({
      name: 'User',
      tests: true,
      stories: true,
      list: false,
    })
  })

  it('returns exactly 4 files', () => {
    expect(Object.keys(singleWordFiles).length).toEqual(4)
  })

  it('creates a cell component with a single word name', () => {
    expect(
      singleWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserCell/UserCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell test with a single word name', () => {
    expect(
      singleWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserCell/UserCell.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell stories with a single word name', () => {
    expect(
      singleWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserCell/UserCell.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell mock with a single word name', () => {
    expect(
      singleWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserCell/UserCell.mock.js',
        )
      ],
    ).toMatchSnapshot()
  })
})

// Single Word Scenario: User

test('trims Cell from end of name', async () => {
  const files = await cell.files({
    name: 'BazingaCell',
    tests: true,
    stories: true,
  })

  const cellCode =
    files[
      path.normalize(
        '/path/to/project/web/src/components/BazingaCell/BazingaCell.jsx',
      )
    ]

  expect(cellCode).not.toBeUndefined()
  expect(
    cellCode.split('\n').includes('export const Success = ({ bazinga }) => {'),
  ).toBeTruthy()
})

describe('Multiword files', () => {
  let multiWordFiles

  beforeAll(async () => {
    multiWordFiles = await cell.files({
      name: 'UserProfile',
      tests: true,
      stories: true,
      list: false,
    })
  })

  // Multi Word Scenario: UserProfile
  it('creates a cell component with a multi word name', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell test with a multi word name', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell stories with a multi word name', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell mock with a multi word name', () => {
    expect(
      multiWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.mock.js',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('Snake case words', () => {
  let snakeCaseWordFiles

  beforeAll(async () => {
    snakeCaseWordFiles = await cell.files({
      name: 'user_profile',
      tests: true,
      stories: true,
      list: false,
    })
  })

  // SnakeCase Word Scenario: user_profile
  it('creates a cell component with a snakeCase word name', () => {
    expect(
      snakeCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell test with a snakeCase word name', () => {
    expect(
      snakeCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell stories with a snakeCase word name', () => {
    expect(
      snakeCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell mock with a snakeCase word name', () => {
    expect(
      snakeCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.mock.js',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('Kebab case words', () => {
  let kebabCaseWordFiles
  beforeAll(async () => {
    kebabCaseWordFiles = await cell.files({
      name: 'user-profile',
      tests: true,
      stories: true,
      list: false,
    })
  })

  // KebabCase Word Scenario: user-profile
  it('creates a cell component with a kebabCase word name', () => {
    expect(
      kebabCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell test with a kebabCase word name', () => {
    expect(
      kebabCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell stories with a kebabCase word name', () => {
    expect(
      kebabCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell mock with a kebabCase word name', () => {
    expect(
      kebabCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.mock.js',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('camelCase words', () => {
  let camelCaseWordFiles

  beforeAll(async () => {
    camelCaseWordFiles = await cell.files({
      name: 'userProfile',
      tests: true,
      stories: true,
      list: false,
    })
  })

  // camelCase Word Scenario: user-profile
  it('creates a cell component with a camelCase word name', () => {
    expect(
      camelCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell test with a camelCase word name', () => {
    expect(
      camelCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.test.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell stories with a camelCase word name', () => {
    expect(
      camelCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.stories.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  it('creates a cell mock with a camelCase word name', () => {
    expect(
      camelCaseWordFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfileCell/UserProfileCell.mock.js',
        )
      ],
    ).toMatchSnapshot()
  })
})

test("doesn't include test file when --tests is set to false", async () => {
  const withoutTestFiles = await cell.files({
    name: 'User',
    tests: false,
    stories: true,
    list: false,
  })

  expect(Object.keys(withoutTestFiles)).toEqual([
    path.normalize(
      '/path/to/project/web/src/components/UserCell/UserCell.mock.js',
    ),
    path.normalize(
      '/path/to/project/web/src/components/UserCell/UserCell.stories.jsx',
    ),
    path.normalize('/path/to/project/web/src/components/UserCell/UserCell.jsx'),
  ])
})

test("doesn't include storybook file when --stories is set to false", async () => {
  const withoutStoryFiles = await cell.files({
    name: 'User',
    tests: true,
    stories: false,
    list: false,
  })

  expect(Object.keys(withoutStoryFiles)).toEqual([
    path.normalize(
      '/path/to/project/web/src/components/UserCell/UserCell.mock.js',
    ),
    path.normalize(
      '/path/to/project/web/src/components/UserCell/UserCell.test.jsx',
    ),
    path.normalize('/path/to/project/web/src/components/UserCell/UserCell.jsx'),
  ])
})

test("doesn't include storybook and test files when --stories and --tests is set to false", async () => {
  const withoutTestAndStoryFiles = await cell.files({
    name: 'User',
    tests: false,
    stories: false,
    list: false,
  })

  expect(Object.keys(withoutTestAndStoryFiles)).toEqual([
    path.normalize('/path/to/project/web/src/components/UserCell/UserCell.jsx'),
  ])
})

test('generates list cells if list flag passed in', async () => {
  const listFlagPassedIn = await cell.files({
    name: 'Member',
    tests: true,
    stories: true,
    list: true,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.jsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.test.jsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.stories.jsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.mock.js',
  )

  // Check the file names
  expect(Object.keys(listFlagPassedIn)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(listFlagPassedIn[CELL_PATH]).toMatchSnapshot()
  expect(listFlagPassedIn[TEST_PATH]).toMatchSnapshot()
  expect(listFlagPassedIn[STORY_PATH]).toMatchSnapshot()
  expect(listFlagPassedIn[MOCK_PATH]).toMatchSnapshot()
})

test('generates list cells if name is plural', async () => {
  const listInferredFromName = await cell.files({
    name: 'Members',
    tests: true,
    stories: true,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.jsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.test.jsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.stories.jsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.mock.js',
  )

  // Check the file names
  expect(Object.keys(listInferredFromName)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(listInferredFromName[CELL_PATH]).toMatchSnapshot()
})

test('TypeScript: generates list cells if list flag passed in', async () => {
  const findDataByIdTypeScript = await cell.files({
    name: 'Bazinga',
    tests: true,
    stories: true,
    typescript: true,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/BazingaCell/BazingaCell.tsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/BazingaCell/BazingaCell.test.tsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/BazingaCell/BazingaCell.stories.tsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/BazingaCell/BazingaCell.mock.ts',
  )

  // Check the file names
  expect(Object.keys(findDataByIdTypeScript)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(findDataByIdTypeScript[CELL_PATH]).toMatchSnapshot()
  expect(findDataByIdTypeScript[TEST_PATH]).toMatchSnapshot()
  expect(findDataByIdTypeScript[STORY_PATH]).toMatchSnapshot()
  expect(findDataByIdTypeScript[MOCK_PATH]).toMatchSnapshot()
})

test('TypeScript: generates list cells if name is plural', async () => {
  const listInferredFromNameTypeScript = await cell.files({
    name: 'Members',
    tests: true,
    stories: true,
    typescript: true,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.tsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.test.tsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.stories.tsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/MembersCell/MembersCell.mock.ts',
  )

  // Check the file names
  expect(Object.keys(listInferredFromNameTypeScript)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(listInferredFromNameTypeScript[CELL_PATH]).toMatchSnapshot()
})

test('"equipment" with list flag', async () => {
  const modelPluralMatchesSingularWithList = await cell.files({
    name: 'equipment',
    tests: true,
    stories: true,
    list: true,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentListCell/EquipmentListCell.jsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentListCell/EquipmentListCell.test.jsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentListCell/EquipmentListCell.stories.jsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentListCell/EquipmentListCell.mock.js',
  )

  // Check the file names
  expect(Object.keys(modelPluralMatchesSingularWithList)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(modelPluralMatchesSingularWithList[CELL_PATH]).toMatchSnapshot()
})

test('"equipment" withOUT list flag should find equipment by id', async () => {
  const modelPluralMatchesSingularWithoutList = await cell.files({
    name: 'equipment',
    tests: true,
    stories: true,
    list: false,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentCell/EquipmentCell.jsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentCell/EquipmentCell.test.jsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentCell/EquipmentCell.stories.jsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/EquipmentCell/EquipmentCell.mock.js',
  )

  // Check the file names
  expect(Object.keys(modelPluralMatchesSingularWithoutList)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(modelPluralMatchesSingularWithoutList[CELL_PATH]).toMatchSnapshot()
})

test('generates a cell with a string primary id key', async () => {
  const modelWithStringId = await cell.files({
    name: 'address',
    tests: true,
    stories: true,
    list: false,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressCell/AddressCell.jsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressCell/AddressCell.test.jsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressCell/AddressCell.stories.jsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressCell/AddressCell.mock.js',
  )

  // Check the file names
  expect(Object.keys(modelWithStringId)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(modelWithStringId[CELL_PATH]).toMatchSnapshot()
  expect(modelWithStringId[TEST_PATH]).toMatchSnapshot()
  expect(modelWithStringId[STORY_PATH]).toMatchSnapshot()
  expect(modelWithStringId[MOCK_PATH]).toMatchSnapshot()
})

test('generates list a cell with a string primary id keys', async () => {
  const modelWithStringIdList = await cell.files({
    name: 'address',
    tests: true,
    stories: true,
    list: true,
  })

  const CELL_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressesCell/AddressesCell.jsx',
  )

  const TEST_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressesCell/AddressesCell.test.jsx',
  )

  const STORY_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressesCell/AddressesCell.stories.jsx',
  )

  const MOCK_PATH = path.normalize(
    '/path/to/project/web/src/components/AddressesCell/AddressesCell.mock.js',
  )

  // Check the file names
  expect(Object.keys(modelWithStringIdList)).toEqual([
    MOCK_PATH,
    TEST_PATH,
    STORY_PATH,
    CELL_PATH,
  ])

  // Check the contents
  expect(modelWithStringIdList[CELL_PATH]).toMatchSnapshot()
  expect(modelWithStringIdList[TEST_PATH]).toMatchSnapshot()
  expect(modelWithStringIdList[STORY_PATH]).toMatchSnapshot()
  expect(modelWithStringIdList[MOCK_PATH]).toMatchSnapshot()
})

describe('Custom query names', () => {
  test('Accepts custom query names', async () => {
    const generatedFiles = await cell.files({
      name: 'Clues',
      tests: false,
      stories: false,
      query: 'FindBluesClues',
    })

    const CELL_PATH = path.normalize(
      '/path/to/project/web/src/components/CluesCell/CluesCell.jsx',
    )

    expect(generatedFiles[CELL_PATH]).toContain('query FindBluesClues {')
  })

  test('Throws if a duplicated query name is used', async () => {
    await expect(
      cell.files({
        name: 'Clues',
        tests: false,
        stories: false,
        query: 'AlreadyDefinedQueryName',
      }),
    ).rejects.toThrow(
      'Specified query name: "AlreadyDefinedQueryName" is not unique',
    )
  })
})

describe('Custom Id Field files', () => {
  let customIdFieldFiles
  let customIdFieldListFiles

  describe('Single cell', () => {
    beforeAll(async () => {
      customIdFieldFiles = await cell.files({
        name: 'CustomIdField',
        tests: true,
        stories: true,
        list: false,
      })
    })

    it('returns exactly 4 files', () => {
      expect(Object.keys(customIdFieldFiles).length).toEqual(4)
    })

    it('creates a cell component with a custom id field', () => {
      expect(
        customIdFieldFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldCell/CustomIdFieldCell.jsx',
          )
        ],
      ).toMatchSnapshot()
    })

    it('creates a cell test with a custom id field', () => {
      expect(
        customIdFieldFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldCell/CustomIdFieldCell.test.jsx',
          )
        ],
      ).toMatchSnapshot()
    })

    it('creates a cell stories with a custom id field', () => {
      expect(
        customIdFieldFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldCell/CustomIdFieldCell.stories.jsx',
          )
        ],
      ).toMatchSnapshot()
    })

    it('creates a cell mock with a custom id field', () => {
      expect(
        customIdFieldFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldCell/CustomIdFieldCell.mock.js',
          )
        ],
      ).toMatchSnapshot()
    })
  })

  describe('List cell', () => {
    beforeAll(async () => {
      customIdFieldListFiles = await cell.files({
        name: 'CustomIdField',
        tests: true,
        stories: true,
        list: true,
      })
    })

    it('returns exactly 4 files', () => {
      expect(Object.keys(customIdFieldFiles).length).toEqual(4)
    })

    it('creates a cell list component with a custom id field', () => {
      expect(
        customIdFieldListFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldsCell/CustomIdFieldsCell.jsx',
          )
        ],
      ).toMatchSnapshot()
    })

    it('creates a cell list test with a custom id field', () => {
      expect(
        customIdFieldListFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldsCell/CustomIdFieldsCell.test.jsx',
          )
        ],
      ).toMatchSnapshot()
    })

    it('creates a cell list stories with a custom id field', () => {
      expect(
        customIdFieldListFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldsCell/CustomIdFieldsCell.stories.jsx',
          )
        ],
      ).toMatchSnapshot()
    })

    it('creates a cell list mock with a custom id field', () => {
      expect(
        customIdFieldListFiles[
          path.normalize(
            '/path/to/project/web/src/components/CustomIdFieldsCell/CustomIdFieldsCell.mock.js',
          )
        ],
      ).toMatchSnapshot()
    })
  })
})
