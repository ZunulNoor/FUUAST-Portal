'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Search } from 'lucide-react';
import { studentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import { formError } from '@/components/ui/cx';

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Shared passwordless lookup: seat number + captcha.
// mode="view"  -> shows the attendance result inline (standalone page).
// mode="login" -> mints a real student session and opens the dashboard.
export default function StudentLookupForm({ mode = 'view' }) {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [seat, setSeat] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [deptOptions, setDeptOptions] = useState([]);
  const [captcha, setCaptcha] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [cooldownMsg, setCooldownMsg] = useState('');
  const [autoRetry, setAutoRetry] = useState(false);
  const [result, setResult] = useState(null);

  const loadCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const res = await studentApi.get('/student/captcha');
      setCaptcha(res.data);
      setAnswer('');
      setError('');
      setCooldownMsg('');
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 429) {
        const retryAfter = Number(requestError.response?.headers?.['retry-after']) || 600;
        setCooldownMsg('Too many attempts — please try again in');
        setCooldown(Math.max(60, retryAfter));
        setAutoRetry(true);
        setError('');
      } else if (status === 404) {
        setCooldownMsg('Attendance check is updating — retrying in');
        setCooldown(300);
        setAutoRetry(true);
        setError('');
      } else {
        setCooldownMsg('Server unreachable — retrying in');
        setCooldown(300);
        setAutoRetry(true);
        setError('');
      }
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      if (autoRetry) {
        setAutoRetry(false);
        setCooldownMsg('');
        loadCaptcha();
      }
      return;
    }
    const timer = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldown, autoRetry]);

  const reset = () => {
    setResult(null);
    setDeptOptions([]);
    setDepartmentId('');
    setError('');
    loadCaptcha();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (cooldown > 0 || submitting) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      if (mode === 'login') {
        const res = await studentApi.post('/student/session-lookup', {
          seat_number: seat.trim(),
          department_id: departmentId || null,
          captcha_id: captcha?.id,
          captcha_answer: answer.trim(),
        });
        const { accessToken, refreshToken, actor } = res.data;
        setSession({ user: { ...actor, portal: 'student' }, accessToken, refreshToken });
        router.push('/student');
        return;
      }
      const res = await studentApi.post('/student/attendance-lookup', {
        seat_number: seat.trim(),
        department_id: departmentId || null,
        captcha_id: captcha?.id,
        captcha_answer: answer.trim(),
      });
      setResult(res.data);
    } catch (requestError) {
      const status = requestError.response?.status;
      const data = requestError.response?.data?.error || {};
      if (status === 429 && data.retry_after_seconds) {
        setCooldown(Number(data.retry_after_seconds));
        setError('');
      } else if (status === 409 && data.options) {
        setDeptOptions(data.options);
        setError('This seat number exists in more than one department — please choose yours below.');
      } else {
        setError(data.message || 'Unable to look up attendance.');
      }
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div>
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9c89a]">
          ATTENDANCE RESULT
        </span>
        <h2 className="mt-2 text-[25px] font-semibold text-brand-dark">{result.name}</h2>
        <p className="m-0 text-[13px] text-muted">
          Seat {result.seat_number}
          {result.department_name ? ` · ${result.department_name}` : ''}
        </p>
        <p className="mt-4 text-[44px] font-bold leading-none text-brand">
          {result.overall_percentage}
          <span className="text-lg">%</span>
        </p>
        <p className="mt-1 text-xs text-muted">Overall across {result.total_classes} marked class(es)</p>
        <div className="mt-5 grid gap-3">
          {(result.subjects || []).map((s) => (
            <div key={s.subject_code} className="rounded-md border border-line p-3">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <strong className="text-ink">{s.subject_name}</strong>
                <span className="font-bold text-brand">{s.percentage}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-surface">
                <div className="h-full rounded bg-brand" style={{ width: `${Math.min(100, s.percentage)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {s.subject_code} · Present {s.present} · Late {s.late} · Absent {s.absent} (of {s.total})
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Button variant="secondary" onClick={reset}>Check another seat</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-[17px]">
      <Field label="Seat number">
        <input
          className={inputClass}
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
          placeholder="e.g. 25122001"
          required
        />
      </Field>
      {deptOptions.length > 0 ? (
        <Field label="Department">
          <select className={inputClass} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
            <option value="">Select department…</option>
            {deptOptions.map((o) => (
              <option key={o.department_id} value={o.department_id}>
                {o.department_name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <div className="grid gap-2">
        <span className="text-xs font-semibold text-brand-dark">Captcha — solve: {captcha?.question || '…'}</span>
        <div className="flex items-center gap-3">
          {captcha ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(captcha.svg)}`}
              alt={`Captcha: ${captcha.question}`}
              className="h-[54px] w-[150px] rounded border border-line"
            />
          ) : (
            <span className="text-xs text-muted">Loading…</span>
          )}
          <button
            type="button"
            onClick={() => {
              setAutoRetry(false);
              setCooldownMsg('');
              setCooldown(0);
              setError('');
              loadCaptcha();
            }}
            title="New captcha"
            className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft"
          >
            <RefreshCw size={17} className={loadingCaptcha ? 'animate-spin' : ''} />
          </button>
        </div>
        <input
          className={inputClass}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer"
          inputMode="numeric"
          required
        />
      </div>
      {error ? <p className={formError}>{error}</p> : null}
      {cooldown > 0 ? (
        <p className="rounded-[4px] bg-[#fff5e8] px-3 py-[10px] text-xs font-semibold text-warning">
          {cooldownMsg || 'Already viewed recently — try again in'} {formatCountdown(cooldown)}.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || cooldown > 0}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-action text-sm font-semibold text-white transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Search size={17} /> {submitting ? 'Checking…' : mode === 'login' ? 'Open my dashboard' : 'View attendance'}
      </button>
    </form>
  );
}
