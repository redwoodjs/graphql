import { describe, expect, it } from "vite-plus/test";

import { buildPath } from "./buildPath.js";

describe("buildPath", () => {
  it("returns static paths unchanged", () => {
    expect(buildPath("/posts")).toBe("/posts");
  });

  it("replaces :id with stringified params", () => {
    expect(buildPath("/posts/:id", { id: 42 })).toBe("/posts/42");
    expect(buildPath("/posts/:id/edit", { id: "abc" })).toBe("/posts/abc/edit");
  });
});
