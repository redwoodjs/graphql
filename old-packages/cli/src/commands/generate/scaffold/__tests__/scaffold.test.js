globalThis.__dirname = __dirname
import path from 'path'

import { vol, fs as memfs } from 'memfs'
import { ufs } from 'unionfs'
import { vi, describe, test, expect, afterAll, beforeAll } from 'vitest'

// Load mocks
import '../../../../lib/test'

import { getDefaultArgs } from '../../../../lib'
import { yargsDefaults as defaults } from '../../helpers'
import * as scaffold from '../scaffold'

vi.mock('fs-extra', async (importOriginal) => {
  ufs.use(await importOriginal()).use(memfs)
  return { ...ufs, default: { ...ufs } }
})

vi.mock('fs', async (importOriginal) => {
  ufs.use(await importOriginal()).use(memfs)
  return { ...ufs, default: { ...ufs } }
})

vi.mock('node:fs', async (importOriginal) => {
  ufs.use(await importOriginal()).use(memfs)
  return { ...ufs, default: { ...ufs } }
})

vi.mock('execa')

beforeAll(() => {
  vol.fromJSON({ 'redwood.toml': '' }, '/')
})

describe('in javascript (default) mode', () => {
  let files

  beforeAll(async () => {
    files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Post',
      tests: true,
      nestScaffoldByModel: true,
    })
  })

  test('returns exactly 19 files', async () => {
    expect(Object.keys(files).length).toEqual(19)
  })
  // SDL

  test('creates an sdl', () => {
    expect(files).toHaveProperty([
      path.normalize('/path/to/project/api/src/graphql/posts.sdl.js'),
    ])
  })

  // Service

  test('creates a service', () => {
    expect(files).toHaveProperty([
      path.normalize('/path/to/project/api/src/services/posts/posts.js'),
    ])
  })

  test('creates a service test', () => {
    expect(files).toHaveProperty([
      path.normalize('/path/to/project/api/src/services/posts/posts.test.js'),
    ])
  })

  // styles

  test('creates a stylesheet', () => {
    expect(
      files[path.normalize('/path/to/project/web/src/scaffold.css')],
    ).toMatchSnapshot()
  })

  // Layout

  test('creates a layout', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  // Pages

  test('creates a edit page', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/EditPostPage/EditPostPage.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the edit page correctly imports the edit cell', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/EditPostPage/EditPostPage.jsx',
        )
      ],
    ).toMatch(`import EditPostCell from 'src/components/Post/EditPostCell'`)
  })

  test('creates a index page', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostsPage/PostsPage.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the index page correctly imports the index cell', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostsPage/PostsPage.jsx',
        )
      ],
    ).toMatch(`import PostsCell from 'src/components/Post/PostsCell'`)
  })

  test('creates a new page', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/NewPostPage/NewPostPage.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the new page correctly imports the new component', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/NewPostPage/NewPostPage.jsx',
        )
      ],
    ).toMatch(`import NewPost from 'src/components/Post/NewPost'`)
  })

  test('creates a show page', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostPage/PostPage.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the show page correctly imports the show cell', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostPage/PostPage.jsx',
        )
      ],
    ).toMatch(`import PostCell from 'src/components/Post/PostCell'`)
  })

  // Cells

  test('creates an edit cell', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostEditCell/PostEditCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the edit cell correctly imports the form', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/EditPostCell/EditPostCell.jsx',
        )
      ],
    ).toMatch(`import PostForm from 'src/components/Post/PostForm'`)
  })

  test('creates an index cell', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostsCell/PostsCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the index cell correctly imports the index component', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostsCell/PostsCell.jsx',
        )
      ],
    ).toMatch(`import Posts from 'src/components/Post/Posts'`)
  })

  test('creates a show cell', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostCell/PostCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the show cell correctly imports the show component', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostCell/PostCell.jsx',
        )
      ],
    ).toMatch(`import Post from 'src/components/Post/Post'`)
  })

  // Components

  test('creates a form component', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostForm/PostForm.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates an index component', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/Posts/Posts.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the index component correctly imports the QUERY', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/Posts/Posts.jsx',
        )
      ],
    ).toMatch(`import { QUERY } from 'src/components/Post/PostsCell'`)
  })

  test('creates a new component', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/NewPost/NewPost.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('the new component correctly imports the form', async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/NewPost/NewPost.jsx',
        )
      ],
    ).toMatch(`import PostForm from 'src/components/Post/PostForm'`)
  })

  test('creates a show component', async () => {
    expect(
      files[
        path.normalize('/path/to/project/web/src/components/Post/Post/Post.jsx')
      ],
    ).toMatchSnapshot()
  })

  test('error when no editable fields are in model', async () => {
    await expect(
      scaffold.files({
        ...getDefaultArgs(defaults),
        model: 'NoEditableField',
        tests: true,
        nestScaffoldByModel: true,
      }),
    ).rejects.toThrow(
      'There are no editable fields in the NoEditableField model',
    )
  })

  // Routes

  test('creates a single-word name routes', async () => {
    expect(
      await scaffold.routes({ model: 'Post', nestScaffoldByModel: true }),
    ).toEqual([
      '<Route path="/posts/new" page={PostNewPostPage} name="newPost" />',
      '<Route path="/posts/{id:Int}/edit" page={PostEditPostPage} name="editPost" />',
      '<Route path="/posts/{id:Int}" page={PostPostPage} name="post" />',
      '<Route path="/posts" page={PostPostsPage} name="posts" />',
    ])
  })

  test('creates a multi-word name routes', async () => {
    expect(
      await scaffold.routes({
        model: 'UserProfile',
        nestScaffoldByModel: true,
      }),
    ).toEqual([
      '<Route path="/user-profiles/new" page={UserProfileNewUserProfilePage} name="newUserProfile" />',
      '<Route path="/user-profiles/{id:Int}/edit" page={UserProfileEditUserProfilePage} name="editUserProfile" />',
      '<Route path="/user-profiles/{id:Int}" page={UserProfileUserProfilePage} name="userProfile" />',
      '<Route path="/user-profiles" page={UserProfileUserProfilesPage} name="userProfiles" />',
    ])
  })

  // GraphQL queries

  test('the GraphQL in the index query does not contain object types', async () => {
    const userProfileFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })
    const cell =
      userProfileFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/UserProfilesCell/UserProfilesCell.jsx',
        )
      ]
    const query = cell.match(/(userProfiles.*?\})/s)[1]

    expect(query).not.toMatch(/^\s+user$/m)
  })

  test('the GraphQL in the show query does not contain object types', async () => {
    const userProfileFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })
    const cell =
      userProfileFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/UserProfileCell/UserProfileCell.jsx',
        )
      ]
    const query = cell.match(/(userProfile.*?\})/s)[1]

    expect(query).not.toMatch(/^\s+user$/m)
  })

  test('the GraphQL in the edit query does not contain object types', async () => {
    const userProfileFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })
    const cell =
      userProfileFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/EditUserProfileCell/EditUserProfileCell.jsx',
        )
      ]
    const query = cell.match(/(userProfile.*?\})/s)[1]

    expect(query).not.toMatch(/^\s+user$/m)
  })

  // Foreign key casting

  test('creates a new component with int foreign keys converted in onSave', async () => {
    const foreignKeyFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })

    expect(
      foreignKeyFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/NewUserProfile/NewUserProfile.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates an edit component with int foreign keys converted in onSave', async () => {
    const foreignKeyFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })

    expect(
      foreignKeyFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/EditUserProfileCell/EditUserProfileCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  // Formatters

  test('creates a formatters function file', () => {
    expect(
      files[path.normalize('/path/to/project/web/src/lib/formatters.jsx')],
    ).toMatchSnapshot()
  })

  test('creates a formatters function test file', () => {
    expect(
      files[path.normalize('/path/to/project/web/src/lib/formatters.test.jsx')],
    ).toMatchSnapshot()
  })

  // Enums in forms

  test('generated form matches expectations', async () => {
    const files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Pixel',
      nestScaffoldByModel: true,
    })
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Pixel/PixelForm/PixelForm.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('in typescript mode', () => {
  let tsFiles

  beforeAll(async () => {
    tsFiles = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Post',
      typescript: true,
      tests: true,
      nestScaffoldByModel: true,
    })
  })

  test('returns exactly 19 files', () => {
    expect(Object.keys(tsFiles).length).toEqual(19)
  })

  // SDL

  test('creates an sdl', () => {
    expect(tsFiles).toHaveProperty([
      path.normalize('/path/to/project/api/src/graphql/posts.sdl.ts'),
    ])
  })

  // Service

  test('creates a service', () => {
    expect(tsFiles).toHaveProperty([
      path.normalize('/path/to/project/api/src/services/posts/posts.ts'),
    ])
  })

  test('creates a service test', () => {
    expect(tsFiles).toHaveProperty([
      path.normalize('/path/to/project/api/src/services/posts/posts.test.ts'),
    ])
  })

  // styles

  test('creates a stylesheet', () => {
    expect(
      tsFiles[path.normalize('/path/to/project/web/src/scaffold.css')],
    ).toMatchSnapshot()
  })

  // Layout

  test('creates a layout', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  // Pages

  test('creates a edit page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/EditPostPage/EditPostPage.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a index page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostsPage/PostsPage.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a new page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/NewPostPage/NewPostPage.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a show page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostPage/PostPage.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  // Cells

  test('creates an edit cell', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/components/Post/EditPostCell/EditPostCell.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates an index cell', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostsCell/PostsCell.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a show cell', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostCell/PostCell.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  // Components

  test('creates a form component', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostForm/PostForm.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates an index component', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/components/Post/Posts/Posts.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a new component', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/components/Post/NewPost/NewPost.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates a show component', async () => {
    expect(
      tsFiles[
        path.normalize('/path/to/project/web/src/components/Post/Post/Post.tsx')
      ],
    ).toMatchSnapshot()
  })

  // Routes

  test('creates a single-word name routes', async () => {
    expect(
      await scaffold.routes({ model: 'Post', nestScaffoldByModel: true }),
    ).toEqual([
      '<Route path="/posts/new" page={PostNewPostPage} name="newPost" />',
      '<Route path="/posts/{id:Int}/edit" page={PostEditPostPage} name="editPost" />',
      '<Route path="/posts/{id:Int}" page={PostPostPage} name="post" />',
      '<Route path="/posts" page={PostPostsPage} name="posts" />',
    ])
  })

  test('creates a multi-word name routes', async () => {
    expect(
      await scaffold.routes({
        model: 'UserProfile',
        nestScaffoldByModel: true,
      }),
    ).toEqual([
      '<Route path="/user-profiles/new" page={UserProfileNewUserProfilePage} name="newUserProfile" />',
      '<Route path="/user-profiles/{id:Int}/edit" page={UserProfileEditUserProfilePage} name="editUserProfile" />',
      '<Route path="/user-profiles/{id:Int}" page={UserProfileUserProfilePage} name="userProfile" />',
      '<Route path="/user-profiles" page={UserProfileUserProfilesPage} name="userProfiles" />',
    ])
  })

  // GraphQL queries

  test('the GraphQL in the index query does not contain object types', async () => {
    const userProfileFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })
    const cell =
      userProfileFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/UserProfilesCell/UserProfilesCell.jsx',
        )
      ]
    const query = cell.match(/(userProfiles.*?\})/s)[1]

    expect(query).not.toMatch(/^\s+user$/m)
  })

  test('the GraphQL in the show query does not contain object types', async () => {
    const userProfileFiles = await scaffold.files({
      model: 'UserProfile',
      tests: false,
      nestScaffoldByModel: true,
    })
    const cell =
      userProfileFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/UserProfileCell/UserProfileCell.jsx',
        )
      ]
    const query = cell.match(/(userProfile.*?\})/s)[1]

    expect(query).not.toMatch(/^\s+user$/m)
  })

  test('the GraphQL in the edit query does not contain object types', async () => {
    const userProfileFiles = await scaffold.files({
      model: 'UserProfile',
      typescript: true,
      tests: false,
      nestScaffoldByModel: true,
    })
    const cell =
      userProfileFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/EditUserProfileCell/EditUserProfileCell.tsx',
        )
      ]
    const query = cell.match(/(userProfile.*?\})/s)[1]

    expect(query).not.toMatch(/^\s+user$/m)
  })

  // Foreign key casting

  test('creates a new component with int foreign keys converted in onSave', async () => {
    const foreignKeyFiles = await scaffold.files({
      model: 'UserProfile',
      typescript: true,
      tests: false,
      nestScaffoldByModel: true,
    })

    expect(
      foreignKeyFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/NewUserProfile/NewUserProfile.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test('creates an edit component with int foreign keys converted in onSave', async () => {
    const foreignKeyFiles = await scaffold.files({
      model: 'UserProfile',
      typescript: true,
      tests: false,
      nestScaffoldByModel: true,
    })

    expect(
      foreignKeyFiles[
        path.normalize(
          '/path/to/project/web/src/components/UserProfile/EditUserProfileCell/EditUserProfileCell.tsx',
        )
      ],
    ).toMatchSnapshot()
  })

  // Formatters

  test('creates a formatters function file', () => {
    expect(
      tsFiles[path.normalize('/path/to/project/web/src/lib/formatters.tsx')],
    ).toMatchSnapshot()
  })

  test('creates a formatters function test file', () => {
    expect(
      tsFiles[
        path.normalize('/path/to/project/web/src/lib/formatters.test.tsx')
      ],
    ).toMatchSnapshot()
  })

  // Enums in forms

  test('generated form matches expectations', async () => {
    const files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Pixel',
      nestScaffoldByModel: true,
      typescript: true,
    })
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Pixel/PixelForm/PixelForm.tsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('tailwind flag', () => {
  test('set to `false` generates a scaffold.css with raw CSS', async () => {
    const files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Post',
      tailwind: false,
      nestScaffoldByModel: true,
    })

    expect(
      files[path.normalize('/path/to/project/web/src/scaffold.css')],
    ).toMatchSnapshot()
  })

  test('set to `true` generates a scaffold.css with Tailwind components', async () => {
    const files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Post',
      tailwind: true,
      nestScaffoldByModel: true,
    })

    expect(
      files[path.normalize('/path/to/project/web/src/scaffold.css')],
    ).toMatchSnapshot()
  })
})

describe("'use client' directive", () => {
  let files

  beforeAll(async () => {
    vol.fromJSON(
      { 'redwood.toml': '[experimental.rsc]\n  enabled = true' },
      '/',
    )

    files = await scaffold.files({
      ...getDefaultArgs(defaults),
      model: 'Post',
      nestScaffoldByModel: true,
    })
  })

  test("creates a new NewPost component with the 'use client' directive", async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/NewPost/NewPost.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test("creates a new PostCell cell with the 'use client' directive", async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostCell/PostCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test("creates a new PostsCell cell with the 'use client' directive", async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/PostsCell/PostsCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })

  test("creates a new EditPostCell cell with the 'use client' directive", async () => {
    expect(
      files[
        path.normalize(
          '/path/to/project/web/src/components/Post/EditPostCell/EditPostCell.jsx',
        )
      ],
    ).toMatchSnapshot()
  })
})

describe('custom templates', () => {
  let tsFiles
  let originalRwjsCwd

  beforeAll(async () => {
    originalRwjsCwd = process.env.RWJS_CWD
    process.env.RWJS_CWD = '/path/to/project'

    vol.fromJSON(
      {
        'redwood.toml': '',
        'web/generators/scaffold/pages/EditNamePage.tsx.template':
          'export default function CustomEditPage() { return null }',
        'web/generators/scaffold/pages/NewNamePage.tsx.template':
          'export default function CustomNewPage() { return null }',
        'web/generators/scaffold/pages/NamePage.tsx.template':
          'export default function CustomPage() { return null }',
        'web/generators/scaffold/pages/NamesPage.tsx.template':
          'export default function CustomPluralPage() { return null }',
      },
      process.env.RWJS_CWD,
    )

    tsFiles = await scaffold.files({
      force: false,
      model: 'Post',
      typescript: true,
      tests: true,
      nestScaffoldByModel: true,
    })
  })

  afterAll(() => {
    vol.reset()
    process.env.RWJS_CWD = originalRwjsCwd
  })

  test('returns exactly 19 files', () => {
    expect(Object.keys(tsFiles).length).toEqual(19)
  })

  test('creates an Edit page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/EditPostPage/EditPostPage.tsx',
        )
      ],
    ).toMatchInlineSnapshot(`
      "export default function CustomEditPage() {
        return null
      }
      "
    `)
  })

  test('creates an Index page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostsPage/PostsPage.tsx',
        )
      ],
    ).toMatchInlineSnapshot(`
      "export default function CustomPluralPage() {
        return null
      }
      "
    `)
  })

  test('creates a New page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/NewPostPage/NewPostPage.tsx',
        )
      ],
    ).toMatchInlineSnapshot(`
      "export default function CustomNewPage() {
        return null
      }
      "
    `)
  })

  test('creates a Show page', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/pages/Post/PostPage/PostPage.tsx',
        )
      ],
    ).toMatchInlineSnapshot(`
      "export default function CustomPage() {
        return null
      }
      "
    `)
  })

  // SDL
  // (Including this in the test just to make sure we're testing at least one
  // api-side file)

  test('creates an sdl', () => {
    expect(
      tsFiles[path.normalize('/path/to/project/api/src/graphql/posts.sdl.ts')],
    ).toMatchSnapshot()
  })

  // Layout
  // (Including this in the test just to make sure we're testing at least one
  // web-side file that we don't have a custom template for)

  test('creates a layout', async () => {
    expect(
      tsFiles[
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.tsx',
        )
      ],
    ).toMatchSnapshot()
  })
})
