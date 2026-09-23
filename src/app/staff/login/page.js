'use client';

import { useEffect } from 'react';
import { applyLoginMode, getLoginMode } from '@/lib/AppController';

export default function StaffLoginPage() {
  const login = getLoginMode('staff');

  useEffect(() => {
    applyLoginMode(login);
  }, [login]);

  return null;
}
