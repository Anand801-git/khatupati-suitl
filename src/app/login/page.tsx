'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const checkFirstTime = async () => {
      const { value } = await Preferences.get({ key: 'app_pin_hash' });
      if (!value) {
        setIsFirstTime(true);
      }
    };
    checkFirstTime();
  }, []);

  const handleKeypad = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits.');
      return;
    }

    if (isFirstTime) {
      await Preferences.set({ key: 'app_pin_hash', value: btoa(pin) });
      await Preferences.set({ key: 'auth_pin_verified', value: 'true' });
      router.push('/');
    } else {
      const { value } = await Preferences.get({ key: 'app_pin_hash' });
      if (value === btoa(pin)) {
        await Preferences.set({ key: 'auth_pin_verified', value: 'true' });
        router.push('/');
      } else {
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
      <div className="text-center mb-8 w-full max-w-sm">
        <div className="mx-auto w-16 h-16 bg-primary/10 flex items-center justify-center rounded-full mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Khatupati Suits</h1>
        <p className="text-muted-foreground mt-2">
          {isFirstTime ? 'Set a new 4-digit PIN to secure your local data.' : 'Enter your 4-digit PIN to access your data.'}
        </p>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex gap-2 items-center text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 w-full max-w-[280px]">
        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold bg-white
                ${i < pin.length ? 'border-primary text-primary' : 'border-gray-200 text-transparent'}
              `}
            >
              {i < pin.length ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeypad(num.toString())}
              className="h-14 bg-white rounded-xl shadow-sm text-xl font-bold hover:bg-gray-50 active:scale-95 transition-all text-gray-800 border"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl text-sm font-bold active:scale-95 transition-all text-gray-500 hover:bg-gray-100"
            disabled={pin.length === 0}
          >
            DEL
          </button>
          <button
            onClick={() => handleKeypad('0')}
            className="h-14 bg-white rounded-xl shadow-sm text-xl font-bold hover:bg-gray-50 active:scale-95 transition-all text-gray-800 border"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            className={`h-14 rounded-xl font-bold flex flex-col items-center justify-center active:scale-95 transition-all
              ${pin.length === 4 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-gray-100 text-gray-400'}
            `}
            disabled={pin.length !== 4}
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
