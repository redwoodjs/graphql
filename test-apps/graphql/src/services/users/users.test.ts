import { beforeEach, describe, expect, it } from "vite-plus/test";

import { callService } from "@rwgql/graphql-typegen/yoga";

import { resetDatabase, seedPostsFixture } from "../../../testUtils/db.ts";
import { User, user } from "./users.ts";

describe("users", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns a single user", async () => {
    const fixture = await seedPostsFixture();
    const result = await callService(user, { id: fixture.post.one.authorId });

    expect(result).toMatchObject({
      id: fixture.post.one.authorId,
      email: expect.any(String),
      fullName: expect.any(String),
    });
    expect(result).not.toHaveProperty("hashedPassword");
  });

  it("resolves user posts", async () => {
    const fixture = await seedPostsFixture();
    const userResult = await callService(user, { id: fixture.post.one.authorId });
    const postsResult = await callService(User.posts!, {}, userResult!);

    expect(postsResult.some((entry) => entry.id === fixture.post.one.id)).toBe(true);
  });
});
