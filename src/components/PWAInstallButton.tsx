'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallButton() {
  const { isReady, promptInstall } = usePWAInstall();

  if (!isReady) return null;

  return (
    <div className="p-4">
      <Button 
        className="w-full bg-green-600 hover:bg-green-700 text-white gap-3 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl justify-center h-14 rounded-2xl text-base font-bold"
        onClick={promptInstall}
      >
        <Download className="w-5 h-5" />
        Install App
      </Button>
    </div>
  );
}
