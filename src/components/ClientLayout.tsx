'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const KhatupatiProvider = dynamic(() => import('@/lib/store').then(m => m.KhatupatiProvider), { ssr: false });
const IOSInstallPrompt = dynamic(() => import('@/components/IOSInstallPrompt'), { ssr: false });
const AndroidInstallPrompt = dynamic(() => import('@/components/AndroidInstallPrompt'), { ssr: false });
const PwaInstallBanner = dynamic(() => import('@/components/PwaInstallBanner').then(m => m.PwaInstallBanner), { ssr: false });
const GlobalAIChat = dynamic(() => import('@/components/ai/GlobalAIChat').then(m => m.GlobalAIChat), { ssr: false });
const Toaster = dynamic(() => import('@/components/ui/toaster').then(m => m.Toaster), { ssr: false });
const AuthCheck = dynamic(() => import('@/components/AuthCheck'), { ssr: false });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthCheck>
      <KhatupatiProvider>
        <div className="flex flex-col min-h-[100dvh]">
          <main className="flex-1">
            {children}
          </main>

        <PwaInstallBanner />
        <IOSInstallPrompt />
        <AndroidInstallPrompt />
        <GlobalAIChat />
        <Toaster />
      </div>
    </KhatupatiProvider>
    </AuthCheck>
  );
}

