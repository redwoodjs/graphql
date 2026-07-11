export { createAuthDecoder } from "./decoder.js";
export { registerDbAuthRoutes } from "./fastify.js";
export { handleDbAuthRequest } from "./handler.js";
export { hashPassword, verifyPassword } from "./password.js";
export type { DbAuthHandlerOptions, DbAuthFields, UserType } from "./types.js";
export { DbAuthError, PasswordValidationError } from "./types.js";
