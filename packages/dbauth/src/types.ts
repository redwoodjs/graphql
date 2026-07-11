export type UserType = Record<string, unknown>;

type MaybePromise<T> = T | Promise<T>;

export type DbAuthModel = {
  create(args: { data: Record<string, unknown> }): Promise<UserType>;
  findFirst(args: { where: Record<string, unknown> }): Promise<UserType | null>;
  findUnique(args: { where: Record<string, unknown> }): Promise<UserType | null>;
  update(args: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<UserType>;
};

export type DbAuthDb = Record<string, DbAuthModel>;

export type DbAuthFields = {
  hashedPassword: string;
  id: string;
  resetToken: string;
  resetTokenExpiresAt: string;
  salt: string;
  username: string;
};

export type DbAuthCookieOptions = {
  attributes: Record<string, boolean | number | string>;
  name: string;
};

export type DbAuthHandlerOptions<TUser extends UserType = UserType, TAttributes = UserType> = {
  allowedUserFields: string[];
  authFields: DbAuthFields;
  authModelAccessor: string;
  cookie: DbAuthCookieOptions;
  db: DbAuthDb;
  forgotPassword?: {
    errors?: {
      usernameNotFound?: string;
      usernameRequired?: string;
    };
    expires?: number;
    handler?: (user: UserType, resetToken: string) => MaybePromise<Record<string, unknown> | void>;
  };
  login?: {
    errors?: {
      incorrectPassword?: string;
      invalidCredentials?: string;
      usernameNotFound?: string;
      usernameOrPasswordMissing?: string;
    };
    expires?: number;
    handler?: (user: TUser) => MaybePromise<TUser>;
  };
  resetPassword?: {
    allowReusedPassword?: boolean;
    errors?: {
      resetTokenExpired?: string;
      resetTokenInvalid?: string;
      resetTokenRequired?: string;
      reusedPassword?: string;
    };
    handler?: (user: TUser) => MaybePromise<boolean>;
  };
  secret?: string;
  signup?: {
    errors?: {
      fieldMissing?: string;
      usernameTaken?: string;
    };
    handler: (args: {
      hashedPassword: string;
      salt: string;
      userAttributes: TAttributes;
      username: string;
    }) => MaybePromise<TUser>;
    passwordValidation?: (password: string) => boolean;
  };
};

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordValidationError";
  }
}

export class DbAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbAuthError";
  }
}
