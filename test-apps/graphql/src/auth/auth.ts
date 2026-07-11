import { db } from "db";

import { AuthenticationError, ForbiddenError, hasRoleForUser } from "@rwgql/auth/graphql";

export const cookieName = "session_8911";

export type CurrentUser = {
  readonly email: string;
  readonly id: number;
  readonly roles: string | null;
};

export type AuthContext = {
  readonly currentUser?: CurrentUser | null;
};

type AllowedRoles = string | string[] | undefined;

type Session = {
  readonly id: number;
};

export const getCurrentUser = async (session: Session): Promise<CurrentUser | null> => {
  if (!session || typeof session.id !== "number") {
    return null;
  }

  return db.user.findUnique({
    select: { email: true, id: true, roles: true },
    where: { id: session.id },
  });
};

export const isAuthenticated = (context: AuthContext): boolean => !!context.currentUser;

export const hasRole = (context: AuthContext, roles: AllowedRoles): boolean =>
  hasRoleForUser(context.currentUser ?? null, roles);

export const requireAuth = (context: AuthContext, { roles }: { roles?: AllowedRoles } = {}) => {
  if (!isAuthenticated(context)) {
    throw new AuthenticationError("You don't have permission to do that.");
  }

  if (roles && !hasRole(context, roles)) {
    throw new ForbiddenError("You don't have access to do that.");
  }
};

export const skipAuth = (_context: AuthContext) => undefined;

export { AuthenticationError, ForbiddenError };
