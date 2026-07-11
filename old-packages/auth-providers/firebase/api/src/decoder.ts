import admin from 'firebase-admin'
import type { FirebaseError } from 'firebase-admin'

import type { Decoder } from '@redwoodjs/api'

// Alternative third-party JWT verification process described here:
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
export const authDecoder: Decoder = async (token: string, type: string) => {
  if (type !== 'firebase') {
    return null
  }

  try {
    return admin.auth().verifyIdToken(token)
  } catch (error) {
    const firebaseError = error as FirebaseError

    if (firebaseError.code === 'app/no-app') {
      const message = [
        '',
        '👉 Heads up',
        '',
        "The firebase app that the auth decoder is using wasn't initialized, which usually means that you have two different versions of firebase-admin.",
        'Make sure that you only have one version of firebase-admin: `yarn why firebase-admin`',
        '',
      ].join('\n')

      firebaseError.message = `${firebaseError.message}\n${message}`
    }

    throw error
  }
}
