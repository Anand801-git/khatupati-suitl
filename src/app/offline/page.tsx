'use client';

import { useRouter } from 'next/navigation';
import { WifiOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/');
    } else {
      alert('You are still offline. Please check your connection.');
    }
  };

  const offlinePages = [
    { name: 'Dashboard', href: '/' },
    { name: 'Lots Gallery', href: '/purchases' },
    { name: 'Embroidery', href: '/jobs/embroidery' },
    { name: 'VA Stage', href: '/jobs/va' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-4 text-center bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700">
      <h1 className="text-4xl font-black tracking-widest uppercase">
        Khatupati Suits
      </h1>
      <div className="my-8 flex flex-col items-center gap-2">
        <WifiOff className="w-12 h-12" />
        <h2 className="text-2xl font-bold">You are Offline</h2>
        <p className="text-sm opacity-80">
          Showing cached data. Some features may be unavailable.
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-sm">
        <h3 className="font-bold mb-4 text-left">Available Offline Pages:</h3>
        <ul className="space-y-3 text-left">
          {offlinePages.map((page) => (
            <li key={page.href} className="flex items-center justify-between">
                <a href={page.href} className="font-semibold hover:underline">{page.name}</a>
              <CheckCircle className="w-5 h-5 text-green-300" />
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={handleRetry}
        className="mt-8 bg-white text-yellow-600 hover:bg-gray-100 font-bold"
      >
        Retry Connection
      </Button>
    </div>
  );
}
