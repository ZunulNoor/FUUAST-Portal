'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { canAccessStaffResource } from '@/lib/staffAccess';
import PortalSidebar from './PortalSidebar';
import PortalHeaderUser from './PortalHeaderUser';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToastStore } from '@/store/toastStore';
import Button from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';
import {
  panel,
  portalMain,
  portalHeader,
  portalContent,
  headerTitle,
  headerSub,
  eyebrow,
  formError,
  errorTop,
} from '@/components/ui/cx';

export default function ScopedSettingPage({ setting = 'threshold' }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToastStore((state) => state.toast);
  const isThreshold = setting === 'threshold';
  const resource = isThreshold ? 'thresholds' : 'settings';
  const key = isThreshold ? null : 'edit_window_hours';
  const isDepartmentAdmin = user?.role === 'admin';
  const [scope, setScope] = useState('global');
  const [value, setValue] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [classSubjectTeacherId, setClassSubjectTeacherId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.push('/staff/login');
    else if (!canAccessStaffResource(user.role, resource, user.pageAccess))
      router.replace('/staff');
  }, [hydrated, user, router, resource]);

  useEffect(() => {
    if (isDepartmentAdmin) {
      setScope('department');
      setDepartmentId(String(user.departmentId || ''));
    }
  }, [isDepartmentAdmin, user?.departmentId]);

  useEffect(() => {
    if (!hydrated || !user || !canAccessStaffResource(user.role, resource, user.pageAccess)) return;
    const load = async () => {
      setError('');
      try {
        const params = {
          scope,
          department_id: departmentId || undefined,
          class_subject_teacher_id: classSubjectTeacherId || undefined,
        };
        if (key) params.key = key;
        const response = await staffApi.get(`/${resource}`, { params });
        setValue(
          String(
            isThreshold
              ? (response.data?.threshold_percent ?? '')
              : (response.data?.setting_value ?? response.data?.value ?? ''),
          ),
        );
      } catch (requestError) {
        setError(requestError.response?.data?.error?.message || 'Unable to load setting.');
      }
    };
    load();
  }, [hydrated, user, resource, scope, departmentId, classSubjectTeacherId, key, isThreshold]);

  if (!hydrated || !user || !canAccessStaffResource(user.role, resource, user.pageAccess))
    return null;

  const save = async (event) => {
    event.preventDefault();
    setError('');
    const proceed = await confirm({
      title: isThreshold ? 'Save threshold?' : 'Save setting?',
      message: 'Apply these changes to attendance rules?',
      confirmLabel: 'Save',
    });
    if (!proceed) return;
    try {
      const body = isThreshold
        ? {
            scope,
            threshold_percent: Number(value),
            department_id: departmentId || undefined,
            class_subject_teacher_id: classSubjectTeacherId || undefined,
          }
        : {
            key,
            scope,
            value,
            department_id: departmentId || undefined,
            class_subject_teacher_id: classSubjectTeacherId || undefined,
          };
      await staffApi.put(`/${resource}`, body);
      toast.success('Setting saved successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to save setting.');
    }
  };

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <header className={portalHeader}>
          <div>
            <h1 className={headerTitle}>{isThreshold ? 'Attendance thresholds' : 'Edit window settings'}</h1>
            <p className={headerSub}>
              {isThreshold
                ? 'Set the required attendance percentage by scope.'
                : 'Control how long teachers may correct their own attendance.'}
            </p>
          </div>
          <PortalHeaderUser portal="staff" />
        </header>
        <div className={portalContent}>
          <section className={`${panel} max-w-[680px] p-[28px]`}>
            <span className={eyebrow}>
              {isDepartmentAdmin ? 'DEPARTMENT CONFIGURATION' : 'SCOPED CONFIGURATION'}
            </span>
            <h2 className="mt-[7px] mb-[6px] text-[22px] font-semibold text-brand-dark">
              {isThreshold ? 'Threshold resolution' : 'Edit window resolution'}
            </h2>
            <p className="m-0 text-xs leading-[1.6] text-muted">
              {isDepartmentAdmin
                ? 'This threshold applies to your department only.'
                : 'The most specific value wins: class-subject, then department, then global.'}
            </p>
            <form className="mt-[25px] grid gap-4" onSubmit={save}>
              <label className="grid gap-[7px] text-xs font-semibold text-brand-dark">
                Scope
                {isDepartmentAdmin ? (
                  <input className={inputClass} value="Department" readOnly />
                ) : (
                  <select
                    className={inputClass}
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                  >
                    <option value="global">Global</option>
                    <option value="department">Department</option>
                    <option value="class_subject">Class subject</option>
                  </select>
                )}
              </label>
              {scope === 'department' ? (
                <label className="grid gap-[7px] text-xs font-semibold text-brand-dark">
                  Department ID
                  <input
                    className={inputClass}
                    value={departmentId}
                    onChange={(event) => setDepartmentId(event.target.value)}
                    readOnly={isDepartmentAdmin}
                    required
                  />
                </label>
              ) : null}
              {scope === 'class_subject' ? (
                <label className="grid gap-[7px] text-xs font-semibold text-brand-dark">
                  Class-subject-teacher ID
                  <input
                    className={inputClass}
                    value={classSubjectTeacherId}
                    onChange={(event) => setClassSubjectTeacherId(event.target.value)}
                    required
                  />
                </label>
              ) : null}
              <label className="grid gap-[7px] text-xs font-semibold text-brand-dark">
                {isThreshold ? 'Required percentage' : 'Edit window hours'}
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max={isThreshold ? '100' : undefined}
                  step="0.01"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  required
                />
              </label>
              <Button type="submit" className="justify-self-start">
                <Save size={16} /> Save setting
              </Button>
            </form>
            {error ? <p className={`${formError} ${errorTop}`}>{error}</p> : null}
          </section>
        </div>
      </main>
    </>
  );
}