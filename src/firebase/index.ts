'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

// Guard flag - persistence can only be enabled once per Firestore instance
let persistenceEnabled = false;

export function initializeFirebase(): {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  // Check for valid config before initialization to prevent cryptic Auth errors
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === '') {
    const errorMsg = 'Firebase API Key is missing. Please check your environment variables (NEXT_PUBLIC_FIREBASE_API_KEY).';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);

  // Enable offline persistence only once (guard against React 18 double-invoke)
  if (typeof window !== 'undefined' && !persistenceEnabled) {
    persistenceEnabled = true;
    enableIndexedDbPersistence(firestore).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence: multiple tabs open, persistence only works in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence: not supported in this browser.');
      } else {
        console.warn('Firestore persistence error:', err.code);
      }
    });
  }

  const auth = getAuth(app);

  return { app, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
