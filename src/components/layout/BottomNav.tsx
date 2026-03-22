"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Scissors, CheckCheck, MoreHorizontal, Circle } from 'lucide-react';
import { useKhatupatiStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const navItems = [
  { href: '/', icon: Home, label: 'Home', color: '#AD1457' },
  { href: '/purchases', icon: LayoutGrid, label: 'Lots', color: '#1A237E' },
  { href: '/jobs/embroidery', icon: Scissors, label: 'Embroidery', color: '#004D40' },
  { href: '/jobs/va', icon: CheckCheck, label: 'VA', color: '#1B5E20' },
  { href: '/settings/vendors', icon: MoreHorizontal, label: 'Master', color: '#6B6B80' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { allAssignments } = useKhatupatiStore();

  const delayedJobs = useMemo(() => {
    return allAssignments.filter(job => !job.receivedDate && (Date.now() - new Date(job.sentDate).getTime()) > 15 * 24 * 60 * 60 * 1000).length;
  }, [allAssignments]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-white border-t border-t-slate-100 flex justify-around items-start z-50 no-print">
      <div className="flex w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const isActive = (item.href === '/' && pathname === item.href) || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link href={item.href} key={item.label} className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-1 text-center">
              <div className="relative">
                {isActive && <Circle className="absolute -top-1.5 -translate-x-1/2 left-1/2 h-1 w-1" style={{ color: item.color, fill: item.color }} />}
                <item.icon className="w-6 h-6 mb-0.5" style={{ color: isActive ? item.color : '#BDBDBD' }} />
                {item.href === '/jobs/embroidery' && delayedJobs > 0 && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF5350] text-white text-[9px] font-bold">
                    {delayedJobs}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight" style={{ color: isActive ? item.color : '#BDBDBD' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
