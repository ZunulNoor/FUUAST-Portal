'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Upload, Download } from 'lucide-react';
import { leaveApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import HrShell, { HR_OFFICE } from './HrShell';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Field, { inputClass } from '@/components/ui/Field';
import {
  panel, eyebrow, sectionHeading, sectionHeadingTitle, emptyState, formError, statusBadge, btnSecondary, filterInputClass,
} from '@/components/ui/cx';

const DESIGNATIONS = [
  { code: 'chairman', name: 'Chairman' },
  { code: 'dean', name: 'Dean' },
  { code: 'deputy_registrar', name: 'Deputy Registrar' },
  { code: 'registrar', name: 'Registrar' },
  { code: 'vice_chancellor', name: 'Vice Chancellor' },
  { code: 'management', name: 'Management' },
];

const emptyStaff = { name: '', login_id: '', email: '', phone: '', category: 'non_teaching', bps_grade: '', department_id: '', service_start_date: '', is_permanent: false, status: 'active' };

export default function HrStaff() {
  const toast = useToastStore((state) => state.toast);
  const importRef = useRef(null);
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ designation_code: 'chairman', actor_type: 'teacher', actor_id: '', department_id: '', is_alternate: false });
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const [sRes, dRes, aRes] = await Promise.all([
        leaveApi.get('/hr/staff', { params }),
        leaveApi.get('/hr/departments'),
        leaveApi.get('/hr/assignments'),
      ]);
      setStaff(sRes.data || []);
      setDepartments(dRes.data || []);
      setAssignments(aRes.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load staff.');
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing({ ...emptyStaff });
    setSaveError('');
    setEditOpen(true);
  };

  const openEdit = (row) => {
    setEditing({
      ...emptyStaff, ...row,
      bps_grade: row.bps_grade ?? '', department_id: row.department_id ?? '',
      service_start_date: row.service_start_date ? String(row.service_start_date).slice(0, 10) : '',
      is_permanent: Boolean(row.is_permanent),
    });
    setSaveError('');
    setEditOpen(true);
  };

  const submitStaff = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      if (editing.id) {
        await leaveApi.put(`/hr/staff/${editing.id}`, editing);
        toast('Staff member updated.');
      } else {
        const res = await leaveApi.post('/hr/staff', editing);
        toast(res.data?.temporaryPassword ? `Staff created. Temp password: ${res.data.temporaryPassword}` : 'Staff created.');
      }
      setEditOpen(false);
      load();
    } catch (requestError) {
      setSaveError(requestError.response?.data?.error?.message || 'Unable to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  const downloadStaffTemplate = async () => {
    try {
      const res = await leaveApi.get('/hr/staff/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'staff_import_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Unable to download template.');
    }
  };

  const submitImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await leaveApi.post('/hr/staff/import', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const pwds = res.data?.temporaryPasswords || {};
      const names = Object.keys(pwds);
      toast(`Imported: ${res.data.insertedCount} new, ${res.data.updatedCount} updated.${names.length ? ` Temp passwords: ${names.map((n) => `${n}=${pwds[n]}`).join(', ')}` : ''}`);
      load();
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || 'Import failed.');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    try {
      await leaveApi.post('/hr/assignments', { ...assignForm, actor_id: Number(assignForm.actor_id), department_id: assignForm.department_id ? Number(assignForm.department_id) : null });
      toast('Assignment saved.');
      setAssignOpen(false);
      load();
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || 'Unable to save assignment.');
    }
  };

  const deleteAssignment = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await leaveApi.delete(`/hr/assignments/${id}`);
      toast('Assignment removed.');
      load();
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || 'Unable to remove assignment.');
    }
  };

  return (
    <HrShell title="Staff Directory" description="Non-teaching and contract staff, plus hierarchy assignments." allow={HR_OFFICE} wide>
      <section className={`${panel} p-[25px]`}>
        <div className={sectionHeading}>
          <div>
            <span className={eyebrow}>NON-TEACHING · CONTRACT</span>
            <h2 className={sectionHeadingTitle}>Staff members</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} title="Refresh" className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft">
              <RefreshCw size={17} />
            </button>
            <Button variant="secondary" onClick={downloadStaffTemplate}><Download size={16} /> Template</Button>
            <Button variant="secondary" disabled={importing} onClick={() => importRef.current?.click()}>
              <Upload size={16} /> {importing ? 'Importing…' : 'Import'}
            </Button>
            <input ref={importRef} type="file" accept=".xlsx" className="hidden" onChange={submitImport} />
            <Button onClick={openCreate}><Plus size={16} /> Add staff</Button>
          </div>
        </div>
        <div className="mt-[16px] flex flex-wrap gap-2">
          <input className={filterInputClass} placeholder="Search name / login / email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={filterInputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="non_teaching">Non-teaching</option>
            <option value="contract">Contract</option>
          </select>
        </div>
        {loading ? (
          <p className={emptyState}>Loading staff…</p>
        ) : error ? (
          <p className={`${emptyState} text-danger`}>{error}</p>
        ) : staff.length === 0 ? (
          <p className={emptyState}>No staff members yet.</p>
        ) : (
          <div className="mt-[14px] overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Login ID</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">BPS</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Permanent</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{s.name}</td>
                    <td className="py-2 pr-3">{s.login_id}</td>
                    <td className="py-2 pr-3 capitalize">{String(s.category).replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3">{s.bps_grade ?? '—'}</td>
                    <td className="py-2 pr-3">{s.department_name || '—'}</td>
                    <td className="py-2 pr-3">{s.is_permanent ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-3"><span className={statusBadge(s.status === 'active' ? 'present' : 'absent')}>{s.status}</span></td>
                    <td className="py-2 text-right">
                      <button type="button" className={btnSecondary} onClick={() => openEdit(s)}>Edit</button>
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
            <span className={eyebrow}>HIERARCHY</span>
            <h2 className={sectionHeadingTitle}>Chairman · Dean · Registrar · VC assignments</h2>
          </div>
          <Button onClick={() => setAssignOpen(true)}><Plus size={16} /> Assign role</Button>
        </div>
        <p className="mt-3 text-[13px] text-muted">Chairmen are department-scoped and may have an alternate who auto-receives requests after 12 hours of inaction (or when the chairman is on leave).</p>
        {assignments.length === 0 ? (
          <p className={emptyState}>No assignments yet. Assign a Chairman per department to start the leave chain.</p>
        ) : (
          <div className="mt-[14px] overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Designation</th>
                  <th className="py-2 pr-3">Holder</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Alternate</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{a.designation_name}</td>
                    <td className="py-2 pr-3">{a.actor_name} <span className="text-muted">({a.actor_type})</span></td>
                    <td className="py-2 pr-3">{a.department_name || '—'}</td>
                    <td className="py-2 pr-3">{a.is_alternate ? 'Yes' : '—'}</td>
                    <td className="py-2 pr-3">{a.is_active ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-right">
                      <button type="button" className={btnSecondary} onClick={() => deleteAssignment(a.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editOpen ? (
        <Modal eyebrow="STAFF MEMBER" title={editing.id ? 'Edit staff' : 'Add staff'} onClose={() => setEditOpen(false)}>
          <form onSubmit={submitStaff} className="grid max-h-[70vh] gap-4 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name">
                <input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              </Field>
              <Field label="Login ID / staff code">
                <input className={inputClass} value={editing.login_id} onChange={(e) => setEditing({ ...editing, login_id: e.target.value })} required disabled={Boolean(editing.id)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email">
                <input className={inputClass} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select className={inputClass} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                  <option value="non_teaching">Non-teaching</option>
                  <option value="contract">Contract</option>
                </select>
              </Field>
              <Field label="BPS grade">
                <input type="number" min="1" max="22" className={inputClass} value={editing.bps_grade} onChange={(e) => setEditing({ ...editing, bps_grade: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <select className={inputClass} value={editing.department_id} onChange={(e) => setEditing({ ...editing, department_id: e.target.value })}>
                  <option value="">—</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Service start">
                <input type="date" className={inputClass} value={editing.service_start_date || ''} onChange={(e) => setEditing({ ...editing, service_start_date: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <select className={inputClass} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </Field>
              <label className="flex items-end gap-2 pb-2 text-[13px] text-ink">
                <input type="checkbox" checked={Boolean(editing.is_permanent)} onChange={(e) => setEditing({ ...editing, is_permanent: e.target.checked })} />
                Permanent (half-rate earned while unchecked)
              </label>
            </div>
            {saveError ? <p className={formError}>{saveError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Close</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {assignOpen ? (
        <Modal eyebrow="HIERARCHY" title="Assign designation" onClose={() => setAssignOpen(false)}>
          <form onSubmit={submitAssignment} className="grid gap-4 p-6">
            <Field label="Designation">
              <select className={inputClass} value={assignForm.designation_code} onChange={(e) => setAssignForm({ ...assignForm, designation_code: e.target.value })}>
                {DESIGNATIONS.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Holder type">
                <select className={inputClass} value={assignForm.actor_type} onChange={(e) => setAssignForm({ ...assignForm, actor_type: e.target.value })}>
                  <option value="user">User account</option>
                  <option value="teacher">Teacher</option>
                  <option value="staff">Staff</option>
                </select>
              </Field>
              <Field label="Holder ID" hint="users/teachers/staff_members row id">
                <input type="number" className={inputClass} value={assignForm.actor_id} onChange={(e) => setAssignForm({ ...assignForm, actor_id: e.target.value })} required />
              </Field>
            </div>
            <Field label="Department (required for Chairman)">
              <select className={inputClass} value={assignForm.department_id} onChange={(e) => setAssignForm({ ...assignForm, department_id: e.target.value })}>
                <option value="">Global / none</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" checked={assignForm.is_alternate} onChange={(e) => setAssignForm({ ...assignForm, is_alternate: e.target.checked })} />
              Alternate chairman (receives requests after 12h inaction)
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAssignOpen(false)}>Close</Button>
              <Button type="submit">Save assignment</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </HrShell>
  );
}
