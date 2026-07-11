export const hasRoleForUser = (
  currentUser: Record<string, unknown> | null,
  roles: string | string[] | undefined,
): boolean => {
  if (!currentUser) {
    return false;
  }

  if (roles === undefined) {
    return true;
  }

  const currentUserRoles = currentUser.roles as string | string[] | undefined;

  if (typeof roles === "string") {
    if (typeof currentUserRoles === "string") {
      return currentUserRoles.split(",").includes(roles);
    }

    if (Array.isArray(currentUserRoles)) {
      return currentUserRoles.some((allowedRole) => roles === allowedRole);
    }
  }

  if (Array.isArray(roles)) {
    if (Array.isArray(currentUserRoles)) {
      return currentUserRoles.some((allowedRole) => roles.includes(allowedRole));
    }

    if (typeof currentUserRoles === "string") {
      return roles.some((allowedRole) => currentUserRoles.split(",").includes(allowedRole));
    }
  }

  return false;
};
