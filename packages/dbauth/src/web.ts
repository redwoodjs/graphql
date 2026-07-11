import type { AuthClient, AuthResponse } from "@rwgql/auth";

type DbAuthClientOptions = {
  authUrl?: string;
  fetch?: typeof fetch;
};

const defaultAuthUrl = "http://localhost:8911/auth";

const readJson = async (response: Response): Promise<AuthResponse> => {
  try {
    return (await response.json()) as AuthResponse;
  } catch {
    return { error: "Unexpected auth response" };
  }
};

export const createDbAuthClient = ({
  authUrl = defaultAuthUrl,
  fetch: fetchImpl = fetch,
}: DbAuthClientOptions = {}): AuthClient => {
  const callAuth = async (method: string, body?: Record<string, unknown>) => {
    const response = await fetchImpl(`${authUrl}?method=${method}`, {
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      headers: body ? { "content-type": "application/json" } : undefined,
      method: "POST",
    });

    return readJson(response);
  };

  return {
    forgotPassword: (username) => callAuth("forgotPassword", { username }),
    getToken: async () => {
      const response = await fetchImpl(`${authUrl}?method=getToken`, {
        credentials: "include",
        method: "POST",
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return JSON.stringify(payload);
    },
    getUserMetadata: async () => {
      const response = await fetchImpl(`${authUrl}?method=getToken`, {
        credentials: "include",
        method: "POST",
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as Record<string, unknown>;
    },
    login: (options) => callAuth("login", options),
    logout: async () => {
      await callAuth("logout");
    },
    resetPassword: (options) => callAuth("resetPassword", options),
    signup: (options) => callAuth("signup", options),
    validateResetToken: async (resetToken) => {
      const response = await fetchImpl(
        `${authUrl}?method=validateResetToken&resetToken=${encodeURIComponent(resetToken)}`,
        {
          credentials: "include",
          method: "POST",
        },
      );

      return readJson(response);
    },
  };
};
