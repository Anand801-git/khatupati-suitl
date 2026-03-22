'use client';

import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useAuth } from '@/firebase/provider';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Force clear IndexedDB to prevent client-side caching issues.
    if (typeof window !== 'undefined') {
      console.log("Attempting to clear IndexedDB to resolve caching issues...");
      try {
        const dbDeleteRequest = indexedDB.deleteDatabase('khatupati-store');
        dbDeleteRequest.onsuccess = () => {
          console.log("IndexedDB cleared successfully. Reloading for changes to take effect.");
        };
        dbDeleteRequest.onerror = (err) => console.error("Error clearing IndexedDB:", err);
        dbDeleteRequest.onblocked = () => {
            console.warn("IndexedDB clear was blocked. This can happen if the app is open in other tabs. Please close all other tabs of this app and refresh.");
            alert("The application cache is stuck. Please close all other tabs of this app and refresh this page.");
        };
      } catch (error) {
        console.error("Failed to initiate IndexedDB cleanup:", error);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Force a hard navigation instead of Next.js soft navigation 
        // to prevent App Router caching state issues after auth.
        window.location.href = '/';
      }
    });
    return () => unsubscribe();
  }, [auth]);


  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary">Khatupati Suits</h1>
            <p className="text-muted-foreground">Please sign in to continue</p>
        </div>
      <Button onClick={handleSignIn} size="lg" className="gap-2">
        <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 25.5 170.7 65.4l-64.5 64.5C314.1 94.2 282.1 80 248 80c-82.6 0-150.2 67.5-150.2 150.2S165.4 406.2 248 406.2c48.2 0 81.3-18.3 104.2-39.2 18.9-16.8 30.8-41.5 34.7-72.1H248V261.8h239.2z"></path></svg>
        Sign in with Google
      </Button>
    </div>
  );
}
