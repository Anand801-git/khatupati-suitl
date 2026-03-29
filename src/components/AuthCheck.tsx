'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { value } = await Preferences.get({ key: 'auth_pin_verified' });
        const isVerified = value === 'true';
        
        setIsAuthenticated(isVerified);
        
        if (!isVerified && pathname !== '/login') {
          router.push('/login');
        } else if (isVerified && pathname === '/login') {
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking auth', err);
      } finally {
        setInitializing(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Starting Engine...
        </p>
      </div>
    );
  }

  // Restricting normal pages if not verified
  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
