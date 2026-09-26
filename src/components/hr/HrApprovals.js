'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { leaveApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import HrShell, { HR_APPROVER } from './HrShell';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Field, { inputClass } from '@/components/ui/Field';
import {
  panel, eyebrow, sectionHeading, sectionHeadingTitle, emptyState, formError, statusBadge,
  btnSecondary, filterInputClass,
} from '@/components/ui/cx';

const STEP_LABELS = { chairman: 'Chairman', admin: 'Admin office', dean: 'Dean', registrar: 'Registrar', vice_chancellor: 'Vice Chancellor' };

function ageHours(createdAt) {
  if (!createdAt) return '';
  const h = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
  if (h < 1) return '<1h';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function HrApprovals() {
  const toast = useToastStore((state) => state.toast);
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stepFilter, setStepFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, aRes] = await Promise.all([
        leaveApi.get('/hr/leaves/pending'),
        leaveApi.get('/hr/leaves/all', { params: { status: statusFilter || undefined, step: stepFilter || undefined } }),
      ]);
      setPending(pRes.data || []);
      setAll(aRes.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load approvals.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, stepFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    try {
      const res = await leaveApi.get(`/hr/leaves/${id}`);
      setDetail(res.data);
      setActionComment('');
      setActionError('');
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || 'Unable to open request.');
    }
  };

  const act = async (action) => {
    if (!detail) return;
    if (action === 'reject' && !actionComment.trim()) {
      setActionError('A comment is required to reject.');
      return;
    }
    setActing(true);
    setActionError('');
    try {
      const res = await leaveApi.post(`/hr/leaves/${detail.id}/act`, { action, comment: actionComment });
      toast(action === 'reject' ? 'Request rejected.' : res.data?.status === 'approved' ? 'Request approved.' : `Forwarded to ${res.data?.current_step?.replace(/_/g, ' ')}.`);
      setDetail(null);
      load();
    } catch (requestError) {
      setActionError(requestError.response?.data?.error?.message || 'Unable to act on request.');
    } finally {
      setActing(false);
    }
  };

  const rows = useMemo(() => (tab === 'pending' ? pending : all), [tab, pending, all]);

  const requestTable = (list, showStep) => (
    list.length === 0 ? (
      <p className={emptyState}>{tab === 'pending' ? 'No requests waiting for you.' : 'No requests found.'}</p>
    ) : (
      <div className="mt-[14px] overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Applicant</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">From → To</th>
              <th className="py-2 pr-3">Days</th>
              {showStep ? <th className="py-2 pr-3">At step</th> : null}
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Age</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b border-line/60">
                <td className="py-2 pr-3 font-medium text-ink">
                  {r.applicant_name}
                  {r.escalated ? <span className="ml-2 rounded bg-[#fff5e8] px-1.5 py-0.5 text-[10px] font-bold text-warning">ALTERNATE</span> : null}
                </td>
                <td className="py-2 pr-3">{r.leave_name}</td>
                <td className="py-2 pr-3">{String(r.from_date).slice(0, 10)} → {String(r.to_date).slice(0, 10)}</td>
                <td className="py-2 pr-3">{r.days}</td>
                {showStep ? <td className="py-2 pr-3 capitalize">{String(r.current_step).replace(/_/g, ' ')}</td> : null}
                <td className="py-2 pr-3"><span className={statusBadge(r.status === 'pending' ? 'late' : r.status === 'approved' ? 'present' : 'absent')}>{r.status}</span></td>
                <td className="py-2 pr-3 text-muted">{ageHours(r.created_at)}</td>
                <td className="py-2 text-right">
                  <button type="button" className={btnSecondary} onClick={() => openDetail(r.id)}>Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <HrShell title="Leave Approvals" description="Recommend, verify and sanction leave requests across the hierarchy." allow={HR_APPROVER} wide>
      <section className={`${panel} p-[25px]`}>
        <div className={sectionHeading}>
          <div>
            <span className={eyebrow}>APPROVAL WORKFLOW</span>
            <h2 className={sectionHeadingTitle}>Chairman → Admin → Dean → Registrar → VC</h2>
          </div>
          <button
            type="button"
            onClick={load}
            title="Refresh"
            className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft"
          >
            <RefreshCw size={17} />
          </button>
        </div>
        <div className="mt-[16px] flex flex-wrap items-center gap-2">
          <Button variant={tab === 'pending' ? 'primary' : 'secondary'} onClick={() => setTab('pending')}>
            Awaiting me ({pending.length})
          </Button>
          <Button variant={tab === 'all' ? 'primary' : 'secondary'} onClick={() => setTab('all')}>All requests</Button>
          {tab === 'all' ? (
            <>
              <select className={filterInputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className={filterInputClass} value={stepFilter} onChange={(e) => setStepFilter(e.target.value)}>
                <option value="">All steps</option>
                {Object.entries(STEP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </>
          ) : null}
        </div>
        {loading ? <p className={emptyState}>Loading…</p> : error ? <p className={`${emptyState} text-danger`}>{error}</p> : requestTable(rows, tab === 'all')}
      </section>

      {detail ? (
        <Modal size="lg" eyebrow="LEAVE REQUEST" title={`${detail.applicant_name} — ${detail.leave_name}`} onClose={() => setDetail(null)}>
          <div className="grid max-h-[70vh] gap-5 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
              <div><p className="text-[11px] font-bold uppercase text-muted">From</p><p>{String(detail.from_date).slice(0, 10)}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-muted">To</p><p>{String(detail.to_date).slice(0, 10)}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-muted">Days</p><p>{detail.days}</p></div>
              <div><p className="text-[11px] font-bold uppercase text-muted">Status</p><p className="capitalize">{detail.status}</p></div>
            </div>
            {detail.reason ? <p className="text-[13px] text-ink"><strong>Reason:</strong> {detail.reason}</p> : null}
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="font-bold uppercase text-muted">Chain:</span>
              {(detail.steps || []).map((s, i) => {
                const done = detail.status !== 'pending' ? true : (detail.steps || []).indexOf(detail.current_step) > i;
                const current = detail.status === 'pending' && s === detail.current_step;
                return (
                  <span key={s} className="flex items-center gap-2">
                    <span className={`rounded px-2 py-1 font-semibold ${current ? 'bg-action text-white' : done ? 'bg-[#edf7ef] text-success' : 'bg-surface text-muted'}`}>
                      {STEP_LABELS[s] || s}
                    </span>
                    {i < (detail.steps || []).length - 1 ? <span className="text-muted">→</span> : null}
                  </span>
                );
              })}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">History</p>
              {(detail.history || []).length === 0 ? (
                <p className="text-[13px] text-muted">No actions yet.</p>
              ) : (
                <ul className="grid gap-2">
                  {detail.history.map((h) => (
                    <li key={h.id} className="rounded border border-line bg-surface px-3 py-2 text-[13px]">
                      <strong className="capitalize">{h.action}</strong> at {h.step.replace(/_/g, ' ')} — {String(h.acted_at).slice(0, 16).replace('T', ' ')}
                      {h.comment ? <span className="text-muted"> · {h.comment}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {detail.status === 'pending' ? (
              <div className="grid gap-3">
                <Field label="Comment (required to reject)">
                  <textarea className={`${inputClass} min-h-[70px] py-2`} value={actionComment} onChange={(e) => setActionComment(e.target.value)} placeholder="Remarks for the applicant / next level" />
                </Field>
                {actionError ? <p className={formError}>{actionError}</p> : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="danger" disabled={acting} onClick={() => act('reject')}>Reject</Button>
                  <Button variant="secondary" disabled={acting} onClick={() => act('forward')}>Forward</Button>
                  <Button disabled={acting} onClick={() => act('approve')}>{acting ? 'Working…' : 'Approve / Recommend'}</Button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </HrShell>
  );
}
