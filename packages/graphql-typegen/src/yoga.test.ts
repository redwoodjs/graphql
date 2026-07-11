import { describe, expect, it, vi } from "vite-plus/test";

import { bindResolver, callService, createServiceSchema } from "./yoga.ts";

describe("bindResolver", () => {
  it("maps GraphQL args to callable service resolver args", async () => {
    const service = vi.fn(({ id }: { id: number }) => ({ id }));
    const resolver = bindResolver(service);

    await resolver({}, { id: 1 }, { userId: 2 }, {} as never);

    expect(service).toHaveBeenCalledWith({ id: 1 }, { root: {}, context: { userId: 2 }, info: {} });
  });
});

describe("callService", () => {
  it("invokes callable service resolvers with args and root", async () => {
    const service = vi.fn(({ id }: { id: number }) => ({ id }));
    const result = await callService(service, { id: 1 }, { title: "Post" });

    expect(service).toHaveBeenCalledWith(
      { id: 1 },
      { root: { title: "Post" }, context: undefined },
    );
    expect(result).toEqual({ id: 1 });
  });
});

describe("createServiceSchema", () => {
  const typeDefs = [
    `
      scalar DateTime

      type Query {
        post(id: Int!): Post
        posts: [Post!]!
      }

      type Mutation {
        createPost(input: CreatePostInput!): Post!
      }

      type Post {
        id: Int!
        title: String!
        author: User!
      }

      type User {
        id: Int!
        name: String!
      }

      input CreatePostInput {
        title: String!
      }
    `,
  ] as const;

  const services = {
    posts: {
      post: ({ id }: { id: number }) => ({ id, title: `Post ${id}` }),
      posts: () => [{ id: 1, title: "Hello" }],
      createPost: ({ input }: { input: { title: string } }) => ({
        id: 2,
        title: input.title,
      }),
      Post: {
        author: (_args: Record<string, never>, { root }: { root: { id: number } }) => ({
          id: 99,
          name: `Author of ${root.id}`,
        }),
      },
    },
  } as const;

  it("wires Query, Mutation, and PascalCase type resolvers from services", async () => {
    const schema = createServiceSchema({ services, typeDefs });
    const resolvePosts = schema.getQueryType()?.getFields().posts.resolve;
    const postType = schema.getType("Post") as
      | { getFields: () => Record<string, { resolve?: (...args: never[]) => unknown }> }
      | undefined;
    const resolveAuthor = postType?.getFields().author?.resolve as
      | ((...args: unknown[]) => unknown)
      | undefined;

    expect(resolvePosts).toBeTypeOf("function");
    expect(resolveAuthor).toBeTypeOf("function");

    const posts = await resolvePosts?.({}, {}, {}, {} as never);
    const author = await resolveAuthor?.({ id: 1, title: "Hello" }, {}, {}, {} as never);

    expect(posts).toEqual([{ id: 1, title: "Hello" }]);
    expect(author).toEqual({ id: 99, name: "Author of 1" });
  });

  it("throws when a Query field has no matching service export", () => {
    expect(() =>
      createServiceSchema({
        services: { posts: { posts: () => [] } },
        typeDefs: ["type Query { post(id: Int!): Post } type Post { id: Int! }"],
      }),
    ).toThrow("Missing service resolver for Query.post");
  });

  it("throws on ambiguous camelCase exports across services", () => {
    expect(() =>
      createServiceSchema({
        services: {
          alpha: { post: () => ({ id: 1 }) },
          beta: { post: () => ({ id: 2 }) },
        },
        typeDefs: ["type Query { post(id: Int!): Post } type Post { id: Int! }"],
      }),
    ).toThrow('Ambiguous service export "post"');
  });
});
