"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { hasRoleForUser } from "./hasRole.js";
import type { AuthClient, AuthResponse, UseAuth } from "./types.js";

type AuthContextValue = UseAuth;

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultValidateResetToken = async (_token: string): Promise<AuthResponse> => ({});

let cachedCurrentUser: Record<string, unknown> | null | undefined;

export const createAuthentication = (client: AuthClient) => {
  const AuthProvider = ({ children }: { readonly children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(
      () => cachedCurrentUser ?? null,
    );
    const [loading, setLoading] = useState(() => cachedCurrentUser === undefined);

    const loadUser = useCallback(async () => {
      if (cachedCurrentUser === undefined) {
        setLoading(true);
      }

      try {
        const metadata = await client.getUserMetadata();
        cachedCurrentUser = metadata;
        setCurrentUser(metadata);
      } catch {
        cachedCurrentUser = null;
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      void loadUser();
    }, [loadUser]);

    const logOut = useCallback(() => {
      void client.logout().finally(() => {
        cachedCurrentUser = null;
        setCurrentUser(null);
      });
    }, []);

    const reauthenticate = useCallback(async () => {
      await loadUser();
    }, [loadUser]);

    const value = useMemo<AuthContextValue>(
      () => ({
        currentUser,
        forgotPassword: client.forgotPassword.bind(client),
        getToken: client.getToken.bind(client),
        hasRole: (role) => hasRoleForUser(currentUser, role),
        isAuthenticated: currentUser !== null,
        loading,
        logIn: async (options) => {
          const response = await client.login(options);

          if (!response.error) {
            await loadUser();
          }

          return response;
        },
        logOut,
        reauthenticate,
        resetPassword: async (options) => {
          const response = await client.resetPassword(options);

          if (!response.error) {
            await loadUser();
          }

          return response;
        },
        signUp: async (options) => {
          const response = await client.signup(options);

          if (!response.error) {
            await loadUser();
          }

          return response;
        },
        validateResetToken: client.validateResetToken?.bind(client) ?? defaultValidateResetToken,
      }),
      [client, currentUser, loadUser, loading, logOut, reauthenticate],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  const useAuth = (): UseAuth => {
    const context = useContext(AuthContext);

    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
  };

  return { AuthProvider, useAuth };
};
