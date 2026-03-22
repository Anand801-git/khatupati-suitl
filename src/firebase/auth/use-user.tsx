
'use client';

import { useFirebase } from '../provider';

export function useUser() {
  const { user } = useFirebase();
  return { user, loading: false };
}
