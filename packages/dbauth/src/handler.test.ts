import { describe, expect, it } from "vite-plus/test";

import { handleDbAuthRequest } from "./handler.js";
import { hashPassword } from "./password.js";
import type { DbAuthHandlerOptions } from "./types.js";

const createMockDb = () => {
  const password = hashPassword("password");
  const users = new Map<number, Record<string, unknown>>([
    [
      1,
      {
        email: "ada@example.com",
        fullName: "Ada Lovelace",
        hashedPassword: password.hashedPassword,
        id: 1,
        resetToken: "reset-token",
        resetTokenExpiresAt: new Date(Date.now() + 60_000),
        roles: "ADMIN",
        salt: password.salt,
      },
    ],
  ]);

  return {
    user: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const id = users.size + 1;
        const user = { ...data, id };
        users.set(id, user);
        return user;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        [...users.values()].find((user) =>
          Object.entries(where).every(([key, value]) => user[key] === value),
        ) ?? null,
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        if ("id" in where) {
          return users.get(Number(where.id)) ?? null;
        }

        return (
          [...users.values()].find((user) =>
            Object.entries(where).every(([key, value]) => user[key] === value),
          ) ?? null
        );
      },
      update: async ({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) => {
        const user = users.get(Number(where.id));

        if (!user) {
          throw new Error("User not found");
        }

        const updated = { ...user, ...data };
        users.set(Number(where.id), updated);
        return updated;
      },
    },
  };
};

const createOptions = (): DbAuthHandlerOptions => ({
  allowedUserFields: ["email", "id", "roles"],
  authFields: {
    hashedPassword: "hashedPassword",
    id: "id",
    resetToken: "resetToken",
    resetTokenExpiresAt: "resetTokenExpiresAt",
    salt: "salt",
    username: "email",
  },
  authModelAccessor: "user",
  cookie: {
    attributes: {
      HttpOnly: true,
      Path: "/",
      SameSite: "Lax",
    },
    name: "session_test",
  },
  db: createMockDb(),
  login: {
    errors: {
      invalidCredentials: "Invalid username or password",
    },
    handler: (user) => user,
  },
  secret: "test-secret",
  signup: {
    handler: ({ hashedPassword, salt, userAttributes, username }) => ({
      email: username,
      fullName: typeof userAttributes["full-name"] === "string" ? userAttributes["full-name"] : "",
      hashedPassword,
      id: 2,
      roles: "USER",
      salt,
    }),
  },
});

describe("handleDbAuthRequest", () => {
  it("logs in with valid credentials and sets a session cookie", async () => {
    const response = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=login", {
        body: JSON.stringify({ password: "password", username: "ada@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createOptions(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("session_test=");
  });

  it("rejects invalid credentials", async () => {
    const response = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=login", {
        body: JSON.stringify({ password: "wrong", username: "ada@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createOptions(),
    );

    expect(response.status).toBe(401);
  });

  it("uses the same error for unknown users and wrong passwords", async () => {
    const options = createOptions();
    const unknownUser = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=login", {
        body: JSON.stringify({ password: "password", username: "unknown@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      options,
    );
    const wrongPassword = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=login", {
        body: JSON.stringify({ password: "wrong", username: "ada@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      options,
    );

    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(await unknownUser.json()).toEqual(await wrongPassword.json());
  });

  it("returns a generic forgot-password response for unknown users", async () => {
    const options = createOptions();
    options.forgotPassword = {
      handler: () => ({ message: "sent" }),
    };

    const response = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=forgotPassword", {
        body: JSON.stringify({ username: "unknown@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      options,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("message");
  });

  it("requires a forgot-password delivery handler", async () => {
    const response = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=forgotPassword", {
        body: JSON.stringify({ username: "ada@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      createOptions(),
    );

    expect(response.status).toBe(500);
  });

  it("passes reset tokens to the forgot-password handler", async () => {
    let deliveredToken = "";
    const options = createOptions();
    options.forgotPassword = {
      handler: (_user, resetToken) => {
        deliveredToken = resetToken;
        return { message: "sent" };
      },
    };

    const response = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=forgotPassword", {
        body: JSON.stringify({ username: "ada@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      options,
    );

    expect(response.status).toBe(200);
    expect(deliveredToken).not.toBe("");
  });

  it("rejects sensitive allowed user fields", async () => {
    const options = createOptions();
    options.allowedUserFields = ["email", "salt"];

    await expect(
      handleDbAuthRequest(
        new Request("http://localhost/auth?method=getToken", {
          method: "POST",
        }),
        options,
      ),
    ).rejects.toThrow('Refusing to expose sensitive user field "salt"');
  });

  it("rejects reused reset passwords when configured", async () => {
    const options = createOptions();
    options.resetPassword = {
      allowReusedPassword: false,
      errors: {
        reusedPassword: "Must choose a new password",
      },
    };

    const response = await handleDbAuthRequest(
      new Request("http://localhost/auth?method=resetPassword", {
        body: JSON.stringify({ password: "password", resetToken: "reset-token" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      options,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Must choose a new password" });
  });
});
