import type { APIGatewayProxyEvent, Context as LambdaContext } from 'aws-lambda'

import type { SupportedAuthTypes } from '@redwoodjs/auth'

import { auth0 } from './auth0'
import { azureActiveDirectory } from './azureActiveDirectory'
import { clerk } from './clerk'
import { custom } from './custom'
import { dbAuth } from './dbAuth'
import { ethereum } from './ethereum'
import { firebase } from './firebase'
import { magicLink } from './magicLink'
import { netlify } from './netlify'
import { nhost } from './nhost'
import { supabase } from './supabase'

interface Req {
  event: APIGatewayProxyEvent
  context: LambdaContext
}

type Decoded = null | string | Record<string, unknown>

const typesToDecoders: Record<
  SupportedAuthTypes,
  | ((token: string) => Decoded | Promise<Decoded>)
  | ((token: string, req: Req) => Decoded | Promise<Decoded>)
> = {
  auth0: auth0,
  azureActiveDirectory: azureActiveDirectory,
  clerk,
  netlify: netlify,
  nhost: nhost,
  goTrue: netlify,
  magicLink: magicLink,
  firebase: firebase,
  supabase: supabase,
  ethereum: ethereum,
  dbAuth: dbAuth,
  custom: custom,
}

export const decodeToken = async (
  type: SupportedAuthTypes,
  token: string,
  req: Req
): Promise<Decoded> => {
  if (!typesToDecoders[type]) {
    // Make this a warning, instead of a hard error
    // Allow users to have multiple custom types if they choose to
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `The auth type "${type}" is not officially supported, we currently support: ${Object.keys(
          typesToDecoders
        ).join(', ')}`
      )

      console.error(
        'Please ensure you have handlers for your custom auth in getCurrentUser in src/lib/auth.{js,ts}'
      )
    }

    throw new Error(
      'The auth type "${type}" is not officially supported, we currently support'
    )
  }

  const decoder = typesToDecoders[type]

  const decodedToken = decoder(token, req)

  if (!decodedToken) {
    throw new Error('Error decoding token for auth type "${type}".')
  }

  return decodedToken
}
