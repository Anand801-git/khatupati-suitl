'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { X } from 'lucide-react';

export default function AndroidInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;

      const visitCount = parseInt(localStorage.getItem('visitCount') || '0', 10) + 1;
      localStorage.setItem('visitCount', String(visitCount));

      const lastDismissed = localStorage.getItem('androidInstallPromptDismissed');
      const dismissedRecently = lastDismissed && (Date.now() - parseInt(lastDismissed, 10)) < 3 * 24 * 60 * 60 * 1000; // 3 days

      if (visitCount > 1 && !dismissedRecently) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      deferredPrompt.current.userChoice.then(() => {
        deferredPrompt.current = null;
        setShowBanner(false);
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('androidInstallPromptDismissed', String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3 z-50 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
            <Image src="/icon-192.png" alt="Khatupati Suits Logo" width={40} height={40} className="rounded-lg" />
            <div>
                <p className="font-bold text-sm">Khatupati Suits</p>
                <p className="text-xs">Install for faster, offline access.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handleInstallClick} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">Install</Button>
            <Button onClick={handleDismiss} variant="ghost" size="icon" className="h-8 w-8">
                <X className="w-5 h-5" />
            </Button>
        </div>
    </div>
  );
}
