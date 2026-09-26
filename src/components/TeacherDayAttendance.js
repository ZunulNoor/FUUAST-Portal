'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, ChevronDown, RefreshCw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import PortalSidebar from './PortalSidebar';
import PageHeader from './PageHeader';
import Button from '@/components/ui/Button';
import {
  panel,
  portalMain,
  portalContent,
  eyebrow,
  sectionHeading,
  sectionHeadingTitle,
  emptyState,
  statusBadge,
} from '@/components/ui/cx';
import { inputClass } from '@/components/ui/Field';

const todayStr = () => new Date().toISOString().slice(0, 10);

const rowKey = (row, index) =>
  `${row.class_subject_teacher_id}::${row.class_id ?? 'none'}::${row.session_id ?? 'new'}::${index}`;

function classStatus(row, roster) {
  if (roster?.dirty) return { label: 'Unsaved changes', tone: 'bg-[#fff5e8] text-warning' };
  const marked = Number(row.marked) || 0;
  if (row.session_id && marked > 0) return { label: 'Saved', tone: 'bg-[#edf7ef] text-success' };
  if (row.session_id) return { label: 'Open', tone: 'bg-brand-soft text-brand' };
  return { label: 'Not started', tone: 'bg-surface text-muted' };
}

export default function TeacherDayAttendance() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const toast = useToastStore((state) => state.toast);
  const [date, setDate] = useState(todayStr());
  const [dayRows, setDayRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [rosters, setRosters] = useState({});
  const [busyKey, setBusyKey] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  const loadDay = useCallback(async (forDate) => {
    setLoading(true);
    setError('');
    try {
      const response = await staffApi.get('/attendance/my-day', { params: { date: forDate } });
      setDayRows(response.data?.classes || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Unable to load your classes for this date.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.push('/staff/login');
    else if (user.role !== 'teacher') router.replace('/staff');
    else loadDay(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, router]);

  const refreshDay = async () => {
    await loadDay(date);
  };

  const ensureRoster = async (row, index) => {
    const key = rowKey(row, index);
    if (rosters[key]) return rosters[key];
    let sessionId = row.session_id || null;
    if (!sessionId) {
      try {
        const created = await staffApi.post('/attendance/sessions', {
          class_subject_teacher_id: row.class_subject_teacher_id,
          class_id: row.class_id,
          session_date: date,
          time_slot: row.time_slot || null,
        });
        sessionId = created.data?.id || null;
      } catch (createError) {
        if (createError.response?.status === 409) {
          const found = await staffApi.get('/attendance/sessions', {
            params: {
              class_subject_teacher_id: row.class_subject_teacher_id,
              class_id: row.class_id,
              date,
            },
          });
          sessionId = found.data?.[0]?.id || null;
        } else {
          throw createError;
        }
      }
    }
    if (!sessionId) throw new Error('Unable to open a session for this class.');
    const roster = await staffApi.get(`/attendance/sessions/${sessionId}/roster`);
    const entry = {
      sessionId,
      students: (roster.data.students || []).map((s) => ({ ...s, status: s.status || '' })),
      dirty: false,
    };
    setRosters((current) => ({ ...current, [key]: entry }));
    return entry;
  };

  const toggleExpand = async (row, index) => {
    const key = rowKey(row, index);
    if (expanded[key]) {
      setExpanded((current) => ({ ...current, [key]: false }));
      return;
    }
    setExpanded((current) => ({ ...current, [key]: true }));
    if (rosters[key]) return;
    setBusyKey(key);
    setError('');
    try {
      await ensureRoster(row, index);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to open this class roster.');
      setExpanded((current) => ({ ...current, [key]: false }));
    } finally {
      setBusyKey('');
    }
  };

  const setStudentStatus = (key, studentId, status) => {
    setRosters((current) => {
      const entry = current[key];
      if (!entry) return current;
      return {
        ...current,
        [key]: {
          ...entry,
          dirty: true,
          students: entry.students.map((s) => (s.id === studentId ? { ...s, status } : s)),
        },
      };
    });
  };

  const markAllPresent = (key) => {
    setRosters((current) => {
      const entry = current[key];
      if (!entry) return current;
      return {
        ...current,
        [key]: {
          ...entry,
          dirty: true,
          students: entry.students.map((s) => ({ ...s, status: 'present' })),
        },
      };
    });
  };

  const saveClass = async (row, index) => {
    const key = rowKey(row, index);
    const entry = rosters[key] || (await ensureRoster(row, index));
    const records = entry.students.map(({ id, status, remarks }) => ({
      student_id: id,
      status: status || 'absent',
      remarks: remarks || '',
    }));
    await staffApi.put(`/attendance/sessions/${entry.sessionId}/records`, { records });
    setRosters((current) => ({
      ...current,
      [key]: {
        ...entry,
        dirty: false,
        students: entry.students.map((s) => (s.status ? s : { ...s, status: 'absent' })),
      },
    }));
    return entry.students.length;
  };

  const handleSaveClass = async (row, index) => {
    const key = rowKey(row, index);
    setBusyKey(key);
    setError('');
    try {
      const count = await saveClass(row, index);
      toast.success(`Attendance saved for ${row.subject_name} (${row.class_code}) — ${count} student(s).`);
      await refreshDay();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to save this class.');
    } finally {
      setBusyKey('');
    }
  };

  const handleSaveAll = async () => {
    const dirtyKeys = dayRows
      .map((row, index) => ({ row, index, key: rowKey(row, index) }))
      .filter(({ key }) => rosters[key]?.dirty);
    // Also open every unopened class so nothing is skipped silently? No — only save what was marked.
    if (dirtyKeys.length === 0) {
      toast.success('Nothing new to save.');
      return;
    }
    setSavingAll(true);
    setError('');
    try {
      let classes = 0;
      let students = 0;
      for (const { row, index } of dirtyKeys) {
        // eslint-disable-next-line no-await-in-loop
        students += await saveClass(row, index);
        classes += 1;
      }
      toast.success(`Saved ${classes} class(es) — ${students} student record(s) in one go.`);
      await refreshDay();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to save all classes.');
    } finally {
      setSavingAll(false);
    }
  };

  const totals = dayRows.reduce(
    (acc, row) => ({
      classes: acc.classes + 1,
      enrolled: acc.enrolled + (Number(row.enrolled) || 0),
      marked: acc.marked + (Number(row.marked) || 0),
      present: acc.present + (Number(row.present_count) || 0),
      saved: acc.saved + (row.session_id && Number(row.marked) > 0 ? 1 : 0),
    }),
    { classes: 0, enrolled: 0, marked: 0, present: 0, saved: 0 },
  );

  if (!hydrated || !user || user.role !== 'teacher') return null;

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <PageHeader
          title="Mark attendance"
          description="All of your classes for the day on one screen — open each roster, mark, then save everything together."
          portal="staff"
        />
        <div className={portalContent}>
          <div className="mb-[18px] flex gap-2">
            <Link
              href="/staff/mark-attendance?mode=day"
              className="rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white"
            >
              My day (3-in-1)
            </Link>
            <Link
              href="/staff/mark-attendance?mode=single"
              className="rounded-md border border-line bg-paper px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-surface"
            >
              Single class
            </Link>
          </div>

          <section className={`${panel} p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>TEACHER WORKSPACE</span>
                <h2 className={sectionHeadingTitle}>My classes</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className={inputClass}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setRosters({});
                    setExpanded({});
                    if (event.target.value) loadDay(event.target.value);
                  }}
                />
                <button
                  type="button"
                  onClick={refreshDay}
                  title="Refresh day"
                  className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            {!loading && dayRows.length > 0 ? (
              <div className="mt-[16px] flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted">
                <span><strong className="text-ink">{totals.classes}</strong> classes</span>
                <span><strong className="text-ink">{totals.enrolled}</strong> students total</span>
                <span><strong className="text-ink">{totals.present}</strong> present marked</span>
                <span><strong className="text-ink">{totals.saved}/{totals.classes}</strong> classes saved</span>
              </div>
            ) : null}

            {loading ? (
              <p className={emptyState}>Loading your day…</p>
            ) : error && dayRows.length === 0 ? (
              <p className={`${emptyState} text-danger`}>{error}</p>
            ) : dayRows.length === 0 ? (
              <p className={emptyState}>No classes on your timetable for this date.</p>
            ) : (
              <div className="mt-[18px] grid gap-3">
                {dayRows.map((row, index) => {
                  const key = rowKey(row, index);
                  const isOpen = Boolean(expanded[key]);
                  const roster = rosters[key];
                  const st = classStatus(row, roster);
                  const present = roster
                    ? roster.students.filter((s) => s.status === 'present').length
                    : Number(row.present_count) || 0;
                  const rosterTotal = roster ? roster.students.length : Number(row.enrolled) || 0;
                  return (
                    <div key={key} className="overflow-hidden rounded-md border border-line">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row, index)}
                        className="flex w-full flex-wrap items-center gap-3 bg-surface px-4 py-3 text-left transition hover:bg-brand-soft/40"
                      >
                        <ChevronDown
                          size={17}
                          className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                        <span className="min-w-[86px] font-mono text-[13px] font-bold text-brand">
                          {row.start_time || ''}{row.end_time ? `–${row.end_time}` : ''}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">
                            {row.subject_name} <span className="font-normal text-muted">({row.subject_code})</span>
                          </span>
                          <span className="block text-xs text-muted">
                            {row.class_code || row.section_name || 'Section'} · {row.batch_name} · Sem {row.semester_number}
                          </span>
                        </span>
                        <span className="text-xs text-muted">
                          {present}/{rosterTotal} present
                        </span>
                        <span className={`rounded-[4px] px-2 py-[5px] text-[10px] font-bold ${st.tone}`}>
                          {st.label}
                        </span>
                      </button>
                      {isOpen ? (
                        <div className="border-t border-line bg-paper px-4 py-3">
                          {busyKey === key && !roster ? (
                            <p className={emptyState}>Opening roster…</p>
                          ) : !roster || roster.students.length === 0 ? (
                            <p className={emptyState}>No students enrolled in this class.</p>
                          ) : (
                            <>
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-muted">
                                  {roster.students.length} student(s) — unmarked count as absent on save.
                                </span>
                                <div className="flex gap-2">
                                  <Button variant="secondary" onClick={() => markAllPresent(key)}>
                                    <CheckCheck size={15} /> All present
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveClass(row, index)}
                                    disabled={busyKey === key}
                                  >
                                    <Save size={15} /> {busyKey === key ? 'Saving…' : 'Save class'}
                                  </Button>
                                </div>
                              </div>
                              <div className="grid gap-1">
                                {roster.students.map((student) => (
                                  <div
                                    key={student.id}
                                    className="flex items-center justify-between gap-3 rounded border border-line/60 px-3 py-[7px]"
                                  >
                                    <span className="min-w-0 flex-1 truncate text-[13px]">
                                      <strong>{student.name}</strong>{' '}
                                      <span className="text-muted">({student.student_id})</span>
                                    </span>
                                    <span className={statusBadge(student.status || 'late')}>
                                      {student.status || 'unmarked'}
                                    </span>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setStudentStatus(key, student.id, 'present')}
                                        className={`rounded px-2 py-1 text-xs font-bold ${student.status === 'present' ? 'bg-success text-white' : 'bg-surface text-muted hover:bg-[#edf7ef] hover:text-success'}`}
                                      >
                                        P
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setStudentStatus(key, student.id, 'absent')}
                                        className={`rounded px-2 py-1 text-xs font-bold ${student.status === 'absent' ? 'bg-danger text-white' : 'bg-surface text-muted hover:bg-[#fff0f0] hover:text-danger'}`}
                                      >
                                        A
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {error && dayRows.length > 0 ? <p className={`${emptyState} text-danger`}>{error}</p> : null}

            {!loading && dayRows.length > 0 ? (
              <div className="mt-[18px] flex justify-end">
                <Button onClick={handleSaveAll} disabled={savingAll}>
                  <Save size={16} /> {savingAll ? 'Saving all…' : 'Save all marked classes'}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
