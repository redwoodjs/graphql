import { buildSchema } from "graphql";
import { describe, expect, it } from "vite-plus/test";

import {
  appendRelationResolverTypes,
  getRelationFields,
  shouldWrapRelationOptional,
  wrapObjectType,
  wrapRelationOptionalTypes,
} from "./schema-relations.ts";

const schema = buildSchema(`
  type Query {
    post(id: Int!): Post
    posts: [Post!]!
  }

  type Mutation {
    createPost(title: String!): Post!
  }

  type Post {
    id: Int!
    author: User!
    title: String!
  }

  type User {
    id: Int!
    posts: [Post]!
  }
`);

describe("getRelationFields", () => {
  it("returns object-typed fields for a GraphQL type", () => {
    expect(getRelationFields(schema, "Post")).toEqual(["author"]);
    expect(getRelationFields(schema, "User")).toEqual(["posts"]);
    expect(getRelationFields(schema, "Missing")).toEqual([]);
  });
});

describe("shouldWrapRelationOptional", () => {
  it("wraps entity types with relations", () => {
    expect(shouldWrapRelationOptional(schema, "Post")).toBe(true);
    expect(shouldWrapRelationOptional(schema, "User")).toBe(true);
  });

  it("does not wrap root operation types", () => {
    expect(shouldWrapRelationOptional(schema, "Query")).toBe(false);
    expect(shouldWrapRelationOptional(schema, "Mutation")).toBe(false);
  });
});

describe("wrapObjectType", () => {
  it("wraps exported object types in RelationOptional", () => {
    const declaration = `export type Post = {
  id: number;
  author: User;
}`;

    expect(wrapObjectType(declaration, ["author"])).toBe(
      `export type Post = RelationOptional<\n{
  id: number;
  author: User;
}, 'author'>\n`,
    );
  });

  it("returns the original declaration when it does not match", () => {
    const declaration = "not a type declaration";
    expect(wrapObjectType(declaration, ["author"])).toBe(declaration);
  });
});

describe("wrapRelationOptionalTypes", () => {
  it("wraps entity types but not Query or Mutation", () => {
    const content = `export type Query = {
  post?: Maybe<Post>;
  posts: Array<Post>;
};

export type Mutation = {
  createPost: Post;
};

export type Post = {
  id: Scalars['Int']['output'];
  author: User;
};
`;

    const wrapped = wrapRelationOptionalTypes(schema, content);

    expect(wrapped).not.toMatch(/export type Query = RelationOptional/);
    expect(wrapped).not.toMatch(/export type Mutation = RelationOptional/);
    expect(wrapped).toMatch(/export type Post = RelationOptional</);
  });
});

describe("appendRelationResolverTypes", () => {
  it("adds RelationResolvers types with only relation fields", () => {
    const content = `export type PostResolvers = {
  author?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type UserResolvers = {
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  posts?: Resolver<Array<Maybe<ResolversTypes['Post']>>, ParentType, ContextType>;
};
`;

    const appended = appendRelationResolverTypes(schema, content);

    expect(appended).toContain(
      "export type PostRelationResolvers<ContextType = YogaContext, ParentType extends ResolversParentTypes['Post'] = ResolversParentTypes['Post']> = Pick<PostResolvers<ContextType, ParentType>, 'author'>;",
    );
    expect(appended).toContain(
      "export type UserRelationResolvers<ContextType = YogaContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = Pick<UserResolvers<ContextType, ParentType>, 'posts'>;",
    );
    expect(appended).not.toMatch(/PostRelationResolvers[\s\S]*'id'/);
  });
});
