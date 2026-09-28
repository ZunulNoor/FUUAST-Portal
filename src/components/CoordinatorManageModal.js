'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, UserRoundCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { inputClass } from '@/components/ui/Field';
import { staffApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { friendlyError } from '@/lib/apiError';

export default function CoordinatorManageModal({ teacher, user, onClose, onSaved }) {
  const toast = useToastStore((state) => state.toast);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [selected, setSelected] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [stateResponse, classesResponse] = await Promise.all([
          staffApi.get(`/teachers/${teacher.id}/coordinator`),
          staffApi.get('/classes'),
        ]);
        if (!active) return;
        const state = stateResponse.data || {};
        setIsCoordinator(Boolean(Number(state.is_coordinator)));
        setSelected((state.sections || []).map((section) => Number(section.class_id)));
        let classRows = classesResponse.data?.data || classesResponse.data || [];
        if (user.role === 'admin') {
          classRows = classRows.filter(
            (classRow) => Number(classRow.department_id) === Number(user.departmentId),
          );
        }
        setClasses(classRows);
      } catch (requestError) {
        setError(friendlyError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [teacher.id, user.role, user.departmentId]);

  const toggleClass = (classId) => {
    setSelected((current) =>
      current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId],
    );
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await staffApi.put(`/teachers/${teacher.id}/coordinator`, {
        is_coordinator: isCoordinator,
        class_ids: isCoordinator ? selected : [],
      });
      toast.success(isCoordinator ? 'Coordinator status saved.' : 'Coordinator status removed.');
      onSaved();
    } catch (requestError) {
      setError(friendlyError(requestError));
      setSaving(false);
    }
  };

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return classes;
    return classes.filter((classRow) => {
      const code = String(classRow.class_code || '').toLowerCase();
      const section = String(classRow.section_name || '').toLowerCase();
      const batch = String(classRow.batch_name || '').toLowerCase();
      return code.includes(term) || section.includes(term) || batch.includes(term);
    });
  }, [classes, search]);

  const groupedClasses = useMemo(() => {
    const groups = new Map();
    for (const classRow of filteredClasses) {
      const key = classRow.batch_name || 'Other batches';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(classRow);
    }
    return [...groups.entries()];
  }, [filteredClasses]);

  return (
    <Modal
      size="lg"
      eyebrow="COORDINATOR"
      title={teacher.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="min-w-0 overflow-y-auto p-5 sm:px-6">
        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Loading coordinator details…</p>
        ) : (
          <>
            <div className="mb-5 rounded-lg border border-line bg-surface/50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-brand"
                  checked={isCoordinator}
                  onChange={(event) => setIsCoordinator(event.target.checked)}
                />
                <span>
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <UserRoundCheck size={16} className="text-action" />
                    {isCoordinator ? 'Coordinator' : 'Promote to Coordinator'}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    A Coordinator can view teachers&apos; class counts, review student attendance
                    (read-only), export checklists, and create extra classes for the sections
                    assigned below.
                  </span>
                </span>
              </label>
            </div>

            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-dark">
                Assigned sections {isCoordinator ? `(${selected.length})` : ''}
              </span>
              <input
                className={`${inputClass} h-9 w-48 py-1 text-sm`}
                type="search"
                placeholder="Search sections…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
              {groupedClasses.length ? (
                groupedClasses.map(([groupName, classRows]) => (
                  <div key={groupName}>
                    <div className="sticky top-0 border-b border-line bg-paper px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      {groupName}
                    </div>
                    {classRows.map((classRow) => {
                      const checked = selected.includes(Number(classRow.id));
                      return (
                        <label
                          key={classRow.id}
                          className={`flex cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-2.5 transition last:border-b-0 hover:bg-surface/70 ${
                            checked ? 'bg-success/5' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand"
                            checked={checked}
                            disabled={!isCoordinator}
                            onChange={() => toggleClass(Number(classRow.id))}
                          />
                          <span className="min-w-0 truncate text-sm font-semibold text-ink">
                            {classRow.class_code}
                          </span>
                          <span className="truncate text-xs text-muted">
                            Section {classRow.section_name}
                            {classRow.batch_name ? ` · ${classRow.batch_name}` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  {classes.length ? 'No sections match your search.' : 'No sections available yet.'}
                </p>
              )}
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck size={13} className="text-success" />
              Only sections you can manage are listed. Super Admins and keen admins see all; Admins
              see their own department.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
