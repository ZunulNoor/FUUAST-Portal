'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Upload, Download } from 'lucide-react';
import { leaveApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import HrShell, { HR_OFFICE } from './HrShell';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Field, { inputClass } from '@/components/ui/Field';
import {
  panel,
  eyebrow,
  sectionHeading,
  sectionHeadingTitle,
  emptyState,
  formError,
  statusBadge,
  btnSecondary,
  filterInputClass,
} from '@/components/ui/cx';
import { friendlyError } from '@/lib/apiError';

const ATT_STATUSES = ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend'];

function monthRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

export default function HrAttendance() {
  const toast = useToastStore((state) => state.toast);
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    ...monthRange(),
    person_type: '',
    status: '',
    department_id: '',
  });
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [correctRow, setCorrectRow] = useState(null);
  const [correctForm, setCorrectForm] = useState({
    status: 'present',
    check_in: '',
    check_out: '',
    note: '',
  });
  const [correcting, setCorrecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, page: rosterPage, limit: 10 };
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k];
      });
      params.page = rosterPage;
      params.limit = 10;
      const [rRes, uRes, dRes] = await Promise.all([
        leaveApi.get('/hr/attendance/roster', { params }),
        leaveApi.get('/hr/attendance/uploads'),
        leaveApi.get('/hr/departments'),
      ]);
      const payload = rRes.data || [];
      setRows(payload.data || payload);
      setRosterTotal(payload.pagination?.total ?? (payload.data || payload).length);
      setUploads(uRes.data || []);
      setDepartments(dRes.data || []);
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters, rosterPage]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadTemplate = async () => {
    try {
      const res = await leaveApi.get('/hr/attendance/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fingerprint_upload_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Unable to download template.');
    }
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadError('Choose a fingerprint report file (.xlsx or .csv).');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadResult(null);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('period_label', periodLabel);
      const res = await leaveApi.post('/hr/attendance/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(res.data);
      toast(`Upload complete: ${res.data.ok} recorded, ${res.data.skipped} skipped.`);
      load();
    } catch (requestError) {
      setUploadError(friendlyError(requestError));
    } finally {
      setUploading(false);
    }
  };

  const openCorrect = (row) => {
    setCorrectRow(row);
    setCorrectForm({
      status: row.status,
      check_in: row.check_in ? String(row.check_in).slice(0, 5) : '',
      check_out: row.check_out ? String(row.check_out).slice(0, 5) : '',
      note: row.note || '',
    });
  };

  const submitCorrect = async (event) => {
    event.preventDefault();
    setCorrecting(true);
    try {
      await leaveApi.put(`/hr/attendance/${correctRow.id}`, correctForm);
      toast('Attendance corrected.');
      setCorrectRow(null);
      load();
    } catch (requestError) {
      toast(friendlyError(requestError));
    } finally {
      setCorrecting(false);
    }
  };

  return (
    <HrShell
      title="Staff Attendance"
      description="Fingerprint uploads, daily roster and manual corrections."
      allow={HR_OFFICE}
      wide
    >
      <section className={`${panel} p-[25px]`}>
        <div className={sectionHeading}>
          <div>
            <span className={eyebrow}>FINGERPRINT MACHINE</span>
            <h2 className={sectionHeadingTitle}>Weekly / monthly upload</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadTemplate}>
              <Download size={16} /> Template
            </Button>
            <Button
              onClick={() => {
                setUploadOpen(true);
                setUploadResult(null);
                setUploadError('');
              }}
            >
              <Upload size={16} /> Upload report
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Upload the biometric export (.xlsx/.csv). Login ID and Date columns are auto-detected;
          late is derived from duty start + grace. Manual corrections and approved leaves are never
          overwritten.
        </p>
        {uploads.length > 0 ? (
          <div className="mt-[14px] overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Recorded</th>
                  <th className="py-2 pr-3">Skipped</th>
                  <th className="py-2">Uploaded at</th>
                </tr>
              </thead>
              <tbody>
                {uploads.slice(0, 8).map((u) => (
                  <tr key={u.id} className="border-b border-line/60">
                    <td className="py-2 pr-3">{u.filename}</td>
                    <td className="py-2 pr-3">{u.period_label || '—'}</td>
                    <td className="py-2 pr-3">{u.rows_total}</td>
                    <td className="py-2 pr-3">{u.rows_ok}</td>
                    <td className="py-2 pr-3">{u.rows_skipped}</td>
                    <td className="py-2 text-muted">
                      {String(u.created_at).slice(0, 16).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className={`${panel} mt-[22px] p-[25px]`}>
        <div className={sectionHeading}>
          <div>
            <span className={eyebrow}>DAILY ROSTER</span>
            <h2 className={sectionHeadingTitle}>Attendance record</h2>
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
        <div className="mt-[16px] flex flex-wrap gap-2">
          <input
            type="date"
            className={filterInputClass}
            value={filters.from}
            onChange={(e) => {
              setRosterPage(1);
              setFilters({ ...filters, from: e.target.value });
            }}
          />
          <input
            type="date"
            className={filterInputClass}
            value={filters.to}
            onChange={(e) => {
              setRosterPage(1);
              setFilters({ ...filters, to: e.target.value });
            }}
          />
          <select
            className={filterInputClass}
            value={filters.person_type}
            onChange={(e) => {
              setRosterPage(1);
              setFilters({ ...filters, person_type: e.target.value });
            }}
          >
            <option value="">Teachers + Staff</option>
            <option value="teacher">Teachers</option>
            <option value="staff">Staff</option>
          </select>
          <select
            className={filterInputClass}
            value={filters.status}
            onChange={(e) => {
              setRosterPage(1);
              setFilters({ ...filters, status: e.target.value });
            }}
          >
            <option value="">All statuses</option>
            {ATT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            className={filterInputClass}
            value={filters.department_id}
            onChange={(e) => {
              setRosterPage(1);
              setFilters({ ...filters, department_id: e.target.value });
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className={emptyState}>Loading roster…</p>
        ) : error ? (
          <p className={`${emptyState} text-danger`}>{error}</p>
        ) : rows.length === 0 ? (
          <p className={emptyState}>
            No attendance in this range. Upload a fingerprint report first.
          </p>
        ) : (
          <>
            <div className="mt-[14px] overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Login</th>
                    <th className="py-2 pr-3">Department</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">In</th>
                    <th className="py-2 pr-3">Out</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line/60">
                      <td className="py-2 pr-3">{String(r.att_date).slice(0, 10)}</td>
                      <td className="py-2 pr-3 font-medium text-ink">
                        {r.person_name} <span className="text-muted">({r.person_type})</span>
                      </td>
                      <td className="py-2 pr-3">{r.login_id}</td>
                      <td className="py-2 pr-3">{r.department_name || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={statusBadge(r.status === 'on_leave' ? 'late' : r.status)}>
                          {String(r.status).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {r.check_in ? String(r.check_in).slice(0, 5) : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {r.check_out ? String(r.check_out).slice(0, 5) : '—'}
                      </td>
                      <td className="py-2 pr-3 capitalize">{r.source}</td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => openCorrect(r)}
                        >
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={rosterPage} total={rosterTotal} limit={10} onChange={setRosterPage} />
          </>
        )}
      </section>

      {uploadOpen ? (
        <Modal
          eyebrow="FINGERPRINT REPORT"
          title="Upload attendance"
          onClose={() => setUploadOpen(false)}
        >
          <form onSubmit={submitUpload} className="grid gap-4 p-6">
            <Field label="Period label (e.g. 2026-09 W2 or 2026-09)">
              <input
                className={inputClass}
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="2026-09 W2"
              />
            </Field>
            <Field label="Report file (.xlsx / .csv)">
              <input ref={fileRef} type="file" accept=".xlsx,.csv" className={inputClass} />
            </Field>
            {uploadError ? <p className={formError}>{uploadError}</p> : null}
            {uploadResult ? (
              <div className="rounded-md bg-[#edf7ef] px-3 py-2 text-xs text-success">
                Total {uploadResult.total} · recorded {uploadResult.ok} · skipped{' '}
                {uploadResult.skipped}
                {(uploadResult.errors || []).length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-danger">
                    {uploadResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUploadOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {correctRow ? (
        <Modal
          eyebrow="MANUAL CORRECTION"
          title={`${correctRow.person_name} — ${String(correctRow.att_date).slice(0, 10)}`}
          onClose={() => setCorrectRow(null)}
        >
          <form onSubmit={submitCorrect} className="grid gap-4 p-6">
            <Field label="Status">
              <select
                className={inputClass}
                value={correctForm.status}
                onChange={(e) => setCorrectForm({ ...correctForm, status: e.target.value })}
              >
                {ATT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Check in">
                <input
                  type="time"
                  className={inputClass}
                  value={correctForm.check_in}
                  onChange={(e) => setCorrectForm({ ...correctForm, check_in: e.target.value })}
                />
              </Field>
              <Field label="Check out">
                <input
                  type="time"
                  className={inputClass}
                  value={correctForm.check_out}
                  onChange={(e) => setCorrectForm({ ...correctForm, check_out: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Note">
              <input
                className={inputClass}
                value={correctForm.note}
                onChange={(e) => setCorrectForm({ ...correctForm, note: e.target.value })}
                placeholder="Correction reason"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCorrectRow(null)}>
                Close
              </Button>
              <Button type="submit" disabled={correcting}>
                {correcting ? 'Saving…' : 'Save correction'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </HrShell>
  );
}
