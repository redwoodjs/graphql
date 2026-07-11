import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { buildPostgresSocketUrl, getSocketDir } from "./urls.ts";

describe("getSocketDir", () => {
  let originalXdg: string | undefined;

  beforeEach(() => {
    originalXdg = process.env.XDG_RUNTIME_DIR;
  });

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_RUNTIME_DIR;
    } else {
      process.env.XDG_RUNTIME_DIR = originalXdg;
    }
  });

  it("uses XDG_RUNTIME_DIR when set", () => {
    process.env.XDG_RUNTIME_DIR = "/run/user/1000";
    expect(getSocketDir()).toBe("/run/user/1000/pgserve");
  });

  it("falls back to /tmp/pgserve when XDG_RUNTIME_DIR is unset", () => {
    delete process.env.XDG_RUNTIME_DIR;
    expect(getSocketDir()).toBe("/tmp/pgserve");
  });

  it("falls back to /tmp/pgserve when XDG_RUNTIME_DIR is an empty string", () => {
    process.env.XDG_RUNTIME_DIR = "";
    expect(getSocketDir()).toBe("/tmp/pgserve");
  });
});

describe("buildPostgresSocketUrl", () => {
  it("targets the resolved socket dir via host and socket params", () => {
    const previous = process.env.XDG_RUNTIME_DIR;
    process.env.XDG_RUNTIME_DIR = "/run/user/1000";
    try {
      const url = buildPostgresSocketUrl(8432, "myapp");
      expect(url).toContain("host=/run/user/1000/pgserve");
      expect(url).toContain("socket=/run/user/1000/pgserve");
    } finally {
      if (previous === undefined) {
        delete process.env.XDG_RUNTIME_DIR;
      } else {
        process.env.XDG_RUNTIME_DIR = previous;
      }
    }
  });
});
