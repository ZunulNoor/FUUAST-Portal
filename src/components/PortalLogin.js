'use client';

import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { staffApi, studentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PortalBrand from './PortalBrand';
import Modal from '@/components/ui/Modal';
import { inputClass } from '@/components/ui/Field';
import { formError, kicker } from '@/components/ui/cx';

export default function PortalLogin({ portal }) {
  const isStudent = portal === 'student';
  const api = isStudent ? studentApi : staffApi;
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mustReset, setMustReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', {
        identifier,
        password,
        portal: isStudent ? 'student' : 'staff',
      });
      const { accessToken, refreshToken, actor } = response.data;
      setSession({ user: { ...actor, portal }, accessToken, refreshToken });
      if (actor?.mustResetPassword) setMustReset(true);
      else router.push(`/${portal}`);
    } catch (requestError) {
      setError(
        requestError.response?.status === 429
          ? 'Too many attempts. Please wait a moment.'
          : requestError.response?.data?.error?.message || 'Unable to sign in.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResetError('');
    try {
      await api.post('/auth/change-password', { currentPassword: password, newPassword });
      setMustReset(false);
      router.push(`/${portal}`);
    } catch (requestError) {
      setResetError(requestError.response?.data?.error?.message || 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      <header className="flex min-h-[72px] items-center justify-between bg-brand px-[max(28px,calc((100vw-1180px)/2))]">
        <Link href="/" className="inline-flex items-center gap-[7px] text-[13px] text-[#e1e8d7] transition hover:text-white">
          <ArrowLeft size={16} /> Back to portal
        </Link>
        <PortalBrand compact size="auth" />
      </header>
      <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1050px] grid-cols-[0.8fr_1fr] items-center gap-[75px] px-[28px] py-[55px] [@media(max-width:800px)]:grid-cols-1 [@media(max-width:800px)]:gap-[35px] [@media(max-width:800px)]:py-[58px]">
        <div>
          <span className="mb-[25px] grid h-[52px] w-[52px] place-items-center rounded-full bg-brand-soft text-brand">
            <ShieldCheck size={28} />
          </span>
          <span className={kicker}>Secure access</span>
          <h1 className="m-0 text-[45px] font-semibold leading-[1.08] text-brand-dark [@media(max-width:800px)]:text-[38px]">
            {isStudent ? 'Student portal' : 'Staff workspace'}
          </h1>
          <p className="my-[18px] max-w-[370px] text-base leading-[1.65] text-muted">
            {isStudent
              ? 'Review your academic attendance and stay ahead of your semester.'
              : 'Run attendance operations with a clear view of your campus data.'}
          </p>
          <div className="mt-[22px] inline-flex items-center gap-[9px] text-xs text-brand">
            <KeyRound size={17} />
            <span>Use your university credentials to continue.</span>
          </div>
        </div>
        <div className="max-w-[500px] rounded-lg border border-line bg-paper p-[35px] shadow-[var(--shadow)] [@media(max-width:800px)]:p-[25px]">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9c89a]">
              FUUAST ATTENDANCE
            </span>
            <h2 className="mt-2 mb-[5px] text-[25px] font-semibold text-brand-dark">Sign in</h2>
            <p className="m-0 text-[13px] text-muted">
              {isStudent
                ? 'Enter your student ID or registered email.'
                : 'Enter your staff username, email, or login ID.'}
            </p>
          </div>
          <form onSubmit={submit} className="mt-[27px] grid gap-[17px]">
            <label className="grid gap-2 text-xs font-semibold text-brand-dark">
              Identifier
              <input
                className={inputClass}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={isStudent ? 'Student ID or email' : 'Username, email, or login ID'}
                required
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-brand-dark">
              Password
              <span className="relative block">
                <input
                  className={`${inputClass} pr-[43px]`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-[10px] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[4px] text-muted transition hover:bg-brand-soft hover:text-brand"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {error ? <p className={formError}>{error}</p> : null}
            <button
              type="submit"
              className="mt-[3px] inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-action text-sm font-semibold text-white transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          {/* <p className="mt-[23px] text-center text-xs text-muted">
            Need another portal?{' '}
            <Link href={isStudent ? '/staff/login' : '/student/login'} className="font-semibold text-action">
              {isStudent ? 'Staff access' : 'Student access'}
            </Link>
          </p> */}
        </div>
      </section>
      {mustReset ? (
        <Modal size="sm" eyebrow="FUUAST ATTENDANCE" title="Password update required">
          <form onSubmit={resetPassword} className="p-6">
            <span className="mb-4 grid h-[52px] w-[52px] place-items-center rounded-full bg-brand-soft text-brand">
              <KeyRound size={23} />
            </span>
            <p className="-mt-2 mb-4 text-sm text-muted">
              This temporary password must be replaced before continuing.
            </p>
            <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
              New password
              <span className="relative block">
                <input
                  className="h-9 w-full rounded-md border border-line bg-paper px-3 pr-10 text-sm text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20"
                  type={showNewPassword ? 'text' : 'password'}
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-[10px] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[4px] text-muted transition hover:bg-brand-soft hover:text-brand"
                  onClick={() => setShowNewPassword((value) => !value)}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {resetError ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-danger">
                {resetError}
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-white transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </Modal>
      ) : null}
    </main>
  );
}