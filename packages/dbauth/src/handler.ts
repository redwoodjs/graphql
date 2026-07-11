import {
  buildSetCookieHeader,
  clearCookieHeader,
  createSessionPayload,
  decryptSession,
  encryptSession,
  parseCookieHeader,
  resolveDbAuthSecret,
} from "./cookie.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { DbAuthHandlerOptions, UserType } from "./types.js";
import { DbAuthError, PasswordValidationError } from "./types.js";

const defaultSessionExpires = 60 * 60 * 24 * 7;
const genericInvalidCredentials = "Invalid username or password";
const genericForgotPasswordMessage =
  "If an account exists for that username, password reset instructions have been sent.";

const sanitizeUser = (user: UserType, allowedUserFields: string[]) => {
  const sanitized: UserType = {};

  for (const field of allowedUserFields) {
    if (field in user) {
      sanitized[field] = user[field];
    }
  }

  return sanitized;
};

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\$\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");

const readJsonBody = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const assertSafeAllowedUserFields = (options: DbAuthHandlerOptions) => {
  const sensitiveFields = new Set([
    options.authFields.hashedPassword,
    options.authFields.resetToken,
    options.authFields.resetTokenExpiresAt,
    options.authFields.salt,
    "hashedPassword",
    "resetToken",
    "resetTokenExpiresAt",
    "salt",
  ]);
  const exposedField = options.allowedUserFields.find((field) => sensitiveFields.has(field));

  if (exposedField) {
    throw new DbAuthError(`Refusing to expose sensitive user field "${exposedField}"`);
  }
};

const getModel = (options: DbAuthHandlerOptions) => {
  const model = options.db[options.authModelAccessor];

  if (!model) {
    throw new DbAuthError(`Missing auth model accessor "${options.authModelAccessor}"`);
  }

  return model;
};

const setSessionCookie = (options: DbAuthHandlerOptions, userId: number) => {
  const secret = resolveDbAuthSecret({ secret: options.secret });
  const maxAge = options.login?.expires ?? defaultSessionExpires;
  const value = encryptSession(createSessionPayload(userId, maxAge), secret);

  return buildSetCookieHeader(options.cookie.name, value, {
    ...options.cookie.attributes,
    MaxAge: maxAge,
  });
};

const getSessionUserId = (request: Request, options: DbAuthHandlerOptions) => {
  const cookieValue = parseCookieHeader(request.headers.get("cookie"), options.cookie.name);

  if (!cookieValue) {
    return null;
  }

  const secret = resolveDbAuthSecret({ secret: options.secret });

  return decryptSession(cookieValue, secret)?.id ?? null;
};

const readUserString = (user: UserType, field: string) => {
  const value = user[field];
  return typeof value === "string" ? value : "";
};

const login = async (request: Request, options: DbAuthHandlerOptions) => {
  const body = await readJsonBody(request);
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors = options.login?.errors ?? {};
  const invalidCredentials = errors.invalidCredentials ?? genericInvalidCredentials;
  const model = getModel(options);
  const { authFields } = options;

  if (!username || !password) {
    return Response.json(
      { error: errors.usernameOrPasswordMissing ?? "Both username and password are required" },
      { status: 400 },
    );
  }

  const user = await model.findUnique({
    where: { [authFields.username]: username },
  });

  if (!user) {
    return Response.json({ error: invalidCredentials }, { status: 401 });
  }

  const salt = readUserString(user, authFields.salt);
  const hashedPassword = readUserString(user, authFields.hashedPassword);

  if (!verifyPassword(password, salt, hashedPassword)) {
    return Response.json({ error: invalidCredentials }, { status: 401 });
  }

  const loggedInUser = (await options.login?.handler?.(user)) ?? user;
  const userId = Number(loggedInUser[authFields.id]);

  return Response.json(sanitizeUser(loggedInUser, options.allowedUserFields), {
    headers: {
      "Set-Cookie": setSessionCookie(options, userId),
    },
  });
};

const logout = async (_request: Request, options: DbAuthHandlerOptions) =>
  Response.json(
    { message: "Logged out" },
    {
      headers: {
        "Set-Cookie": clearCookieHeader(options.cookie.name, options.cookie.attributes),
      },
    },
  );

const signup = async (request: Request, options: DbAuthHandlerOptions) => {
  if (!options.signup) {
    return Response.json({ error: "Signup is not enabled" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors = options.signup.errors ?? {};
  const model = getModel(options);
  const { authFields } = options;

  if (!username) {
    return Response.json(
      { error: interpolate(errors.fieldMissing ?? "${field} is required", { field: "username" }) },
      { status: 400 },
    );
  }

  if (!password) {
    return Response.json(
      { error: interpolate(errors.fieldMissing ?? "${field} is required", { field: "password" }) },
      { status: 400 },
    );
  }

  const existingUser = await model.findUnique({
    where: { [authFields.username]: username },
  });

  if (existingUser) {
    return Response.json(
      {
        error: interpolate(errors.usernameTaken ?? "Username `${username}` already in use", {
          username,
        }),
      },
      { status: 400 },
    );
  }

  try {
    if (options.signup.passwordValidation && !options.signup.passwordValidation(password)) {
      throw new PasswordValidationError("Invalid password");
    }
  } catch (error) {
    if (error instanceof PasswordValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  const { hashedPassword, salt } = hashPassword(password);
  const userAttributes = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== "username" && key !== "password"),
  );

  try {
    const createdUser = await options.signup.handler({
      hashedPassword,
      salt,
      userAttributes,
      username,
    });
    const userId = Number(createdUser[authFields.id]);

    return Response.json(sanitizeUser(createdUser, options.allowedUserFields), {
      headers: {
        "Set-Cookie": setSessionCookie(options, userId),
      },
    });
  } catch (error) {
    if (error instanceof DbAuthError) {
      throw error;
    }

    if (error instanceof Error) {
      return Response.json({ error: "Unable to create account" }, { status: 400 });
    }

    throw error;
  }
};

const forgotPassword = async (request: Request, options: DbAuthHandlerOptions) => {
  const body = await readJsonBody(request);
  const username = typeof body.username === "string" ? body.username : "";
  const errors = options.forgotPassword?.errors ?? {};
  const model = getModel(options);
  const { authFields } = options;

  if (!username) {
    return Response.json(
      { error: errors.usernameRequired ?? "Username is required" },
      { status: 400 },
    );
  }

  if (!options.forgotPassword?.handler) {
    return Response.json({ error: "Forgot password handler is not configured" }, { status: 500 });
  }

  const user = await model.findUnique({
    where: { [authFields.username]: username },
  });

  if (!user) {
    return Response.json({ message: genericForgotPasswordMessage });
  }

  const resetToken = crypto.randomUUID();
  const resetTokenExpiresAt = new Date(
    Date.now() + (options.forgotPassword?.expires ?? 60 * 60 * 24) * 1000,
  );

  const updatedUser = await model.update({
    data: {
      [authFields.resetToken]: resetToken,
      [authFields.resetTokenExpiresAt]: resetTokenExpiresAt,
    },
    where: { [authFields.id]: user[authFields.id] },
  });

  const response = await options.forgotPassword.handler(updatedUser, resetToken);

  return Response.json(response ?? { message: genericForgotPasswordMessage });
};

const resetPassword = async (request: Request, options: DbAuthHandlerOptions) => {
  const body = await readJsonBody(request);
  const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors = options.resetPassword?.errors ?? {};
  const model = getModel(options);
  const { authFields } = options;

  if (!resetToken) {
    return Response.json(
      { error: errors.resetTokenRequired ?? "resetToken is required" },
      { status: 400 },
    );
  }

  const user = await model.findFirst({
    where: { [authFields.resetToken]: resetToken },
  });

  if (!user) {
    return Response.json(
      { error: errors.resetTokenInvalid ?? "resetToken is invalid" },
      { status: 400 },
    );
  }

  const expiresAt = user[authFields.resetTokenExpiresAt];

  if (
    expiresAt instanceof Date
      ? expiresAt.getTime() < Date.now()
      : typeof expiresAt === "string"
        ? new Date(expiresAt).getTime() < Date.now()
        : true
  ) {
    return Response.json(
      { error: errors.resetTokenExpired ?? "resetToken is expired" },
      { status: 400 },
    );
  }

  const salt = readUserString(user, authFields.salt);
  const hashedPassword = readUserString(user, authFields.hashedPassword);

  if (
    options.resetPassword?.allowReusedPassword === false &&
    verifyPassword(password, salt, hashedPassword)
  ) {
    return Response.json(
      { error: errors.reusedPassword ?? "Must choose a new password" },
      { status: 400 },
    );
  }

  const nextPassword = hashPassword(password);
  const updatedUser = await model.update({
    data: {
      [authFields.hashedPassword]: nextPassword.hashedPassword,
      [authFields.resetToken]: null,
      [authFields.resetTokenExpiresAt]: null,
      [authFields.salt]: nextPassword.salt,
    },
    where: { [authFields.id]: user[authFields.id] },
  });

  const shouldLogin = (await options.resetPassword?.handler?.(updatedUser)) ?? true;
  const headers: Record<string, string> = {};

  if (shouldLogin) {
    headers["Set-Cookie"] = setSessionCookie(options, Number(updatedUser[authFields.id]));
  }

  return Response.json(sanitizeUser(updatedUser, options.allowedUserFields), { headers });
};

const validateResetToken = async (request: Request, options: DbAuthHandlerOptions) => {
  const url = new URL(request.url);
  const resetToken = url.searchParams.get("resetToken") ?? "";

  if (!resetToken) {
    return Response.json(
      { error: options.resetPassword?.errors?.resetTokenRequired ?? "resetToken is required" },
      { status: 400 },
    );
  }

  const model = getModel(options);
  const { authFields } = options;
  const user = await model.findFirst({
    where: { [authFields.resetToken]: resetToken },
  });

  if (!user) {
    return Response.json(
      { error: options.resetPassword?.errors?.resetTokenInvalid ?? "resetToken is invalid" },
      { status: 400 },
    );
  }

  const expiresAt = user[authFields.resetTokenExpiresAt];

  if (
    expiresAt instanceof Date
      ? expiresAt.getTime() < Date.now()
      : typeof expiresAt === "string"
        ? new Date(expiresAt).getTime() < Date.now()
        : true
  ) {
    return Response.json(
      { error: options.resetPassword?.errors?.resetTokenExpired ?? "resetToken is expired" },
      { status: 400 },
    );
  }

  return Response.json({});
};

const getToken = async (request: Request, options: DbAuthHandlerOptions) => {
  const userId = getSessionUserId(request, options);

  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const model = getModel(options);
  const user = await model.findUnique({
    where: { [options.authFields.id]: userId },
  });

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  return Response.json(sanitizeUser(user, options.allowedUserFields));
};

export const handleDbAuthRequest = async (
  request: Request,
  options: DbAuthHandlerOptions,
): Promise<Response> => {
  const url = new URL(request.url);
  const method = url.searchParams.get("method");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  assertSafeAllowedUserFields(options);

  switch (method) {
    case "login":
      return login(request, options);
    case "logout":
      return logout(request, options);
    case "signup":
      return signup(request, options);
    case "forgotPassword":
      return forgotPassword(request, options);
    case "resetPassword":
      return resetPassword(request, options);
    case "validateResetToken":
      return validateResetToken(request, options);
    case "getToken":
      return getToken(request, options);
    default:
      return Response.json({ error: "Unknown auth method" }, { status: 400 });
  }
};
