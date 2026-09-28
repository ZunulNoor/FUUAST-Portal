'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Download, FilePlus2, ShieldAlert } from 'lucide-react';
import PortalSidebar from './PortalSidebar';
import PageHeader from './PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { inputClass } from '@/components/ui/Field';
import EmptyState from '@/components/ui/EmptyState';
import { panel, portalMain, portalContent, eyebrow } from '@/components/ui/cx';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { friendlyError } from '@/lib/apiError';

const STATUS_STYLES = {
  on_track: 'bg-success/10 text-success',
  behind: 'bg-warning/10 text-warning',
  critical: 'bg-danger/10 text-danger',
};

const STATUS_LABELS = {
  on_track: 'On track',
  behind: 'Behind',
  critical: 'Critical',
};

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = Object.keys(rows[0]).map(escape).join(',');
  const body = rows.map((row) => Object.values(row).map(escape).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CoordinatorPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const toast = useToastStore((state) => state.toast);
  const router = useRouter();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [sectionData, setSectionData] = useState({});
  const [extraClass, setExtraClass] = useState(null);
  const [savingExtra, setSavingExtra] = useState(false);
  const [extraError, setExtraError] = useState('');

  const loadChecklist = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await staffApi.get('/coordinator/checklist');
      setSections(response.data?.sections || []);
    } catch (requestError) {
      if (requestError.response?.status === 403) setDenied(true);
      else setError(friendlyError(requestError));
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/staff/login');
      return;
    }
    if (user.role !== 'teacher') {
      router.replace('/staff');
      return;
    }
    loadChecklist();
  }, [hydrated, user, router]);

  const loadStudents = async (classId) => {
    setSectionData((current) => ({ ...current, [classId]: { loading: true } }));
    try {
      const response = await staffApi.get('/coordinator/students', {
        params: { class_id: classId },
      });
      setSectionData((current) => ({
        ...current,
        [classId]: { loading: false, loaded: true, data: response.data || {} },
      }));
    } catch (requestError) {
      setSectionData((current) => ({
        ...current,
        [classId]: {
          loading: false,
          loaded: true,
          error: friendlyError(requestError),
        },
      }));
    }
  };

  const toggleSection = (section) => {
    if (expandedClassId === section.class_id) {
      setExpandedClassId(null);
      return;
    }
    setExpandedClassId(section.class_id);
    if (!sectionData[section.class_id]) loadStudents(section.class_id);
  };

  const exportChecklist = () => {
    const rows = [];
    for (const section of sections) {
      for (const offering of section.offerings || []) {
        rows.push({
          section: section.class_code,
          batch: section.batch_name,
          semester: section.semester_number ? `Semester ${section.semester_number}` : '',
          subject_code: offering.subject_code,
          subject: offering.subject_name,
          teacher: offering.teacher_name,
          expected_classes: offering.expected_classes,
          accrued_target: offering.accrued_target,
          classes_conducted: offering.classes_conducted,
          remaining: offering.remaining_target,
          status: STATUS_LABELS[offering.status],
        });
      }
    }
    if (!rows.length) {
      setError('Nothing to export yet.');
      return;
    }
    downloadCsv(`coordinator_checklist_${Date.now()}.csv`, rows);
    toast.success('Checklist exported.');
  };

  const exportStudents = (classId) => {
    const data = sectionData[classId]?.data;
    if (!data?.students?.length) return;
    const rows = data.students.map((student) => ({
      name: student.name,
      roll_no: student.roll_no,
      present: student.present,
      late: student.late,
      absent: student.absent,
      excused: student.excused,
      attendance_percentage: student.percentage,
    }));
    downloadCsv(`attendance_${data.section?.class_code || classId}_${Date.now()}.csv`, rows);
    toast.success('Student attendance exported.');
  };

  const openExtraClass = (classId) => {
    const section = sections.find((entry) => Number(entry.class_id) === Number(classId));
    setExtraError('');
    setExtraClass({
      class_id: classId,
      class_code: section?.class_code || '',
      offerings: section?.offerings || [],
    });
  };

  const saveExtraClass = async () => {
    setExtraError('');
    if (!extraClass) return;
    const { class_subject_teacher_id, session_date, time_slot } = extraClass;
    if (!class_subject_teacher_id || !session_date) {
      setExtraError('Select a subject and a date.');
      return;
    }
    setSavingExtra(true);
    try {
      await staffApi.post('/coordinator/extra-class', {
        class_subject_teacher_id: Number(class_subject_teacher_id),
        class_id: Number(extraClass.class_id),
        session_date,
        time_slot: time_slot || null,
      });
      toast.success('Extra class created. The teacher can now mark attendance for it.');
      setExtraClass(null);
      setExpandedClassId(extraClass.class_id);
      loadStudents(extraClass.class_id);
    } catch (requestError) {
      setExtraError(friendlyError(requestError));
    } finally {
      setSavingExtra(false);
    }
  };

  if (!hydrated || !user) return null;

  const totalBehind = sections.reduce((total, section) => {
    return total + (section.offerings || []).filter((o) => o.status !== 'on_track').length;
  }, 0);

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <PageHeader
          title="Coordinator"
          description="Section checklist — class counts vs expected credit hours, read-only student attendance, exports and extra classes."
          portal="staff"
        />
        <div className={portalContent}>
          <section className={`${panel} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className={eyebrow}>STAFF WORKSPACE</span>
                <h2 className="text-xl font-bold text-ink">My assigned sections</h2>
                <p className="mt-1 text-sm text-muted">
                  {sections.length
                    ? `${sections.length} section(s) · ${totalBehind} offering(s) behind schedule`
                    : 'No sections assigned yet. Ask your department admin to assign sections.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => loadChecklist()}>
                  Refresh
                </Button>
                <Button variant="primary" onClick={exportChecklist}>
                  <Download size={16} /> Export checklist
                </Button>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>
            ) : null}

            {denied ? (
              <div className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-8 text-center">
                <ShieldAlert className="mx-auto text-warning" size={28} />
                <p className="mt-3 font-semibold text-ink">Not assigned as a Coordinator</p>
                <p className="mt-1 text-sm text-muted">
                  Only teachers promoted to Coordinator by their department admin can use this
                  workspace.
                </p>
              </div>
            ) : null}

            <div className="mt-4">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted">Loading sections…</p>
              ) : sections.length ? (
                sections.map((section) => {
                  const expanded = expandedClassId === section.class_id;
                  const detail = sectionData[section.class_id];
                  return (
                    <div
                      key={section.class_id}
                      className="mb-4 overflow-hidden rounded-lg border border-line"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section)}
                        className="flex w-full items-center justify-between gap-3 bg-brand-soft/40 px-4 py-3 text-left transition hover:bg-brand-soft/60"
                      >
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-ink">{section.class_code}</span>
                            <span className="rounded-[4px] bg-paper px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">
                              Section {section.section_name}
                            </span>
                            <span className="text-xs text-muted">
                              {section.batch_name}
                              {section.semester_number
                                ? ` · Semester ${section.semester_number}`
                                : ''}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {section.student_count} students · day{' '}
                            {Math.min(section.semester_elapsed_days, section.semester_total_days)}{' '}
                            of {section.semester_total_days}
                          </span>
                        </span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-muted transition-transform duration-200 ${
                            expanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <div className="overflow-x-auto">
                        <div
                          className="grid items-center gap-3 border-b border-line bg-paper px-4 py-2"
                          style={{
                            gridTemplateColumns:
                              'minmax(160px,1.4fr) minmax(150px,1fr) repeat(4, minmax(84px,auto))',
                          }}
                        >
                          {['Subject', 'Teacher', 'Expected', 'Target', 'Done', 'Status'].map(
                            (label) => (
                              <span
                                key={label}
                                className="truncate text-[10px] font-bold uppercase tracking-wide text-brand-dark"
                              >
                                {label}
                              </span>
                            ),
                          )}
                        </div>
                        {(section.offerings || []).map((offering) => (
                          <div
                            key={offering.class_subject_teacher_id}
                            className="grid items-center gap-3 border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-surface/70"
                            style={{
                              gridTemplateColumns:
                                'minmax(160px,1.4fr) minmax(150px,1fr) repeat(4, minmax(84px,auto))',
                            }}
                          >
                            <span className="min-w-0 truncate text-sm text-ink">
                              <span className="font-semibold">{offering.subject_name}</span>{' '}
                              <span className="text-muted">({offering.subject_code})</span>
                            </span>
                            <span className="truncate text-sm text-muted">
                              {offering.teacher_name || 'No teacher'}
                            </span>
                            <span className="text-sm text-ink">{offering.expected_classes}</span>
                            <span className="text-sm text-ink">{offering.accrued_target}</span>
                            <span className="text-sm font-semibold text-ink">
                              {offering.classes_conducted}
                            </span>
                            <span>
                              <span
                                className={`inline-flex items-center rounded-[4px] px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                  STATUS_STYLES[offering.status] || 'bg-surface text-muted'
                                }`}
                              >
                                {STATUS_LABELS[offering.status]}
                              </span>
                            </span>
                          </div>
                        ))}
                        {!(section.offerings || []).length ? (
                          <p className="px-4 py-5 text-center text-sm text-muted">
                            No subjects are being taught in this section yet.
                          </p>
                        ) : null}
                      </div>

                      {expanded ? (
                        <div className="border-t border-line bg-paper">
                          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line px-4 py-2.5">
                            <Button
                              variant="secondary"
                              onClick={() => openExtraClass(section.class_id)}
                            >
                              <FilePlus2 size={15} /> Add extra class
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => exportStudents(section.class_id)}
                              disabled={!sectionData[section.class_id]?.data?.students?.length}
                            >
                              <Download size={15} /> Export students
                            </Button>
                          </div>
                          {detail?.loading ? (
                            <p className="px-4 py-8 text-center text-sm text-muted">
                              Loading student attendance…
                            </p>
                          ) : detail?.error ? (
                            <p className="px-4 py-6 text-sm text-danger">{detail.error}</p>
                          ) : detail?.data?.students?.length ? (
                            <div className="overflow-x-auto">
                              <div
                                className="grid items-center gap-3 border-b border-line px-4 py-2"
                                style={{
                                  gridTemplateColumns:
                                    'minmax(150px,1.5fr) minmax(80px,0.7fr) repeat(5, minmax(70px,auto))',
                                }}
                              >
                                {[
                                  'Name',
                                  'Roll no',
                                  'Present',
                                  'Late',
                                  'Absent',
                                  'Excused',
                                  'Attendance',
                                ].map((label) => (
                                  <span
                                    key={label}
                                    className="truncate text-[10px] font-bold uppercase tracking-wide text-brand-dark"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                              {detail.data.students.map((student) => (
                                <div
                                  key={student.id}
                                  className="grid items-center gap-3 border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-surface/70"
                                  style={{
                                    gridTemplateColumns:
                                      'minmax(150px,1.5fr) minmax(80px,0.7fr) repeat(5, minmax(70px,auto))',
                                  }}
                                >
                                  <span className="min-w-0 truncate text-sm font-semibold text-ink">
                                    {student.name}
                                  </span>
                                  <span className="truncate text-sm text-muted">
                                    {student.roll_no}
                                  </span>
                                  <span className="text-sm text-success">{student.present}</span>
                                  <span className="text-sm text-warning">{student.late}</span>
                                  <span className="text-sm text-danger">{student.absent}</span>
                                  <span className="text-sm text-muted">{student.excused}</span>
                                  <span className="text-sm font-semibold text-ink">
                                    {student.percentage}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <EmptyState />
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <EmptyState />
              )}
            </div>
          </section>
        </div>
      </main>

      {extraClass ? (
        <Modal
          size="lg"
          eyebrow="EXTRA CLASS"
          title={`Add extra class — ${extraClass.class_code}`}
          onClose={() => setExtraClass(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setExtraClass(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveExtraClass} disabled={savingExtra}>
                {savingExtra ? 'Creating…' : 'Create extra class'}
              </Button>
            </>
          }
        >
          <div className="min-w-0 overflow-y-auto p-5 sm:px-6">
            {extraError ? (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
                {extraError}
              </p>
            ) : null}
            <p className="mb-4 text-xs leading-relaxed text-muted">
              This creates an attendance session the assigned teacher can mark on top of their
              regular timetable — useful for makeup/extra lectures held beyond the usual schedule.
            </p>
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-dark">
                  Subject / offering *
                </span>
                <select
                  className={inputClass}
                  value={extraClass.class_subject_teacher_id || ''}
                  onChange={(event) =>
                    setExtraClass((current) => ({
                      ...current,
                      class_subject_teacher_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Select a subject</option>
                  {(extraClass.offerings || []).map((offering) => (
                    <option
                      key={offering.class_subject_teacher_id}
                      value={offering.class_subject_teacher_id}
                    >
                      {offering.subject_name} ({offering.subject_code}) —{' '}
                      {offering.teacher_name || 'No teacher'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-dark">
                    Date *
                  </span>
                  <input
                    className={inputClass}
                    type="date"
                    value={extraClass.session_date || ''}
                    onChange={(event) =>
                      setExtraClass((current) => ({ ...current, session_date: event.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-dark">
                    Time slot
                  </span>
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="e.g. 14:00-15:00"
                    value={extraClass.time_slot || ''}
                    onChange={(event) =>
                      setExtraClass((current) => ({ ...current, time_slot: event.target.value }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
