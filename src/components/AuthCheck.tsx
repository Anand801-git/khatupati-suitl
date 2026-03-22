
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/firebase/provider';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

/**
 * AuthCheck ensures that the application is only accessible to authenticated users.
 * It prevents children (including the data-providing KhatupatiProvider) from 
 * mounting until a valid user session is detected.
 * 
 * Note: Verification routes (/verify/*) are intentionally left public.
 */
export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setInitializing(false);
      
      // Redirect to login if not authenticated and not already on the login page or verify route
      if (!authUser && pathname !== '/login' && !pathname.startsWith('/verify')) {
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [auth, router, pathname]);

  // Allow verify routes to bypass auth check entirely for public traceability
  if (pathname.startsWith('/verify')) {
    return <>{children}</>;
  }

  // Show a loading screen while checking auth status
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Verifying Identity...
        </p>
      </div>
    );
  }

  // Allow unrestricted access to the login page itself
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If we have no user and aren't on the login page, we're in the middle of a redirect
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Redirecting to Login...
        </p>
      </div>
    );
  }

  // User is authenticated, render the protected application
  return <>{children}</>;
}
