'use client';

import { useEffect, useState } from 'react';
import PortalLogin from '@/components/PortalLogin';
import { applyLoginMode, getDefaultPortal, getRootLoginMode } from '@/lib/AppController';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const login = getRootLoginMode(getDefaultPortal());

  useEffect(() => {
    if (mounted) applyLoginMode(login);
  }, [login, mounted]);

  if (!mounted) return null;

  return login.mode === 'render' ? <PortalLogin portal={login.portal} /> : null;
}
