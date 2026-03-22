'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { X, Share, PlusSquare } from 'lucide-react';

export default function IOSInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone;

    const lastDismissed = localStorage.getItem('iosInstallPromptDismissed');
    const dismissedRecently = lastDismissed && (Date.now() - parseInt(lastDismissed, 10)) < 7 * 24 * 60 * 60 * 1000; // 7 days

    if (isIOS && !isStandalone && !dismissedRecently) {
      const count = parseInt(localStorage.getItem('visitCount') || '0', 10) + 1;
      localStorage.setItem('visitCount', String(count));
      setVisitCount(count);

      if (count >= 3) {
        setShowBanner(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('iosInstallPromptDismissed', String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50 flex items-center justify-between">
      <div>
        <p className="font-bold">Install Khatupati Suits on your iPhone</p>
        <p className="text-sm">Tap the Share button then tap Add to Home Screen.</p>
      </div>
      <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-transparent text-white hover:bg-gray-700 hover:text-white">Install Guide</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Installation Guide</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-bold">Step 1: Tap the Share icon</p>
                <p className="text-sm text-gray-500">Tap the Share icon at the bottom of Safari.</p>
                <div className="flex items-center justify-center p-4 mt-2 bg-gray-100 rounded-lg">
                    <Share className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div>
                <p className="font-bold">Step 2: Add to Home Screen</p>
                <p className="text-sm text-gray-500">Scroll down and tap 'Add to Home Screen'.</p>
                <div className="flex items-center justify-center p-4 mt-2 bg-gray-100 rounded-lg">
                    <PlusSquare className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div>
                <p className="font-bold">Step 3: Add</p>
                <p className="text-sm text-gray-500">Tap 'Add' in the top right corner.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button onClick={handleDismiss} variant="ghost" size="icon">
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
