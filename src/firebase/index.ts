'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export function initializeFirebase(): {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  // Check for valid config before initialization to prevent cryptic Auth errors
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === '') {
    const errorMsg = 'Firebase API Key is missing. Please check your environment variables (NEXT_PUBLIC_FIREBASE_API_KEY).';
    console.error(errorMsg);
    // We throw here to provide a clear stack trace and message in the Next.js error overlay
    throw new Error(errorMsg);
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  return { app, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
