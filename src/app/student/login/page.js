'use client';

import { useEffect } from 'react';
import { applyLoginMode, getLoginMode } from '@/lib/AppController';

export default function StudentLoginPage() {
  const login = getLoginMode('student');

  useEffect(() => {
    applyLoginMode(login);
  }, [login]);

  return null;
}
