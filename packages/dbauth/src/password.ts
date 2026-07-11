import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const hashPassword = (password: string, salt = randomBytes(32).toString("hex")) => {
  const hashedPassword = scryptSync(password, salt, 32).toString("hex");

  return { hashedPassword, salt };
};

export const verifyPassword = (password: string, salt: string, hashedPassword: string) => {
  const hash = scryptSync(password, salt, 32).toString("hex");
  const hashBuffer = Buffer.from(hash, "hex");
  const storedBuffer = Buffer.from(hashedPassword, "hex");

  if (hashBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, storedBuffer);
};
