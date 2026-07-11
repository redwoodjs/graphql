import netlifyIdentity from 'netlify-identity-widget'

import { createAuth } from '@redwoodjs/auth-netlify-web'
import { isBrowser } from '@redwoodjs/prerender/browserUtils'

isBrowser && netlifyIdentity.init()

export const { AuthProvider, useAuth } = createAuth(netlifyIdentity)
