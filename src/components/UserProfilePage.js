'use client';

import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { staffApi, studentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import PortalSidebar from './PortalSidebar';
import PortalHeaderUser from './PortalHeaderUser';
import { inputClass } from '@/components/ui/Field';
import {
  panel,
  portalMain,
  portalHeader,
  portalContent,
  headerTitle,
  headerSub,
  eyebrow,
  sectionHeading,
  sectionHeadingTitle,
  formError,
  btnPrimary,
  emptyState,
} from '@/components/ui/cx';

const roleLabel = (role) =>
  ({
    super_admin: 'Super Admin',
    keen_admin: 'Admin',
    admin: 'Department Admin',
    assistant: 'Assistant',
    teacher: 'Teacher',
    student: 'Student',
  })[role] || role || '—';

export default function UserProfilePage({ portal = 'staff' }) {
  const isStudent = portal === 'student';
  const api = isStudent ? studentApi : staffApi;
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const toast = useToastStore((state) => state.toast);

  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push(`/${portal}/login`);
      return;
    }
    api
      .get('/auth/me')
      .then((response) => setProfile(response.data?.profile || null))
      .catch((requestError) =>
        setProfileError(requestError.response?.data?.error?.message || 'Unable to load profile.'),
      );
  }, [hydrated, user, api, portal, router]);

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password does not match the confirmation.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(
        requestError.response?.status === 401
          ? 'Current password is incorrect.'
          : requestError.response?.data?.error?.message || 'Unable to update password.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !user) return null;

  const detailRows = isStudent
    ? [
        ['Enrollment', profile?.enrollment_no],
        ['Seat Number', profile?.seat_number],
        ['Father Name', profile?.father_name],
        ['Admission Year', profile?.admission_year],
        ['Department', profile?.department_name],
        ['Section', profile?.class_code ? `${profile.class_code} · ${profile.section_name || ''}` : 'Not assigned'],
        ['Current Semester', profile?.semester ? `${profile.semester} · ${profile.batch_name || ''}` : '—'],
      ]
    : [
        ['Email', profile?.email],
        ['Username / Login ID', profile?.username || profile?.login_id],
        ['Department', profile?.department_name || '—'],
      ];

  return (
    <>
      <PortalSidebar portal={portal} />
      <main className={portalMain}>
        <header className={portalHeader}>
          <div>
            <h1 className={headerTitle}>My profile</h1>
            <p className={headerSub}>Review your details and manage your security settings.</p>
          </div>
          <PortalHeaderUser portal={portal} />
        </header>
        <div className={portalContent}>
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className={`${panel} p-[25px]`}>
              <div className={sectionHeading}>
                <div>
                  <span className={eyebrow}>ACCOUNT</span>
                  <h2 className={sectionHeadingTitle}>Profile details</h2>
                </div>
              </div>
              {profileError ? <p className={`${formError} ${'mt-[18px]'}`}>{profileError}</p> : null}
              {profile ? (
                <div className="pt-[22px]">
                  <div className="flex flex-wrap items-center gap-4 border-b border-line pb-[20px]">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
                      <UserRound size={26} />
                    </div>
                    <div>
                      <strong className="block text-lg text-brand-dark">
                        {profile.name || '—'}
                      </strong>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand">
                        <ShieldCheck size={13} />
                        {roleLabel(profile.role || user.role)}
                      </span>
                    </div>
                  </div>
                  <dl className="grid gap-x-8 gap-y-[15px] pt-[20px] sm:grid-cols-2">
                    {detailRows.map(([label, value]) => (
                      <div key={label}>
                        <dt className={eyebrow}>{label}</dt>
                        <dd className="mt-[5px] text-[14px] font-semibold text-brand-dark">
                          {value || '—'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className={emptyState}>Loading profile...</p>
              )}
            </section>

            <section className={`${panel} p-[25px]`}>
              <div className={sectionHeading}>
                <div>
                  <span className={eyebrow}>SECURITY</span>
                  <h2 className={sectionHeadingTitle}>Change password</h2>
                </div>
              </div>
              <form onSubmit={changePassword} className="grid gap-[17px] pt-[22px]">
                <label className="grid gap-2 text-xs font-semibold text-brand-dark">
                  Current password
                  <span className="relative block">
                    <input
                      className={`${inputClass} pr-[43px]`}
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-[10px] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[4px] text-muted transition hover:bg-brand-soft hover:text-brand"
                      onClick={() => setShowCurrent((value) => !value)}
                      aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                <label className="grid gap-2 text-xs font-semibold text-brand-dark">
                  New password
                  <span className="relative block">
                    <input
                      className={`${inputClass} pr-[43px]`}
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-[10px] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[4px] text-muted transition hover:bg-brand-soft hover:text-brand"
                      onClick={() => setShowNew((value) => !value)}
                      aria-label={showNew ? 'Hide new password' : 'Show new password'}
                    >
                      {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                <label className="grid gap-2 text-xs font-semibold text-brand-dark">
                  Confirm new password
                  <span className="relative block">
                    <input
                      className={`${inputClass} pr-[43px]`}
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-[10px] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[4px] text-muted transition hover:bg-brand-soft hover:text-brand"
                      onClick={() => setShowConfirm((value) => !value)}
                      aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                {error ? <p className={formError}>{error}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[11px] text-muted">
                    <KeyRound size={15} />
                    Passwords are stored hashed and never shown.
                  </span>
                  <button type="submit" className={btnPrimary} disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {saving ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}