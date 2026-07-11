import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const DEFAULT_DB_AUTH_SECRET = "dev-only-dbauth-secret-change-in-production";

const deriveKey = (secret: string) => createHash("sha256").update(secret).digest();

export type ResolveDbAuthSecretOptions = {
  readonly env?: Record<string, string | undefined>;
  readonly isProduction?: boolean;
  readonly secret?: string;
};

export type SessionPayload = {
  readonly exp: number;
  readonly id: number;
  readonly iat: number;
};

const getProcessEnv = (): Record<string, string | undefined> =>
  typeof process === "undefined" ? {} : process.env;

export const resolveDbAuthSecret = ({
  env = getProcessEnv(),
  isProduction = env.NODE_ENV === "production",
  secret,
}: ResolveDbAuthSecretOptions = {}) => {
  const resolvedSecret = secret || env.DB_AUTH_SECRET || DEFAULT_DB_AUTH_SECRET;

  if (isProduction && resolvedSecret === DEFAULT_DB_AUTH_SECRET) {
    throw new Error(
      "DB_AUTH_SECRET must be set to a strong non-default value before using dbAuth in production.",
    );
  }

  return resolvedSecret;
};

export const createSessionPayload = (
  id: number,
  expiresInSeconds: number,
  now = Date.now(),
): SessionPayload => {
  const iat = Math.floor(now / 1000);

  return {
    exp: iat + expiresInSeconds,
    id,
    iat,
  };
};

export const encryptSession = (payload: SessionPayload, secret: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
};

export const decryptSession = (
  value: string,
  secret: string,
  now = Date.now(),
): SessionPayload | null => {
  try {
    const buffer = Buffer.from(value, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      "utf8",
    );

    const payload = JSON.parse(decrypted) as SessionPayload;
    const currentTime = Math.floor(now / 1000);

    if (
      typeof payload.id !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp <= currentTime
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const parseCookieHeader = (cookieHeader: string | null, cookieName: string) => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
};

export const buildSetCookieHeader = (
  cookieName: string,
  value: string,
  attributes: Record<string, boolean | number | string>,
) => {
  const parts = [`${cookieName}=${encodeURIComponent(value)}`];

  for (const [key, attributeValue] of Object.entries(attributes)) {
    if (attributeValue === true) {
      parts.push(key);
      continue;
    }

    if (attributeValue === false || attributeValue === "") {
      continue;
    }

    parts.push(`${key}=${attributeValue}`);
  }

  return parts.join("; ");
};

export const clearCookieHeader = (
  cookieName: string,
  attributes: Record<string, boolean | number | string>,
) =>
  buildSetCookieHeader(cookieName, "", {
    ...attributes,
    Expires: "Thu, 01 Jan 1970 00:00:00 GMT",
    MaxAge: 0,
  });
