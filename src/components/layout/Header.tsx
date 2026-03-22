'use client';

import Link from 'next/link';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import { useFirebase } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header({ title, className, greeting, subtitle }: { title: string, className?: string, greeting?: string, subtitle?: ReactNode }) {
  const { auth, user } = useFirebase();

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <header className={`sticky top-0 z-40 w-full no-print transition-all duration-300 ${className}`}>
      <div 
        className="container flex h-24 items-center justify-between px-6 rounded-b-3xl shadow-lg"
        style={{ color: `var(--header-text-color, #000)` }}
      >
        <div className="flex flex-col gap-0.5">
          {greeting && <p className="text-xs font-bold uppercase tracking-widest opacity-80">{greeting}</p>}
          <h1 className="text-2xl font-headline font-black tracking-tight text-inherit truncate max-w-[200px] sm:max-w-none">
            {title}
          </h1>
          {subtitle && <div className="text-xs font-medium opacity-90 mt-1">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
            {user && (
                <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                        <AvatarFallback>{user.displayName ? user.displayName.charAt(0) : 'U'}</AvatarFallback>
                    </Avatar>
                    <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            )}
          <Link href="/">
            <Button 
              variant="ghost"
              size="icon"
              title="Dashboard"
              className="bg-white/20 hover:bg-white/30 text-inherit rounded-full"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
