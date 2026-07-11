export class AuthenticationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have access to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
