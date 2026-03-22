"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page acts as a redirect bridge to the manual entry form,
 * ensuring users are guided to the correct lot creation workflow.
 */
export default function BillToStockRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirecting to the manual new lot form as requested in the audit
    router.replace('/lots/new');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">
          Loading Entry Form...
        </p>
      </div>
    </div>
  );
}
