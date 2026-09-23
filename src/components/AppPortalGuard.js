'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resolvePortalAccess } from '@/lib/AppController';
import { useAuthStore } from '@/store/authStore';

export default function AppPortalGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);

  const decision = resolvePortalAccess(pathname, user);

  useEffect(() => {
    if (!hydrated || !decision) return;
    router.replace(decision.redirect);
  }, [hydrated, decision?.redirect, router]);

  if (!hydrated) return null;
  if (decision) return null;
  return children;
}
