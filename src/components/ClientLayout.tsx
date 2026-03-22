'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const FirebaseClientProvider = dynamic(() => import('@/firebase/client-provider').then(m => m.FirebaseClientProvider), { ssr: false });
const KhatupatiProvider = dynamic(() => import('@/lib/store').then(m => m.KhatupatiProvider), { ssr: false });
const UpdateNotification = dynamic(() => import('@/components/UpdateNotification'), { ssr: false });
const IOSInstallPrompt = dynamic(() => import('@/components/IOSInstallPrompt'), { ssr: false });
const AndroidInstallPrompt = dynamic(() => import('@/components/AndroidInstallPrompt'), { ssr: false });
const AuthCheck = dynamic(() => import('@/components/AuthCheck'), { ssr: false });
const GlobalAIChat = dynamic(() => import('@/components/ai/GlobalAIChat').then(m => m.GlobalAIChat), { ssr: false });
const Toaster = dynamic(() => import('@/components/ui/toaster').then(m => m.Toaster), { ssr: false });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthCheck>
        <KhatupatiProvider>
          {children}
          <UpdateNotification />
          <IOSInstallPrompt />
          <AndroidInstallPrompt />
          <GlobalAIChat />
          <Toaster />
        </KhatupatiProvider>
      </AuthCheck>
    </FirebaseClientProvider>
  );
}
