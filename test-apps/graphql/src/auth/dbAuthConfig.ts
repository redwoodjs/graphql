import { db } from "db";
import type { DbAuthHandlerOptions } from "@rwgql/dbauth/server";

import { cookieName } from "./auth.ts";

const oneDay = 60 * 60 * 24;
const invalidCredentials = "Invalid username or password";
const forgotPasswordMessage =
  "If an account exists for that email, password reset instructions have been sent.";

const productionCookieAttributes = (): Record<string, boolean | number | string> => {
  const attributes: Record<string, boolean | number | string> = {
    HttpOnly: true,
    Path: "/",
    SameSite: process.env.DB_AUTH_COOKIE_SAMESITE === "None" ? "None" : "Lax",
    Secure: process.env.NODE_ENV === "production",
  };

  const domain = process.env.DB_AUTH_COOKIE_DOMAIN?.trim();
  if (domain) {
    attributes.Domain = domain;
  }

  return attributes;
};

const validatePassword = (password: string) => {
  if (password.length < 12) {
    return false;
  }

  const characterClasses = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((pattern) =>
    pattern.test(password),
  );

  return characterClasses.length >= 3;
};

export const dbAuthOptions: DbAuthHandlerOptions = {
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
    attributes: productionCookieAttributes(),
    name: cookieName,
  },
  db: db as unknown as DbAuthHandlerOptions["db"],
  forgotPassword: {
    errors: {
      usernameNotFound: forgotPasswordMessage,
      usernameRequired: "Email is required",
    },
    expires: oneDay,
    handler: (user, resetToken) => {
      if (process.env.NODE_ENV !== "production") {
        console.info("Development password reset token", {
          email: user.email,
          resetToken,
        });
      }

      // Production: generic response only until transactional email is wired.
      return { message: forgotPasswordMessage };
    },
  },
  login: {
    errors: {
      incorrectPassword: invalidCredentials,
      invalidCredentials,
      usernameNotFound: invalidCredentials,
      usernameOrPasswordMissing: invalidCredentials,
    },
    expires: oneDay * 7,
    handler: (user) => user,
  },
  resetPassword: {
    allowReusedPassword: false,
    errors: {
      resetTokenExpired: "resetToken is expired",
      resetTokenInvalid: "resetToken is invalid",
      resetTokenRequired: "resetToken is required",
      reusedPassword: "Must choose a new password",
    },
    handler: () => true,
  },
  signup: {
    errors: {
      fieldMissing: "${field} is required",
      usernameTaken: "Username `${username}` already in use",
    },
    handler: ({ hashedPassword, salt, userAttributes, username }) =>
      db.user.create({
        data: {
          email: username,
          fullName:
            typeof userAttributes["full-name"] === "string" ? userAttributes["full-name"] : "",
          hashedPassword,
          salt,
        },
      }),
    passwordValidation: validatePassword,
  },
  secret: process.env.DB_AUTH_SECRET,
};
