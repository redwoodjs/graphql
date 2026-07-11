import { initializeApp, getApp, getApps } from 'firebase/app'
import * as firebaseAuth from 'firebase/auth'

import { createAuth } from '@redwoodjs/auth-firebase-web'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,

  // Optional config, may be needed, depending on how you use firebase
  // projectId: process.env.FIREBASE_PROJECT_ID,
  // storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  // appId: process.env.FIREBASE_APP_ID,
}

const firebaseApp = ((config) => {
  const apps = getApps()

  if (!apps.length) {
    initializeApp(config)
  }

  return getApp()
})(firebaseConfig)

export const firebaseClient = {
  firebaseAuth,
  firebaseApp, // optional
}

export const { AuthProvider, useAuth } = createAuth(firebaseClient)
