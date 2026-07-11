globalThis.__dirname = __dirname
import path from 'path'

import { vol } from 'memfs'
import { vi, describe, beforeAll, test, expect } from 'vitest'

import '../../../../lib/test'

import * as scaffold from '../scaffold'

vi.mock('fs', async () => ({ default: (await import('memfs')).fs }))
vi.mock('execa')

beforeAll(() => {
  vol.fromJSON({ 'redwood.toml': '' }, '/')
})

describe('admin/pages/post', () => {
  let filesNestedLower

  beforeAll(async () => {
    filesNestedLower = await scaffold.files({
      model: 'Post',
      path: 'admin/pages',
      tests: true,
      nestScaffoldByModel: false,
    })
  })

  describe('creates the correct files with the correct imports', () => {
    test('returns exactly 19 files', () => {
      expect(Object.keys(filesNestedLower).length).toEqual(19)
    })

    // Layout

    test('creates a layout', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.jsx',
        ),
      ])
    })

    // Pages

    test('creates a edit page', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/EditPostPage/EditPostPage.jsx',
        ),
      ])
    })

    test('the edit page correctly imports the edit cell', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/EditPostPage/EditPostPage.jsx',
          )
        ],
      ).toMatch(
        `import EditPostCell from 'src/components/Admin/Pages/EditPostCell'`,
      )
    })

    test('creates a index page', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/PostsPage/PostsPage.jsx',
        ),
      ])
    })

    test('the index page correctly imports the index cell', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/PostsPage/PostsPage.jsx',
          )
        ],
      ).toMatch(`import PostsCell from 'src/components/Admin/Pages/PostsCell'`)
    })

    test('creates a new page', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/NewPostPage/NewPostPage.jsx',
        ),
      ])
    })

    test('the new page correctly imports the new component', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/NewPostPage/NewPostPage.jsx',
          )
        ],
      ).toMatch(`import NewPost from 'src/components/Admin/Pages/NewPost'`)
    })

    test('creates a show page', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/PostPage/PostPage.jsx',
        ),
      ])
    })

    test('the show page correctly imports the show cell', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/PostPage/PostPage.jsx',
          )
        ],
      ).toMatch(`import PostCell from 'src/components/Admin/Pages/PostCell'`)
    })

    // Cells

    test('creates an edit cell', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/EditPostCell/EditPostCell.jsx',
        ),
      ])
    })

    test('the edit cell correctly imports the form', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/EditPostCell/EditPostCell.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/Pages/PostForm'`)
    })

    test('creates an index cell', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/PostsCell/PostsCell.jsx',
        ),
      ])
    })

    test('the index cell correctly imports the index component', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/PostsCell/PostsCell.jsx',
          )
        ],
      ).toMatch(`import Posts from 'src/components/Admin/Pages/Posts'`)
    })

    test('creates a show cell', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/PostCell/PostCell.jsx',
        ),
      ])
    })

    test('the show cell correctly imports the show component', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/PostCell/PostCell.jsx',
          )
        ],
      ).toMatch(`import Post from 'src/components/Admin/Pages/Post'`)
    })

    // Components

    test('creates a form component', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/PostForm/PostForm.jsx',
        ),
      ])
    })

    test('creates an index component', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/Posts/Posts.jsx',
        ),
      ])
    })

    test('creates a new component', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/NewPost/NewPost.jsx',
        ),
      ])
    })

    test('the new component correctly imports the form', async () => {
      expect(
        filesNestedLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/NewPost/NewPost.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/Pages/PostForm'`)
    })

    test('creates a show component', async () => {
      expect(filesNestedLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/Post/Post.jsx',
        ),
      ])
    })
  })

  describe('creates the correct routes', () => {
    // Routes

    test('creates a single-word name routes', async () => {
      expect(
        await scaffold.routes({
          model: 'Post',
          path: 'admin/pages',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/pages/posts/new" page={AdminPagesNewPostPage} name="adminPagesNewPost" />',
        '<Route path="/admin/pages/posts/{id:Int}/edit" page={AdminPagesEditPostPage} name="adminPagesEditPost" />',
        '<Route path="/admin/pages/posts/{id:Int}" page={AdminPagesPostPage} name="adminPagesPost" />',
        '<Route path="/admin/pages/posts" page={AdminPagesPostsPage} name="adminPagesPosts" />',
      ])
    })

    test('creates a multi-word name routes', async () => {
      expect(
        await scaffold.routes({
          model: 'UserProfile',
          path: 'admin/pages',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/pages/user-profiles/new" page={AdminPagesNewUserProfilePage} name="adminPagesNewUserProfile" />',
        '<Route path="/admin/pages/user-profiles/{id:Int}/edit" page={AdminPagesEditUserProfilePage} name="adminPagesEditUserProfile" />',
        '<Route path="/admin/pages/user-profiles/{id:Int}" page={AdminPagesUserProfilePage} name="adminPagesUserProfile" />',
        '<Route path="/admin/pages/user-profiles" page={AdminPagesUserProfilesPage} name="adminPagesUserProfiles" />',
      ])
    })
  })

  describe('GraphQL queries', () => {
    test('the GraphQL in the index query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin/pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/UserProfilesCell/UserProfilesCell.jsx',
          )
        ]

      const query = cell.match(/(userProfiles.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the show query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin/pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/UserProfileCell/UserProfileCell.jsx',
          )
        ]

      const query = cell.match(/(userProfile.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the edit query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin/pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/EditUserProfileCell/EditUserProfileCell.jsx',
          )
        ]

      const query = cell.match(/(userProfile.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })
  })

  describe('Foreign key casting', () => {
    test('creates a new component with int foreign keys converted in onSave', async () => {
      const foreignKeyFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin/pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/NewUserProfile/NewUserProfile.jsx',
        ),
      ])
    })

    test('creates an edit component with int foreign keys converted in onSave', async () => {
      const foreignKeyFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin/pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/EditUserProfileCell/EditUserProfileCell.jsx',
        ),
      ])
    })
  })
})

describe('Admin/Pages/Post/Post', () => {
  let filesNestedUpper

  beforeAll(async () => {
    filesNestedUpper = await scaffold.files({
      model: 'Post',
      path: 'Admin/Pages',
      tests: true,
      nestScaffoldByModel: false,
    })
  })

  describe('creates the correct files with the correct imports', () => {
    test('returns exactly 19 files', () => {
      expect(Object.keys(filesNestedUpper).length).toEqual(19)
    })

    // Layout
    test('creates a layout', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.jsx',
        ),
      ])
    })

    // Pages

    test('creates a edit page', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/EditPostPage/EditPostPage.jsx',
        ),
      ])
    })

    test('the edit page correctly imports the edit cell', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/EditPostPage/EditPostPage.jsx',
          )
        ],
      ).toMatch(
        `import EditPostCell from 'src/components/Admin/Pages/EditPostCell'`,
      )
    })

    test('creates a index page', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/PostsPage/PostsPage.jsx',
        ),
      ])
    })

    test('the index page correctly imports the index cell', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/PostsPage/PostsPage.jsx',
          )
        ],
      ).toMatch(`import PostsCell from 'src/components/Admin/Pages/PostsCell'`)
    })

    test('creates a new page', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/NewPostPage/NewPostPage.jsx',
        ),
      ])
    })

    test('the new page correctly imports the new component', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/NewPostPage/NewPostPage.jsx',
          )
        ],
      ).toMatch(`import NewPost from 'src/components/Admin/Pages/NewPost'`)
    })

    test('creates a show page', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/Pages/PostPage/PostPage.jsx',
        ),
      ])
    })

    test('the show page correctly imports the show cell', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/Pages/PostPage/PostPage.jsx',
          )
        ],
      ).toMatch(`import PostCell from 'src/components/Admin/Pages/PostCell'`)
    })

    // Cells

    test('creates an edit cell', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/EditPostCell/EditPostCell.jsx',
        ),
      ])
    })

    test('the edit cell correctly imports the form', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/EditPostCell/EditPostCell.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/Pages/PostForm'`)
    })

    test('creates an index cell', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/PostsCell/PostsCell.jsx',
        ),
      ])
    })

    test('the index cell correctly imports the index component', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/PostsCell/PostsCell.jsx',
          )
        ],
      ).toMatch(`import Posts from 'src/components/Admin/Pages/Posts'`)
    })

    test('creates a show cell', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/PostCell/PostCell.jsx',
        ),
      ])
    })

    test('the show cell correctly imports the show component', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/PostCell/PostCell.jsx',
          )
        ],
      ).toMatch(`import Post from 'src/components/Admin/Pages/Post'`)
    })

    // Components

    test('creates a form component', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/PostForm/PostForm.jsx',
        ),
      ])
    })

    test('creates an index component', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/Posts/Posts.jsx',
        ),
      ])
    })

    test('creates a new component', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/NewPost/NewPost.jsx',
        ),
      ])
    })

    test('the new component correctly imports the form', async () => {
      expect(
        filesNestedUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/NewPost/NewPost.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/Pages/PostForm'`)
    })

    test('creates a show component', async () => {
      expect(filesNestedUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/Post/Post.jsx',
        ),
      ])
    })
  })

  describe('creates the correct routes', () => {
    // Routes

    test('creates a single-word name routes', async () => {
      expect(
        await scaffold.routes({
          model: 'Post',
          path: 'Admin/Pages',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/pages/posts/new" page={AdminPagesNewPostPage} name="adminPagesNewPost" />',
        '<Route path="/admin/pages/posts/{id:Int}/edit" page={AdminPagesEditPostPage} name="adminPagesEditPost" />',
        '<Route path="/admin/pages/posts/{id:Int}" page={AdminPagesPostPage} name="adminPagesPost" />',
        '<Route path="/admin/pages/posts" page={AdminPagesPostsPage} name="adminPagesPosts" />',
      ])
    })

    test('creates a multi-word name routes', async () => {
      expect(
        await scaffold.routes({
          model: 'UserProfile',
          path: 'Admin/Pages',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/pages/user-profiles/new" page={AdminPagesNewUserProfilePage} name="adminPagesNewUserProfile" />',
        '<Route path="/admin/pages/user-profiles/{id:Int}/edit" page={AdminPagesEditUserProfilePage} name="adminPagesEditUserProfile" />',
        '<Route path="/admin/pages/user-profiles/{id:Int}" page={AdminPagesUserProfilePage} name="adminPagesUserProfile" />',
        '<Route path="/admin/pages/user-profiles" page={AdminPagesUserProfilesPage} name="adminPagesUserProfiles" />',
      ])
    })
  })

  describe('GraphQL queries', () => {
    test('the GraphQL in the index query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin/Pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/UserProfilesCell/UserProfilesCell.jsx',
          )
        ]

      const query = cell.match(/(userProfiles.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the show query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin/Pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/UserProfileCell/UserProfileCell.jsx',
          )
        ]

      const query = cell.match(/(userProfile.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the edit query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin/Pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/Pages/EditUserProfileCell/EditUserProfileCell.jsx',
          )
        ]

      const query = cell.match(/(userProfile.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })
  })

  describe('Foreign key casting', () => {
    test('creates a new component with int foreign keys converted in onSave', async () => {
      const foreignKeyFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin/Pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/NewUserProfile/NewUserProfile.jsx',
        ),
      ])
    })

    test('creates an edit component with int foreign keys converted in onSave', async () => {
      const foreignKeyFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin/Pages',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Pages/EditUserProfileCell/EditUserProfileCell.jsx',
        ),
      ])
    })
  })
})
