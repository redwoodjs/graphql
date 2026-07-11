import { Auth0Client } from '@auth0/auth0-spa-js'

import { createAuth } from '@redwoodjs/auth-auth0-web'

const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || '',
  client_id: process.env.AUTH0_CLIENT_ID || '',
  redirect_uri: process.env.AUTH0_REDIRECT_URI,

  // Storing tokens in the browser's local storage provides persistence across page refreshes and browser tabs.
  // But if an attacker can run JavaScript in your SPA using a cross-site scripting (XSS) attack,
  // they can retrieve the tokens stored in local storage.
  // See https://auth0.com/docs/libraries/auth0-spa-js#change-storage-options.
  cacheLocation: 'localstorage',
  audience: process.env.AUTH0_AUDIENCE,

  // `useRefreshTokens` is required for automatically extending sessions beyond what's set in the initial JWT expiration.
  // See https://auth0.com/docs/tokens/refresh-tokens.
  // useRefreshTokens: true,
})

export const { AuthProvider, useAuth } = createAuth(auth0)
