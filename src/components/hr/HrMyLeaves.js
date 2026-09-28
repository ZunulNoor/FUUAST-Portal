'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { leaveApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import HrShell, { HR_SELF } from './HrShell';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Field, { inputClass } from '@/components/ui/Field';
import EmptyState from '@/components/ui/EmptyState';
import {
  panel,
  eyebrow,
  sectionHeading,
  sectionHeadingTitle,
  emptyState,
  formError,
  statusBadge,
  btnSecondary,
} from '@/components/ui/cx';
import { friendlyError } from '@/lib/apiError';

const currentYear = new Date().getFullYear();

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b - a) / 86400000) + 1;
}

export default function HrMyLeaves() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore((state) => state.toast);
  const personType = user?.role === 'staff' ? 'staff' : user?.role === 'teacher' ? 'teacher' : null;

  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrorMsg, setFormErrorMsg] = useState('');
  const [form, setForm] = useState({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
    is_emergency: false,
    medical_cert: false,
  });

  const load = useCallback(async () => {
    if (!personType) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [rulesRes, balRes, mineRes] = await Promise.all([
        leaveApi.get('/hr/rules'),
        leaveApi.get('/hr/entitlements/mine', { params: { year: currentYear } }),
        leaveApi.get('/hr/leaves/mine'),
      ]);
      setTypes((rulesRes.data?.types || []).filter((t) => t.is_active));
      setBalances(balRes.data || []);
      setRequests(mineRes.data || []);
      const first = new Date(currentYear, new Date().getMonth(), 1).toISOString().slice(0, 10);
      const last = new Date(currentYear, new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
      try {
        const attRes = await leaveApi.get('/hr/attendance/roster', {
          params: { person_type: personType, from: first, to: last, limit: 100 },
        });
        setAttendance((attRes.data || []).filter((r) => Number(r.person_id) === Number(user.id)));
      } catch {
        setAttendance([]);
      }
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setLoading(false);
    }
  }, [personType, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const applyDays = useMemo(
    () => daysBetween(form.from_date, form.to_date),
    [form.from_date, form.to_date],
  );

  const submitApply = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormErrorMsg('');
    try {
      const res = await leaveApi.post('/hr/leaves', form);
      toast(
        `Leave request submitted (${res.data?.days ?? applyDays} day(s)). Awaiting Chairman recommendation.`,
      );
      setApplyOpen(false);
      setForm({
        leave_type_id: '',
        from_date: '',
        to_date: '',
        reason: '',
        is_emergency: false,
        medical_cert: false,
      });
      load();
    } catch (requestError) {
      setFormErrorMsg(friendlyError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await leaveApi.post(`/hr/leaves/${id}/cancel`);
      toast('Leave request cancelled.');
      load();
    } catch (requestError) {
      toast(friendlyError(requestError));
    }
  };

  return (
    <HrShell
      title="My Leaves"
      description="Apply for leave, track approvals and check your yearly balances."
      allow={HR_SELF}
    >
      {!personType ? (
        <section className={`${panel} p-[25px]`}>
          <EmptyState
            title="No employee record"
            message="Sign in as a teacher or staff member to apply for leave."
          />
        </section>
      ) : (
        <>
          <section className={`${panel} p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>LEAVE BALANCE {currentYear}</span>
                <h2 className={sectionHeadingTitle}>Yearly entitlements</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={load}
                  title="Refresh"
                  className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft"
                >
                  <RefreshCw size={17} />
                </button>
                <Button onClick={() => setApplyOpen(true)}>
                  <Plus size={16} /> Apply for leave
                </Button>
              </div>
            </div>
            {loading ? (
              <p className={emptyState}>Loading balances…</p>
            ) : error ? (
              <p className={`${emptyState} text-danger`}>{error}</p>
            ) : balances.length === 0 ? (
              <p className={emptyState}>
                No entitlements opened for {currentYear} yet. Contact the Admin office.
              </p>
            ) : (
              <div className="mt-[18px] grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {balances.map((b) => {
                  const remaining = Number(b.entitled) + Number(b.carried) - Number(b.used);
                  return (
                    <div key={b.id} className="rounded-md border border-line bg-surface p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        {b.pay_type} pay
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-brand-dark">{b.name}</p>
                      <p className="mt-2 text-[26px] font-bold text-brand">
                        {remaining} <span className="text-xs font-medium text-muted">left</span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Entitled {b.entitled} · Used {b.used} · Carried {b.carried}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={`${panel} mt-[22px] p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>MY REQUESTS</span>
                <h2 className={sectionHeadingTitle}>Leave history</h2>
              </div>
            </div>
            {requests.length === 0 ? (
              <p className={emptyState}>No leave requests yet.</p>
            ) : (
              <div className="mt-[14px] overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">From</th>
                      <th className="py-2 pr-3">To</th>
                      <th className="py-2 pr-3">Days</th>
                      <th className="py-2 pr-3">Step</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-line/60">
                        <td className="py-2 pr-3 font-medium text-ink">{r.leave_name}</td>
                        <td className="py-2 pr-3">{String(r.from_date).slice(0, 10)}</td>
                        <td className="py-2 pr-3">{String(r.to_date).slice(0, 10)}</td>
                        <td className="py-2 pr-3">{r.days}</td>
                        <td className="py-2 pr-3 capitalize">
                          {String(r.current_step).replace(/_/g, ' ')}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={statusBadge(
                              r.status === 'pending'
                                ? 'late'
                                : r.status === 'approved'
                                  ? 'present'
                                  : 'absent',
                            )}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          {r.status === 'pending' ? (
                            <button
                              type="button"
                              className={btnSecondary}
                              onClick={() => cancelRequest(r.id)}
                            >
                              Cancel
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={`${panel} mt-[22px] p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>MY ATTENDANCE</span>
                <h2 className={sectionHeadingTitle}>This month (fingerprint record)</h2>
              </div>
            </div>
            {attendance.length === 0 ? (
              <p className={emptyState}>No attendance uploaded for this month yet.</p>
            ) : (
              <div className="mt-[14px] overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">In</th>
                      <th className="py-2 pr-3">Out</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => (
                      <tr key={a.id} className="border-b border-line/60">
                        <td className="py-2 pr-3">{String(a.att_date).slice(0, 10)}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={statusBadge(a.status === 'on_leave' ? 'late' : a.status)}
                          >
                            {String(a.status).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {a.check_in ? String(a.check_in).slice(0, 5) : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {a.check_out ? String(a.check_out).slice(0, 5) : '—'}
                        </td>
                        <td className="py-2 text-muted">{a.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {applyOpen ? (
        <Modal
          eyebrow="LEAVE APPLICATION"
          title="Apply for leave"
          onClose={() => setApplyOpen(false)}
        >
          <form onSubmit={submitApply} className="grid gap-4 overflow-y-auto p-6">
            <Field label="Leave type">
              <select
                className={inputClass}
                value={form.leave_type_id}
                onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                required
              >
                <option value="">Select type…</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.from_date}
                  onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                  required
                />
              </Field>
              <Field label="To date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.to_date}
                  onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                  required
                />
              </Field>
            </div>
            {applyDays > 0 ? (
              <p className="text-xs text-muted">
                Duration: <strong>{applyDays} day(s)</strong> (intervening holidays count as leave).
              </p>
            ) : null}
            <Field label="Reason">
              <textarea
                className={`${inputClass} min-h-[90px] py-2`}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Brief reason for leave"
              />
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={form.is_emergency}
                onChange={(e) => setForm({ ...form, is_emergency: e.target.checked })}
              />
              Emergency / sudden leave (Rule 4)
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={form.medical_cert}
                onChange={(e) => setForm({ ...form, medical_cert: e.target.checked })}
              />
              Medical certificate attached (required for sick leave)
            </label>
            {formErrorMsg ? <p className={formError}>{formErrorMsg}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setApplyOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit application'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </HrShell>
  );
}
