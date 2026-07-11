"use client";

import { createAuthentication } from "@rwgql/auth";
import { createDbAuthClient } from "@rwgql/dbauth/web";

const client = createDbAuthClient({
  authUrl: import.meta.env.VITE_AUTH_URL ?? "http://localhost:8911/auth",
});

export const { AuthProvider, useAuth } = createAuthentication(client);
