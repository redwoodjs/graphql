// This test requires that a schema.prisma file exists or is mocked:
//
// model User {
//   id                  Int     @id @default(autoincrement())
//   email               String  @unique
//   name                String?
//   posts               Post[]
//   hashedPassword      String
//   salt                String
//   resetToken          String?
//   resetTokenExpiresAt DateTime?
// }
//
// model Post {
//   id     Int     @id @default(autoincrement())
//   userId Int
//   user   User @relation(fields: [userId], references: [id])
//   title  String
// }

import { describe, it, expect } from 'vitest'

import datamodel from '../__fixtures__/datamodel.js'
import RedwoodRecord from '../RedwoodRecord'
import Reflection from '../Reflection'

class User extends RedwoodRecord {}
class Post extends RedwoodRecord {}
User.schema = datamodel
Post.schema = datamodel

// Reflection doesn't require defining related model records
// User.requiredModels = [Post]
// Post.requiredModels = [User]

describe('constructor', () => {
  it('should store the model name', () => {
    const reflect = new Reflection(User)

    expect(reflect.model).toEqual(User)
  })
})

describe('relationship', () => {
  it('includes hasMany relationships', () => {
    const reflection = new Reflection(User)
    const hasMany = reflection.hasMany

    expect(hasMany.posts).toEqual({
      modelName: 'Post',
      foreignKey: 'userId',
      primaryKey: 'id',
      referenceName: 'user',
    })
  })

  it('includes implicit many-to-many relationships', () => {
    const reflection = new Reflection(Post)
    const hasMany = reflection.hasMany

    expect(hasMany.categories).toEqual({
      modelName: 'Category',
      foreignKey: null,
      primaryKey: 'id',
      referenceName: 'posts',
    })
  })

  it('includes belongsTo relationships', () => {
    const reflection = new Reflection(Post)
    const belongsTo = reflection.belongsTo

    expect(belongsTo.user).toEqual({
      modelName: 'User',
      foreignKey: 'userId',
      primaryKey: 'id',
    })
  })

  it('includes attributes', () => {
    const userReflection = new Reflection(User)
    const userAttributes = userReflection.attributes
    const postReflection = new Reflection(Post)
    const postAttributes = postReflection.attributes

    expect(Object.keys(userAttributes).length).toEqual(7)
    // doesn't include hasMany relationships
    expect(userAttributes.posts).toEqual(undefined)

    expect(Object.keys(postAttributes).length).toEqual(3)
    // doesn't include belongsTo relationships
    expect(postAttributes.user).toEqual(undefined)
    // does include foreign keys
    expect(postAttributes.userId).not.toEqual(undefined)
  })
})
