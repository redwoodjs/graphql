import { beforeEach, describe, expect, it } from "vite-plus/test";

import { callService } from "@rwgql/graphql-typegen/yoga";

import { resetDatabase, seedPostsFixture } from "../../../testUtils/db.ts";
import { user } from "../users/users.ts";
import { createPost, deletePost, post, Post, posts, updatePost } from "./posts.ts";

describe("posts", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns all posts", async () => {
    const fixture = await seedPostsFixture();
    const result = await callService(posts, {});

    expect(result.length).toEqual(Object.keys(fixture.post).length);
  });

  it("returns a single post", async () => {
    const fixture = await seedPostsFixture();
    const result = await callService(post, { id: fixture.post.one.id });

    expect(result).toEqual(fixture.post.one);
  });

  it("resolves post author", async () => {
    const fixture = await seedPostsFixture();
    const postResult = await callService(post, { id: fixture.post.one.id });
    const authorResult = await callService(Post.author!, {}, postResult!);
    const userResult = await callService(user, { id: fixture.post.one.authorId });

    expect(authorResult).toEqual(userResult);
  });

  it("creates a post", async () => {
    const fixture = await seedPostsFixture();
    const result = await callService(createPost, {
      input: {
        authorId: fixture.post.two.authorId,
        body: "String",
        title: "String",
      },
    });

    expect(result.title).toEqual("String");
    expect(result.body).toEqual("String");
    expect(result.authorId).toEqual(fixture.post.two.authorId);
  });

  it("updates a post", async () => {
    const fixture = await seedPostsFixture();
    const original = await callService(post, { id: fixture.post.one.id });
    const result = await callService(updatePost, { id: original!.id, input: { title: "String2" } });

    expect(result.title).toEqual("String2");
  });

  it("deletes a post", async () => {
    const fixture = await seedPostsFixture();
    const original = await callService(deletePost, { id: fixture.post.one.id });
    const result = await callService(post, { id: original.id });

    expect(result).toEqual(null);
  });
});
