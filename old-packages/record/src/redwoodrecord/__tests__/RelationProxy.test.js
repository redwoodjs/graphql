import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'

import datamodel from '../__fixtures__/datamodel.js'
import RedwoodRecord from '../RedwoodRecord'
import RelationProxy from '../RelationProxy'

const db = { user: vi.fn() }

class Post extends RedwoodRecord {}
class User extends RedwoodRecord {}
class Comment extends RedwoodRecord {}
class Category extends RedwoodRecord {}
Post.db = db
Post.schema = datamodel
User.db = db
User.schema = datamodel
Comment.db = db
Comment.schema = datamodel
Category.db = db
Category.schema = datamodel

globalThis.console.warn = vi.fn()

beforeEach(() => {
  db.user.mockClear()
  Post.requiredModels = [User, Comment, Category]
  User.requiredModels = [Post, Comment]
  Category.requiredModels = [Post]
})

afterEach(() => {
  globalThis.console.warn.mockClear()
  vi.restoreAllMocks()
})

describe('belongsTo', () => {
  it('adds nothing if model has no belongsTo relations', () => {
    const record = new User()

    RelationProxy.addRelations(record)

    expect(record.user).toEqual(undefined)
  })

  it('logs a warning if model does not require needed model', () => {
    Post.requiredModels = []
    const record = new Post()
    RelationProxy.addRelations(record)

    // one warning for user, comments, categories
    expect(console.warn).toBeCalledTimes(3)
  })

  it('created method returns a belongsTo a record', async () => {
    vi.spyOn(User, 'findBy').mockImplementation(() =>
      User.build({ id: 1, name: 'Rob' }),
    )
    const record = new Post()
    record.userId = 1

    RelationProxy.addRelations(record)
    const user = await record.user

    expect(User.findBy).toHaveBeenCalledWith({ id: 1 })
    expect(user instanceof User).toEqual(true)
    expect(user.id).toEqual(1)
  })
})

describe('hasMany', () => {
  it('adds nothing if model has no hasMany relations', () => {
    const record = new Post()
    RelationProxy.addRelations(record)

    expect(record.posts).toEqual(undefined)
  })

  it('logs a warning if model does not require needed model', () => {
    User.requiredModels = []
    const record = new User()
    RelationProxy.addRelations(record)

    // one warning for posts and one for comments
    expect(console.warn).toBeCalledTimes(2)
  })

  it('instantiates hasMany proxy', () => {
    const record = new User()
    record.id = 1

    RelationProxy.addRelations(record)
    const proxy = record.posts

    expect(proxy instanceof RelationProxy).toEqual(true)
    expect(proxy.model).toEqual(Post)
    expect(proxy.relation).toEqual({ where: { userId: 1 } })
  })

  it('create hasMany record linked by foreign key', async () => {
    vi.spyOn(User, 'find').mockImplementation(() => User.build({ id: 1 }))
    vi.spyOn(Post, 'create').mockImplementation(() =>
      User.build({ id: 1, userId: 1 }),
    )

    const user = await User.find(1)
    const newPost = await user.posts.create({
      title: 'My second post',
    })

    expect(Post.create).toHaveBeenCalledWith(
      {
        userId: 1,
        title: 'My second post',
      },
      {},
    )
    expect(newPost.userId).toEqual(user.id)
  })

  it('fetches related records with find()', async () => {
    vi.spyOn(User, 'find').mockImplementation(() => User.build({ id: 1 }))
    vi.spyOn(Post, 'findBy').mockImplementation(() => Post.build({ id: 2 }))

    const record = await User.find(1)
    const post = await record.posts.find(2)

    expect(Post.findBy).toHaveBeenCalledWith({ id: 2, userId: 1 }, {})
    expect(post.id).toEqual(2)
  })

  it('fetches related records with findBy()', async () => {
    vi.spyOn(User, 'find').mockImplementation(() => User.build({ id: 1 }))
    vi.spyOn(Post, 'findBy').mockImplementation(() =>
      Post.build({ id: 2, title: 'New' }),
    )

    const record = await User.find(1)
    const post = await record.posts.findBy({ title: 'New' })

    expect(Post.findBy).toHaveBeenCalledWith({ title: 'New', userId: 1 }, {})
    expect(post.id).toEqual(2)
  })

  it('fetches related records with where()', async () => {
    vi.spyOn(User, 'find').mockImplementation(() => User.build({ id: 1 }))
    vi.spyOn(Post, 'where').mockImplementation(() => [Post.build({ id: 2 })])

    const record = await User.find(1)
    const posts = await record.posts.where()

    expect(Post.where).toHaveBeenCalledWith({ userId: 1 }, {})
    expect(posts.length).toEqual(1)
    expect(posts[0].id).toEqual(2)
  })
})

describe('implicit many-to-many', () => {
  it('instantiates hasMany proxy', () => {
    const record = new Post()
    record.id = 1

    RelationProxy.addRelations(record)
    const proxy = record.categories

    expect(proxy instanceof RelationProxy).toEqual(true)
    expect(proxy.model).toEqual(Category)
    expect(proxy.relation).toEqual({
      where: { posts: { some: { id: 1 } } },
      create: { posts: { connect: [{ id: record.id }] } },
    })
  })

  it('create connects manyToMany record', async () => {
    vi.spyOn(Post, 'find').mockImplementation(() => Post.build({ id: 1 }))
    vi.spyOn(Category, 'create').mockImplementation(() =>
      Category.build({ id: 2, name: 'Sample' }),
    )

    const post = await Post.find(1)
    const newCategory = await post.categories.create({ name: 'Sample' })

    expect(Category.create).toHaveBeenCalledWith(
      {
        name: 'Sample',
        posts: {
          connect: [{ id: 1 }],
        },
      },
      {},
    )

    expect(newCategory.id).toEqual(2)
  })

  it('fetches related records with find()', async () => {
    vi.spyOn(Post, 'find').mockImplementation(() => Post.build({ id: 1 }))
    vi.spyOn(Category, 'findBy').mockImplementation(() =>
      Category.build({ id: 2, name: 'Cat' }),
    )

    const record = await Post.find(1)
    const category = await record.categories.find(2)

    expect(Category.findBy).toHaveBeenCalledWith(
      {
        id: 2,
        posts: {
          some: { id: 1 },
        },
      },
      {},
    )
    expect(category.id).toEqual(2)
  })

  it('fetches related records with where()', async () => {
    vi.spyOn(Post, 'find').mockImplementation(() => Post.build({ id: 1 }))
    vi.spyOn(Category, 'where').mockImplementation(() => [
      Category.build({ id: 2, name: 'Cat' }),
    ])

    const record = await Post.find(1)
    const categories = await record.categories.where()

    expect(Category.where).toHaveBeenCalledWith(
      {
        posts: {
          some: { id: 1 },
        },
      },
      {},
    )
    expect(categories.length).toEqual(1)
    expect(categories[0].id).toEqual(2)
  })
})
