'use client';

import { useEffect } from 'react';
import PortalLogin from '@/components/PortalLogin';
import { applyLoginMode, getDefaultPortal, getRootLoginMode } from '@/lib/AppController';

export default function HomePage() {
  const login = getRootLoginMode(getDefaultPortal());

  useEffect(() => {
    applyLoginMode(login);
  }, [login]);

  return login.mode === 'render' ? <PortalLogin portal={login.portal} /> : null;
}
