'use client';

import { useEffect, useState } from 'react';
import PortalLogin from '@/components/PortalLogin';
import { applyLoginMode, getDefaultPortal, getRootLoginMode } from '@/lib/AppController';

export default function HomePage() {
  const [portal, setPortal] = useState(null);

  useEffect(() => {
    const login = getRootLoginMode(getDefaultPortal());
    setPortal(login.portal);
    applyLoginMode(login);
  }, []);

  if (!portal) return null;
  return <PortalLogin portal={portal} />;
}
