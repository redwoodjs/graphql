import { RouteMiddleware } from "rwsdk/router";

const connectSrcOrigins = (): string => {
  const origins = new Set(["'self'"]);

  const addOrigin = (url: string | undefined) => {
    if (!url) {
      return;
    }

    try {
      origins.add(new URL(url).origin);
    } catch {
      // Ignore invalid URLs in CSP construction.
    }
  };

  if (import.meta.env.DEV) {
    origins.add("http://localhost:8911");
  }

  addOrigin(import.meta.env.VITE_GRAPHQL_URL);
  addOrigin(import.meta.env.VITE_AUTH_URL);

  return [...origins].join(" ");
};

export const setCommonHeaders =
  (): RouteMiddleware =>
  ({ response, rw: { nonce } }) => {
    if (!import.meta.env.VITE_IS_DEV_SERVER) {
      // Forces browsers to always use HTTPS for a specified time period (2 years)
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }

    // Forces browser to use the declared content-type instead of trying to guess/sniff it
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Stops browsers from sending the referring webpage URL in HTTP headers
    response.headers.set("Referrer-Policy", "no-referrer");

    // Explicitly disables access to specific browser features/APIs
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Defines trusted sources for content loading and script execution:
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; connect-src ${connectSrcOrigins()}; script-src 'self' 'unsafe-eval' 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'self'; frame-src 'self' https://challenges.cloudflare.com; object-src 'none';`,
    );
  };
