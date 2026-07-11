import { describe, expect, it } from "vite-plus/test";

import skipAuth from "./skipAuth.ts";

describe("skipAuth directive", () => {
  it("declares the directive sdl as schema, with the correct name", () => {
    expect(skipAuth.schema).toBeTruthy();
    expect(skipAuth.name).toBe("skipAuth");
  });
});
