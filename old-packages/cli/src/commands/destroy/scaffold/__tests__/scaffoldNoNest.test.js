globalThis.__dirname = __dirname

import path from 'path'

import fs from 'fs-extra'
import { vol } from 'memfs'
import { vi, test, describe, beforeEach, afterEach, expect } from 'vitest'

import '../../../../lib/test'

import { getPaths, getDefaultArgs } from '../../../../lib'
import {
  yargsDefaults as defaults,
  customOrDefaultTemplatePath,
} from '../../../generate/helpers'
import { files } from '../../../generate/scaffold/scaffold'
import { tasks } from '../scaffold'

vi.mock('fs', async () => ({ default: (await import('memfs')).fs }))
vi.mock('fs-extra')
vi.mock('execa')

vi.mock('../../../../lib', async (importOriginal) => {
  const originalLib = await importOriginal()
  return {
    ...originalLib,
    generateTemplate: () => '',
  }
})

vi.mock('../../../../lib/schemaHelpers', async (importOriginal) => {
  const originalSchemaHelpers = await importOriginal()
  const path = require('path')
  return {
    ...originalSchemaHelpers,
    getSchema: () =>
      require(path.join(globalThis.__dirname, 'fixtures', 'post.json')),
  }
})

const templateDirectoryNames = [
  'assets',
  'components',
  'layouts',
  'lib',
  'pages',
]
const templateDirectories = templateDirectoryNames.map((name) => {
  return customOrDefaultTemplatePath({
    side: 'web',
    generator: 'scaffold',
    templatePath: name,
  })
})
const scaffoldTemplates = {}
const actualFs = await vi.importActual('fs-extra')
templateDirectories.forEach(async (directory) => {
  const files = actualFs.readdirSync(directory)
  files.forEach((file) => {
    const filePath = path.join(directory, file)
    scaffoldTemplates[filePath] = actualFs.readFileSync(filePath, 'utf-8')
  })
})

describe('rw destroy scaffold', () => {
  describe('destroy scaffold post', () => {
    beforeEach(async () => {
      // This fs is needed for the `files` function imported from `generate`
      vol.fromJSON({ 'redwood.toml': '', ...scaffoldTemplates }, '/')

      const postFiles = await files({
        ...getDefaultArgs(defaults),
        model: 'Post',
        tests: false,
        nestScaffoldByModel: false,
      })

      // This fs is needed for all the tests here
      vol.fromJSON(
        {
          ...scaffoldTemplates,
          ...postFiles,
          [getPaths().web.routes]: [
            '<Routes>',
            '  <Route path="/posts/new" page={NewPostPage} name="newPost" />',
            '  <Route path="/posts/{id:Int}/edit" page={EditPostPage} name="editPost" />',
            '  <Route path="/posts/{id:Int}" page={PostPage} name="post" />',
            '  <Route path="/posts" page={PostsPage} name="posts" />',
            '  <Route path="/" page={HomePage} name="home" />',
            '  <Route notfound page={NotFoundPage} />',
            '</Routes>',
          ].join('\n'),
        },
        '/',
      )
    })

    afterEach(() => {
      vol.fromJSON({ 'redwood.toml': '', ...scaffoldTemplates }, '/')
      vi.spyOn(fs, 'unlinkSync').mockClear()
    })

    test('destroys files', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
      const t = tasks({
        model: 'Post',
        tests: false,
        nestScaffoldByModel: false,
      })
      t.options.renderer = 'silent'

      return t.tasks[0].run().then(async () => {
        const generatedFiles = Object.keys(
          await files({
            ...getDefaultArgs(defaults),
            model: 'Post',
            tests: false,
            nestScaffoldByModel: false,
          }),
        )
        generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
        expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
      })
    })

    describe('for typescript files', () => {
      beforeEach(async () => {
        vol.reset()
        vol.fromJSON({ 'redwood.toml': '', ...scaffoldTemplates }, '/')
        vol.fromJSON({
          ...scaffoldTemplates,
          ...(await files({
            ...getDefaultArgs(defaults),
            typescript: true,
            model: 'Post',
            tests: false,
            nestScaffoldByModel: false,
          })),
          [getPaths().web.routes]: [
            '<Routes>',
            '  <Route path="/posts/new" page={NewPostPage} name="newPost" />',
            '  <Route path="/posts/{id:Int}/edit" page={EditPostPage} name="editPost" />',
            '  <Route path="/posts/{id:Int}" page={PostPage} name="post" />',
            '  <Route path="/posts" page={PostsPage} name="posts" />',
            '  <Route path="/" page={HomePage} name="home" />',
            '  <Route notfound page={NotFoundPage} />',
            '</Routes>',
          ].join('\n'),
        })
      })

      test('destroys files', async () => {
        const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
        const t = tasks({
          model: 'Post',
          tests: false,
          nestScaffoldByModel: false,
        })
        t.options.renderer = 'silent'

        return t.tasks[0].run().then(async () => {
          const generatedFiles = Object.keys(
            await files({
              ...getDefaultArgs(defaults),
              typescript: true,
              model: 'Post',
              tests: false,
              nestScaffoldByModel: false,
            }),
          )
          expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
          generatedFiles.forEach((f) =>
            expect(unlinkSpy).toHaveBeenCalledWith(f),
          )
        })
      })
    })

    test('cleans up routes from Routes.js', async () => {
      const t = tasks({
        model: 'Post',
        tests: false,
        nestScaffoldByModel: false,
      })
      t.options.renderer = 'silent'

      return t.tasks[1].run().then(() => {
        const routes = fs.readFileSync(getPaths().web.routes, 'utf-8')
        expect(routes).toEqual(
          [
            '<Routes>',
            '  <Route path="/" page={HomePage} name="home" />',
            '  <Route notfound page={NotFoundPage} />',
            '</Routes>',
          ].join('\n'),
        )
      })
    })
  })

  describe('destroy namespaced scaffold post', () => {
    beforeEach(async () => {
      vol.fromJSON({ 'redwood.toml': '' }, '/')
      vol.fromJSON({
        ...scaffoldTemplates,
        ...(await files({
          ...getDefaultArgs(defaults),
          model: 'Post',
          path: 'admin',
          tests: false,
          nestScaffoldByModel: false,
        })),
        [getPaths().web.routes]: [
          '<Routes>',
          '  <Route path="/admin/posts/new" page={AdminNewPostPage} name="adminNewPost" />',
          '  <Route path="/admin/posts/{id:Int}/edit" page={AdminEditPostPage} name="adminEditPost" />',
          '  <Route path="/admin/posts/{id:Int}" page={AdminPostPage} name="adminPost" />',
          '  <Route path="/" page={HomePage} name="home" />',
          '  <Route notfound page={NotFoundPage} />',
          '</Routes>',
        ].join('\n'),
      })
    })

    afterEach(() => {
      vol.fromJSON(scaffoldTemplates)
      vi.spyOn(fs, 'unlinkSync').mockClear()
    })

    test('destroys files', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
      const t = tasks({
        model: 'Post',
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })
      t.options.renderer = 'silent'

      return t.tasks[0].run().then(async () => {
        const generatedFiles = Object.keys(
          await files({
            ...getDefaultArgs(defaults),
            model: 'Post',
            path: 'admin',
            tests: false,
            nestScaffoldByModel: false,
          }),
        )
        expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
        generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
      })
    })

    describe('for typescript files', () => {
      beforeEach(async () => {
        vol.fromJSON({ 'redwood.toml': '' }, '/')
        vol.fromJSON({
          ...scaffoldTemplates,
          ...(await files({
            ...getDefaultArgs(defaults),
            model: 'Post',
            path: 'admin',
            tests: false,
            nestScaffoldByModel: false,
          })),
          [getPaths().web.routes]: [
            '<Routes>',
            '  <Route path="/admin/posts/new" page={AdminNewPostPage} name="adminNewPost" />',
            '  <Route path="/admin/posts/{id:Int}/edit" page={AdminEditPostPage} name="adminEditPost" />',
            '  <Route path="/admin/posts/{id:Int}" page={AdminPostPage} name="adminPost" />',
            '  <Route path="/" page={HomePage} name="home" />',
            '  <Route notfound page={NotFoundPage} />',
            '</Routes>',
          ].join('\n'),
        })
      })
      test('destroys files', async () => {
        const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
        const t = tasks({
          model: 'Post',
          path: 'admin',
          tests: false,
          nestScaffoldByModel: false,
        })
        t.options.renderer = 'silent'

        return t.tasks[0].run().then(async () => {
          const generatedFiles = Object.keys(
            await files({
              ...getDefaultArgs(defaults),
              model: 'Post',
              path: 'admin',
              tests: false,
              nestScaffoldByModel: false,
            }),
          )
          expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
          generatedFiles.forEach((f) =>
            expect(unlinkSpy).toHaveBeenCalledWith(f),
          )
        })
      })
    })

    test('cleans up routes from Routes.js', async () => {
      const t = tasks({
        model: 'Post',
        path: 'admin',
        tests: false,
        nestScaffoldByModel: false,
      })
      t.options.renderer = 'silent'

      return t.tasks[1].run().then(() => {
        const routes = fs.readFileSync(getPaths().web.routes, 'utf-8')
        expect(routes).toEqual(
          [
            '<Routes>',
            '  <Route path="/" page={HomePage} name="home" />',
            '  <Route notfound page={NotFoundPage} />',
            '</Routes>',
          ].join('\n'),
        )
      })
    })
  })
})
