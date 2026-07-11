import { decryptSession, parseCookieHeader, resolveDbAuthSecret } from "./cookie.js";

export const createAuthDecoder = ({
  cookieName,
  secret,
}: {
  cookieName: string;
  secret?: string;
}) => {
  const resolvedSecret = resolveDbAuthSecret({ secret });

  return (request: Request): { id: number } | null => {
    const cookieValue = parseCookieHeader(request.headers.get("cookie"), cookieName);

    if (!cookieValue) {
      return null;
    }

    const session = decryptSession(cookieValue, resolvedSecret);

    if (!session) {
      return null;
    }

    return { id: session.id };
  };
};
