'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { canAccessStaffResource } from '@/lib/staffAccess';
import PortalSidebar from './PortalSidebar';
import PortalHeaderUser from './PortalHeaderUser';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToastStore } from '@/store/toastStore';
import { inputClass } from '@/components/ui/Field';
import {
  panel,
  portalMain,
  portalHeader,
  portalContent,
  headerTitle,
  headerSub,
  eyebrow,
  emptyState,
  formError,
  errorTop,
} from '@/components/ui/cx';

export default function PermissionsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToastStore((state) => state.toast);
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    if (!user) return router.push('/staff/login');
    if (!canAccessStaffResource(user.role, 'permissions', user.pageAccess))
      return router.replace('/staff');
    const loadStaff = async () => {
      try {
        const userResponse = await staffApi.get('/users');
        const users = (userResponse.data || [])
          .filter((item) => ['admin', 'assistant'].includes(item.role))
          .map((item) => ({ ...item, actorType: 'user', selectionKey: `user:${item.id}` }));
        const teacherResponse = await staffApi.get('/teachers');
        const teachers = (teacherResponse.data || []).map((item) => ({
          ...item,
          actorType: 'teacher',
          role: 'teacher',
          selectionKey: `teacher:${item.id}`,
        }));
        const rows = [...users, ...teachers];
        setStaff(rows);
        if (rows[0]?.selectionKey) setSelectedStaff(rows[0].selectionKey);
      } catch (requestError) {
        setError(requestError.response?.data?.error?.message || 'Unable to load staff accounts.');
      } finally {
        setLoading(false);
      }
    };
    loadStaff();
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!selectedStaff) return;
    const loadAccess = async () => {
      setError('');
      try {
        const [actorType, actorId] = selectedStaff.split(':');
        const endpoint =
          actorType === 'teacher'
            ? `/permissions/teachers/${actorId}/access`
            : `/users/${actorId}/access`;
        const response = await staffApi.get(endpoint);
        setAccess(response.data || []);
      } catch (requestError) {
        setError(requestError.response?.data?.error?.message || 'Unable to load page access.');
      }
    };
    loadAccess();
  }, [selectedStaff]);

  if (!hydrated || !user || !canAccessStaffResource(user.role, 'permissions', user.pageAccess))
    return null;

  const updateAccess = async (item) => {
    const enabling = !item.enabled;
    const proceed = await confirm({
      title: enabling ? 'Grant access?' : 'Revoke access?',
      message: `${enabling ? 'Allow' : 'Block'} "${item.label}" access for this account?`,
      confirmLabel: enabling ? 'Grant' : 'Revoke',
      tone: enabling ? 'primary' : 'danger',
    });
    if (!proceed) return;
    setSaving(item.key);
    setError('');
    try {
      const [actorType, actorId] = selectedStaff.split(':');
      const endpoint =
        actorType === 'teacher'
          ? `/permissions/teachers/${actorId}/access/${item.key}`
          : `/users/${actorId}/access/${item.key}`;
      await staffApi.put(endpoint, { enabled: !item.enabled });
      setAccess((current) =>
        current.map((entry) =>
          entry.key === item.key ? { ...entry, enabled: !item.enabled } : entry,
        ),
      );
      toast.success(`${item.label} access updated.`);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to update page access.');
    } finally {
      setSaving('');
    }
  };

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <header className={portalHeader}>
          <div>
            <h1 className={headerTitle}>Staff page access</h1>
            <p className={headerSub}>Choose which pages each staff account or teacher can open.</p>
          </div>
          <PortalHeaderUser portal="staff" />
        </header>
        <div className={portalContent}>
          <section className={`${panel} p-[28px]`}>
            <div className="flex items-start justify-between gap-[25px] border-b border-line pb-[22px]">
              <div>
                <span className={eyebrow}>SUPER ADMIN CONTROL</span>
                <h2 className="mt-[7px] mb-[6px] text-[22px] font-semibold text-brand-dark">
                  Page access checkboxes
                </h2>
                <p className="m-0 max-w-[620px] text-xs leading-[1.6] text-muted">
                  Department scope still applies after a page is enabled.
                </p>
              </div>
              <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                <ShieldCheck size={22} />
              </span>
            </div>
            <label className="mt-6 grid max-w-[420px] gap-[7px] text-xs font-semibold text-brand-dark">
              Staff account
              <select
                className={inputClass}
                value={selectedStaff}
                onChange={(event) => setSelectedStaff(event.target.value)}
                disabled={loading}
              >
                <option value="">Select a staff account</option>
                {staff.map((item) => (
                  <option key={item.selectionKey} value={item.selectionKey}>
                    {item.name} ({item.role})
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className={`${formError} ${errorTop}`}>{error}</p> : null}
            {loading ? (
              <p className={emptyState}>Loading staff accounts...</p>
            ) : (
              <div className="mt-6 grid gap-[10px]">
                {access.map((item) => (
                  <label className="flex items-center justify-between gap-5 rounded-md border border-line p-[17px]" key={item.key}>
                    <div className="grid gap-[5px]">
                      <strong className="text-[13px] text-brand-dark">{item.label}</strong>
                      <small className="text-[11px] text-muted">{item.description}</small>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => updateAccess(item)}
                      disabled={saving === item.key}
                      className="h-[18px] w-[18px] shrink-0 accent-action"
                    />
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}