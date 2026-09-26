'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortalSidebar from '../PortalSidebar';
import PageHeader from '../PageHeader';
import { useAuthStore } from '@/store/authStore';
import { portalMain, portalContent, portalContentWide } from '@/components/ui/cx';

export const HR_SELF = ['teacher', 'staff', 'super_admin'];
export const HR_APPROVER = [
  'super_admin', 'chairman', 'dean', 'deputy_registrar', 'registrar',
  'vice_chancellor', 'management', 'teacher',
];
export const HR_OFFICE = [
  'super_admin', 'admin', 'chairman', 'deputy_registrar', 'registrar', 'management',
];
export const HR_RULES = ['super_admin', 'deputy_registrar', 'registrar'];
export const HR_RULES_WRITE = ['super_admin', 'deputy_registrar'];

export default function HrShell({ title, description, allow, children, wide = false }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.push('/staff/login');
    else if (!allow.includes(user.role)) router.replace('/staff');
  }, [hydrated, user, router, allow]);

  if (!hydrated || !user || !allow.includes(user.role)) return null;

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <PageHeader title={title} description={description} portal="staff" />
        <div className={wide ? portalContentWide : portalContent}>{children}</div>
      </main>
    </>
  );
}
