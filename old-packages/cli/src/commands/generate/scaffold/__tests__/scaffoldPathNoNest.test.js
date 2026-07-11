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

describe('admin/Post', () => {
  let filesLower

  beforeAll(async () => {
    filesLower = await scaffold.files({
      model: 'Post',
      path: 'admin',
      tests: true,
      nestScaffoldByModel: false,
    })
  })

  describe('creates the correct files with the correct imports', () => {
    test('returns exactly 19 files', () => {
      expect(Object.keys(filesLower).length).toEqual(19)
    })

    // Layout
    test('creates a layout', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.jsx',
        ),
      ])
    })

    // Pages

    test('creates a edit page', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/EditPostPage/EditPostPage.jsx',
        ),
      ])
    })

    test('the edit page correctly imports the edit cell', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/EditPostPage/EditPostPage.jsx',
          )
        ],
      ).toMatch(`import EditPostCell from 'src/components/Admin/EditPostCell'`)
    })

    test('creates a index page', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/PostsPage/PostsPage.jsx',
        ),
      ])
    })

    test('the index page correctly imports the index cell', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/PostsPage/PostsPage.jsx',
          )
        ],
      ).toMatch(`import PostsCell from 'src/components/Admin/PostsCell'`)
    })

    test('creates a new page', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/NewPostPage/NewPostPage.jsx',
        ),
      ])
    })

    test('the new page correctly imports the new component', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/NewPostPage/NewPostPage.jsx',
          )
        ],
      ).toMatch(`import NewPost from 'src/components/Admin/NewPost'`)
    })

    test('creates a show page', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/PostPage/PostPage.jsx',
        ),
      ])
    })

    test('the show page correctly imports the show cell', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/PostPage/PostPage.jsx',
          )
        ],
      ).toMatch(`import PostCell from 'src/components/Admin/PostCell'`)
    })

    // Cells

    test('creates an edit cell', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/EditPostCell/EditPostCell.jsx',
        ),
      ])
    })

    test('the edit cell correctly imports the form', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/EditPostCell/EditPostCell.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/PostForm'`)
    })

    test('creates an index cell', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/PostsCell/PostsCell.jsx',
        ),
      ])
    })

    test('the index cell correctly imports the index component', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/PostsCell/PostsCell.jsx',
          )
        ],
      ).toMatch(`import Posts from 'src/components/Admin/Posts'`)
    })

    test('creates a show cell', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/PostCell/PostCell.jsx',
        ),
      ])
    })

    test('the show cell correctly imports the show component', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/PostCell/PostCell.jsx',
          )
        ],
      ).toMatch(`import Post from 'src/components/Admin/Post'`)
    })

    // Components

    test('creates a form component', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/PostForm/PostForm.jsx',
        ),
      ])
    })

    test('creates an index component', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Posts/Posts.jsx',
        ),
      ])
    })

    test('creates a new component', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/NewPost/NewPost.jsx',
        ),
      ])
    })

    test('the new component correctly imports the form', async () => {
      expect(
        filesLower[
          path.normalize(
            '/path/to/project/web/src/components/Admin/NewPost/NewPost.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/PostForm'`)
    })

    test('creates a show component', async () => {
      expect(filesLower).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Post/Post.jsx',
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
          path: 'admin',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/posts/new" page={AdminNewPostPage} name="adminNewPost" />',
        '<Route path="/admin/posts/{id:Int}/edit" page={AdminEditPostPage} name="adminEditPost" />',
        '<Route path="/admin/posts/{id:Int}" page={AdminPostPage} name="adminPost" />',
        '<Route path="/admin/posts" page={AdminPostsPage} name="adminPosts" />',
      ])
    })

    test('creates a multi-word name routes', async () => {
      expect(
        await scaffold.routes({
          model: 'UserProfile',
          path: 'admin',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/user-profiles/new" page={AdminNewUserProfilePage} name="adminNewUserProfile" />',
        '<Route path="/admin/user-profiles/{id:Int}/edit" page={AdminEditUserProfilePage} name="adminEditUserProfile" />',
        '<Route path="/admin/user-profiles/{id:Int}" page={AdminUserProfilePage} name="adminUserProfile" />',
        '<Route path="/admin/user-profiles" page={AdminUserProfilesPage} name="adminUserProfiles" />',
      ])
    })
  })

  describe('GraphQL queries', () => {
    test('the GraphQL in the index query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/UserProfilesCell/UserProfilesCell.jsx',
          )
        ]

      const query = cell.match(/(userProfiles.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the show query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/UserProfileCell/UserProfileCell.jsx',
          )
        ]

      const query = cell.match(/(userProfile.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the edit query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/EditUserProfileCell/EditUserProfileCell.jsx',
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
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/NewUserProfile/NewUserProfile.jsx',
        ),
      ])
    })

    test('creates an edit component with int foreign keys converted in onSave', async () => {
      const foreignKeyFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/EditUserProfileCell/EditUserProfileCell.jsx',
        ),
      ])
    })
  })
})

describe('Admin/Post', () => {
  let filesUpper

  beforeAll(async () => {
    filesUpper = await scaffold.files({
      model: 'Post',
      path: 'Admin',
      tests: true,
      nestScaffoldByModel: false,
    })
  })

  describe('creates the correct files with the correct imports', () => {
    test('returns exactly 19 files', () => {
      expect(Object.keys(filesUpper).length).toEqual(19)
    })

    // Layout

    test('creates a layout', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/layouts/ScaffoldLayout/ScaffoldLayout.jsx',
        ),
      ])
    })

    // Pages

    test('creates a edit page', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/EditPostPage/EditPostPage.jsx',
        ),
      ])
    })

    test('the edit page correctly imports the edit cell', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/EditPostPage/EditPostPage.jsx',
          )
        ],
      ).toMatch(`import EditPostCell from 'src/components/Admin/EditPostCell'`)
    })

    test('creates a index page', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/PostsPage/PostsPage.jsx',
        ),
      ])
    })

    test('the index page correctly imports the index cell', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/PostsPage/PostsPage.jsx',
          )
        ],
      ).toMatch(`import PostsCell from 'src/components/Admin/PostsCell'`)
    })

    test('creates a new page', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/NewPostPage/NewPostPage.jsx',
        ),
      ])
    })

    test('the new page correctly imports the new component', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/NewPostPage/NewPostPage.jsx',
          )
        ],
      ).toMatch(`import NewPost from 'src/components/Admin/NewPost'`)
    })

    test('creates a show page', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/pages/Admin/PostPage/PostPage.jsx',
        ),
      ])
    })

    test('the show page correctly imports the show cell', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/pages/Admin/PostPage/PostPage.jsx',
          )
        ],
      ).toMatch(`import PostCell from 'src/components/Admin/PostCell'`)
    })

    // Cells

    test('creates an edit cell', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/EditPostCell/EditPostCell.jsx',
        ),
      ])
    })

    test('the edit cell correctly imports the form', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/EditPostCell/EditPostCell.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/PostForm'`)
    })

    test('creates an index cell', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/PostsCell/PostsCell.jsx',
        ),
      ])
    })

    test('the index cell correctly imports the index component', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/PostsCell/PostsCell.jsx',
          )
        ],
      ).toMatch(`import Posts from 'src/components/Admin/Posts'`)
    })

    test('creates a show cell', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/PostCell/PostCell.jsx',
        ),
      ])
    })

    test('the show cell correctly imports the show component', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/PostCell/PostCell.jsx',
          )
        ],
      ).toMatch(`import Post from 'src/components/Admin/Post'`)
    })

    // Components

    test('creates a form component', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/PostForm/PostForm.jsx',
        ),
      ])
    })

    test('creates an index component', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Posts/Posts.jsx',
        ),
      ])
    })

    test('creates a new component', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/NewPost/NewPost.jsx',
        ),
      ])
    })

    test('the new component correctly imports the form', async () => {
      expect(
        filesUpper[
          path.normalize(
            '/path/to/project/web/src/components/Admin/NewPost/NewPost.jsx',
          )
        ],
      ).toMatch(`import PostForm from 'src/components/Admin/PostForm'`)
    })

    test('creates a show component', async () => {
      expect(filesUpper).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/Post/Post.jsx',
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
          path: 'Admin',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/posts/new" page={AdminNewPostPage} name="adminNewPost" />',
        '<Route path="/admin/posts/{id:Int}/edit" page={AdminEditPostPage} name="adminEditPost" />',
        '<Route path="/admin/posts/{id:Int}" page={AdminPostPage} name="adminPost" />',
        '<Route path="/admin/posts" page={AdminPostsPage} name="adminPosts" />',
      ])
    })

    test('creates a multi-word name routes', async () => {
      expect(
        await scaffold.routes({
          model: 'UserProfile',
          path: 'Admin',
          nestScaffoldByModel: false,
        }),
      ).toEqual([
        '<Route path="/admin/user-profiles/new" page={AdminNewUserProfilePage} name="adminNewUserProfile" />',
        '<Route path="/admin/user-profiles/{id:Int}/edit" page={AdminEditUserProfilePage} name="adminEditUserProfile" />',
        '<Route path="/admin/user-profiles/{id:Int}" page={AdminUserProfilePage} name="adminUserProfile" />',
        '<Route path="/admin/user-profiles" page={AdminUserProfilesPage} name="adminUserProfiles" />',
      ])
    })
  })

  describe('GraphQL queries', () => {
    test('the GraphQL in the index query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/UserProfilesCell/UserProfilesCell.jsx',
          )
        ]

      const query = cell.match(/(userProfiles.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the show query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/UserProfileCell/UserProfileCell.jsx',
          )
        ]

      const query = cell.match(/(userProfile.*?\})/s)[1]

      expect(query).not.toMatch(/^\s+user$/m)
    })

    test('the GraphQL in the edit query does not contain object types', async () => {
      const userProfileFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      const cell =
        userProfileFiles[
          path.normalize(
            '/path/to/project/web/src/components/Admin/EditUserProfileCell/EditUserProfileCell.jsx',
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
        path: 'Admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/NewUserProfile/NewUserProfile.jsx',
        ),
      ])
    })

    test('creates an edit component with int foreign keys converted in onSave', async () => {
      const foreignKeyFiles = await scaffold.files({
        model: 'UserProfile',
        path: 'Admin',
        tests: false,
        nestScaffoldByModel: false,
      })

      expect(foreignKeyFiles).toHaveProperty([
        path.normalize(
          '/path/to/project/web/src/components/Admin/EditUserProfileCell/EditUserProfileCell.jsx',
        ),
      ])
    })
  })
})
