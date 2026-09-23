'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import PortalSidebar from './PortalSidebar';
import PortalHeaderUser from './PortalHeaderUser';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
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
  emptyState,
  formError,
  errorTop,
} from '@/components/ui/cx';

const statuses = ['present', 'absent'];
const statusLabels = {
  present: 'Present',
  absent: 'Absent',
};

export default function TeacherAttendancePage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const toast = useToastStore((state) => state.toast);
  const [offerings, setOfferings] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [sectionId, setSectionId] = useState('');
  const [mergeEnabled, setMergeEnabled] = useState(false);
  const [mergeGroupId, setMergeGroupId] = useState(null);
  const [mergedDate, setMergedDate] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const subjectBoxRef = useRef(null);
  const quickInputRef = useRef(null);
  const quickTimerRef = useRef(null);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickMarkedName, setQuickMarkedName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (quickTimerRef.current) clearTimeout(quickTimerRef.current);
    };
  }, []);

  const loadOfferings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await staffApi.get('/attendance/offerings');
      setOfferings(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load your courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.push('/staff/login');
    else if (user.role !== 'teacher') router.replace('/staff');
    else loadOfferings();
  }, [hydrated, user, router]);

  useEffect(() => {
    const close = (event) => {
      if (subjectBoxRef.current && !subjectBoxRef.current.contains(event.target)) {
        setSubjectOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const departments = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const offering of offerings) {
      const key = String(offering.department_id ?? '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push({
        id: offering.department_id,
        name: offering.department_name || 'Department',
      });
    }
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return list;
  }, [offerings]);

  const scopedOfferings = useMemo(
    () =>
      offerings.filter(
        (offering) =>
          !departmentId || String(offering.department_id) === String(departmentId),
      ),
    [offerings, departmentId],
  );

  const subjects = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const offering of scopedOfferings) {
      const key = String(offering.subject_id);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({
        subject_id: offering.subject_id,
        subject_name: offering.subject_name,
        semester_id: offering.semester_id,
        semester_number: offering.semester_number,
        batch_name: offering.batch_name,
      });
    }
    list.sort((a, b) => String(a.subject_name).localeCompare(String(b.subject_name)));
    return list;
  }, [scopedOfferings]);

  const subjectOfferings = useMemo(
    () => scopedOfferings.filter((o) => String(o.subject_id) === String(subjectId)),
    [scopedOfferings, subjectId],
  );

  const sections = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const offering of subjectOfferings) {
      const key = String(offering.class_id ?? '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push({
        classSubjectTeacherId: offering.class_subject_teacher_id,
        classId: offering.class_id,
        classCode: offering.class_code,
        sectionName: offering.section_name,
        semesterId: offering.semester_id,
        semesterNumber: offering.semester_number,
      });
    }
    list.sort((a, b) => String(a.classCode).localeCompare(String(b.classCode)));
    return list;
  }, [subjectOfferings]);

  const filteredSubjects = useMemo(
    () =>
      subjectQuery.trim()
        ? subjects.filter((subject) =>
            String(subject.subject_name)
              .toLowerCase()
              .includes(subjectQuery.trim().toLowerCase()),
          )
        : subjects,
    [subjects, subjectQuery],
  );

  const selectedSection = sections.find(
    (section) => sectionId === `${section.classSubjectTeacherId}::${section.classId}`,
  );
  const selectedSubject = subjects.find((s) => String(s.subject_id) === String(subjectId));
  const resolvedSemester = mergeEnabled
    ? selectedSection?.semesterId || selectedSubject?.semester_id || ''
    : selectedSection?.semesterId || '';

  const quickMatches = useMemo(() => {
    const needle = quickQuery.trim();
    if (!needle) return [];
    return students
      .filter((student) => String(student.student_id || '').endsWith(needle))
      .slice(0, 8);
  }, [students, quickQuery]);

  const presentCount = students.filter((student) => student.status === 'present').length;
  const absentCount = students.filter((student) => student.status === 'absent').length;
  const unmarkedCount = students.length - presentCount - absentCount;
  const hasPresent = presentCount > 0;

  const selectSubject = (subject) => {
    setSubjectId(subject.subject_id);
    setSubjectQuery(subject.subject_name);
    setSubjectOpen(false);
    setSectionId('');
  };

  const quickMark = async (student) => {
    setSaving(true);
    setError('');
    try {
      const records = [
        { student_id: student.id, status: 'present', remarks: student.remarks || '' },
      ];
      if (mergeGroupId && mergedDate) {
        await staffApi.put(`/attendance/sessions/merged/${mergeGroupId}/records`, {
          date: mergedDate,
          records,
        });
      } else {
        await staffApi.put(`/attendance/sessions/${sessionId}/records`, { records });
      }
      setStudents((current) =>
        current.map((item) =>
          item.id === student.id ? { ...item, status: 'present' } : item,
        ),
      );
      setQuickMarkedName(`${student.name} (${student.student_id})`);
      setQuickQuery('');
      if (quickTimerRef.current) clearTimeout(quickTimerRef.current);
      quickTimerRef.current = setTimeout(() => setQuickMarkedName(''), 2500);
      if (quickInputRef.current) quickInputRef.current.focus();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message || 'Unable to mark this student.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openRoster = async (event) => {
    event.preventDefault();
    if (!subjectId) {
      setError('Select a subject first.');
      return;
    }
    if (!sessionDate) return;
    if (!mergeEnabled && !sectionId) {
      setError('Select a section, or turn on "Merge all sections" to load every section at once.');
      return;
    }
    if (mergeEnabled && !resolvedSemester) {
      setError('Unable to resolve the semester for this subject.');
      return;
    }
    setSaving(true);
    setError('');
    setSessionId(null);
    setMergeGroupId(null);
    setMergedDate('');
    const date = sessionDate;
    try {
      if (mergeEnabled) {
        const response = await staffApi.post('/attendance/sessions/merged-roster', {
          subject_id: subjectId,
          semester_id: resolvedSemester,
          date,
        });
        const data = response.data || {};
        setMergeGroupId(data.mergeGroupId || null);
        setMergedDate(data.date || date);
        setStudents(
          (data.students || []).map((student) => ({
            ...student,
            status: student.status || '',
            remarks: student.remarks || '',
          })),
        );
      } else {
        const [cstId, classId] = sectionId.split(':');
        const sessionsResponse = await staffApi.get('/attendance/sessions', {
          params: { class_subject_teacher_id: cstId, class_id: classId, date },
        });
        let session = sessionsResponse.data?.[0];
        if (!session) {
          const created = await staffApi.post('/attendance/sessions', {
            class_subject_teacher_id: cstId,
            class_id: classId,
            session_date: date,
            time_slot: timeSlot || null,
          });
          session = created.data;
        }
        const roster = await staffApi.get(`/attendance/sessions/${session.id}/roster`);
        setSessionId(session.id);
        setStudents(
          (roster.data.students || []).map((student) => ({
            ...student,
            status: student.status || '',
            remarks: student.remarks || '',
          })),
        );
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to open this attendance roster.');
    } finally {
      setSaving(false);
    }
  };

  const openSaveModal = () => {
    setError('');
    setSaveOpen(true);
  };

  const commitSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { absentCount: autoAbsent, records } = students.reduce(
        (acc, { id, status, remarks }) => {
          const resolved = status || 'absent';
          if (resolved === 'absent' && !status) acc.autoAbsent += 1;
          acc.records.push({ student_id: id, status: resolved, remarks });
          return acc;
        },
        { autoAbsent: 0, records: [] },
      );
      if (mergeGroupId && mergedDate) {
        await staffApi.put(`/attendance/sessions/merged/${mergeGroupId}/records`, {
          date: mergedDate,
          records,
        });
      } else {
        await staffApi.put(`/attendance/sessions/${sessionId}/records`, { records });
      }
      setStudents((current) =>
        current.map((item) => (item.status ? item : { ...item, status: 'absent' })),
      );
      setSaveOpen(false);
      toast.success(
        autoAbsent
          ? `Attendance saved — ${autoAbsent} unmarked student(s) were recorded as absent.`
          : mergeGroupId
            ? 'Attendance saved for all merged sections.'
            : 'Attendance saved successfully.',
      );
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !user || user.role !== 'teacher') return null;

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <header className={portalHeader}>
          <div>
            <h1 className={headerTitle}>Mark attendance</h1>
            <p className={headerSub}>
              Pick a subject (and section) from your assigned courses, then mark its roster.
            </p>
          </div>
          <PortalHeaderUser portal="staff" />
        </header>
        <div className={portalContent}>
          <section className={`${panel} p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>TEACHER WORKSPACE</span>
                <h2 className={sectionHeadingTitle}>Session roster</h2>
              </div>
              <button
                type="button"
                className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft"
                onClick={loadOfferings}
                title="Refresh courses"
              >
                <RefreshCw size={17} />
              </button>
            </div>
            <form
              className="mt-[22px] flex flex-wrap items-end gap-[14px]"
              onSubmit={openRoster}
            >
              <label className="grid min-w-[160px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark">
                Department (optional)
                <select
                  className={inputClass}
                  value={departmentId}
                  onChange={(event) => {
                    setDepartmentId(event.target.value);
                    setSubjectId('');
                    setSubjectQuery('');
                    setSectionId('');
                  }}
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-[240px] flex-[2] gap-[7px] text-xs font-semibold text-brand-dark">
                Subject
                <div className="relative min-w-0" ref={subjectBoxRef}>
                  <input
                    className={inputClass}
                    type="search"
                    value={subjectQuery}
                    placeholder="Search subject…"
                    onFocus={() => setSubjectOpen(true)}
                    onChange={(event) => {
                      setSubjectQuery(event.target.value);
                      setSubjectId('');
                      setSectionId('');
                      setSubjectOpen(true);
                    }}
                    required
                  />
                  {subjectOpen ? (
                    <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-xl">
                      {filteredSubjects.length ? (
                        filteredSubjects.map((subject) => (
                          <button
                            key={subject.subject_id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectSubject(subject)}
                            className="block w-full truncate px-3 py-2 text-left text-sm text-ink transition hover:bg-brand-soft/60"
                          >
                            {subject.subject_name}
                          </button>
                        ))
                      ) : (
                        <span className="block px-3 py-2 text-sm text-muted">
                          No matching subjects.
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </label>
              {!mergeEnabled ? (
                <label className="grid min-w-[160px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark">
                  Section
                  <select
                    className={inputClass}
                    value={sectionId}
                    onChange={(event) => setSectionId(event.target.value)}
                    required={!mergeEnabled}
                  >
                    <option value="">Select section</option>
                    {sections.map((section) => (
                      <option
                        key={`${section.classSubjectTeacherId}::${section.classId}`}
                        value={`${section.classSubjectTeacherId}::${section.classId}`}
                      >
                        {section.classCode}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid min-w-[160px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark">
                  Section
                  <p className="rounded-md border border-line bg-paper px-3 py-[9px] text-[13px] text-muted">
                    All sections (merged)
                  </p>
                </div>
              )}
              <div className="grid min-w-[230px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark">
                Merge all sections
                <label className="flex h-[38px] cursor-pointer items-center gap-[8px] rounded-md border border-line bg-paper px-3 text-[13px] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={mergeEnabled}
                    onChange={(event) => {
                      setMergeEnabled(event.target.checked);
                      if (event.target.checked) setSectionId('');
                    }}
                    className="h-[16px] w-[16px] accent-brand"
                  />
                  Load every section&apos;s roster
                </label>
              </div>
              <div className="grid min-w-[330px] flex-[2] grid-cols-2 items-end gap-[14px] [@media(max-width:560px)]:grid-cols-1">
                <label className="grid gap-[7px] text-xs font-semibold text-brand-dark">
                  Date
                  <input
                    className={inputClass}
                    type="date"
                    value={sessionDate}
                    onChange={(event) => setSessionDate(event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-[7px] text-xs font-semibold text-brand-dark">
                  Time slot
                  <input
                    className={inputClass}
                    value={timeSlot}
                    onChange={(event) => setTimeSlot(event.target.value)}
                    placeholder="e.g. 09:00-10:00"
                  />
                </label>
              </div>
              <Button type="submit" variant="primary" disabled={saving || loading}>
                Load roster
              </Button>
            </form>
            {mergeEnabled && selectedSubject ? (
              <p className="mt-[12px] text-xs text-muted">
                Merged roster for{' '}
                <strong className="text-brand-dark">{selectedSubject.subject_name}</strong> — one
                session per section, shown together. Attendance is saved per section.
              </p>
            ) : null}
            {error ? <p className={`${formError} ${errorTop}`}>{error}</p> : null}
            {sessionId || mergeGroupId ? (
              <div className="mt-[22px] overflow-hidden rounded-md border border-line">
                <div className="border-b border-line p-[14px]">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className="grid min-w-[300px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark">
                      Quick mark
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          ref={quickInputRef}
                          className={`${inputClass} w-full max-w-[280px]`}
                          type="search"
                          value={quickQuery}
                          placeholder="Last 4 digits of seat number…"
                          onChange={(event) => setQuickQuery(event.target.value)}
                        />
                        {quickMarkedName ? (
                          <span className="text-[13px] font-medium text-success">
                            Marked present — {quickMarkedName}
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted">
                            Type the last 4 digits to mark a student present.
                          </span>
                        )}
                      </div>
                    </label>
                    <div className="flex shrink-0 flex-col items-end gap-[6px]">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={openSaveModal}
                        disabled={saving || !hasPresent}
                        className="[@media(max-width:900px)]:w-full"
                      >
                        <Save size={16} /> Save attendance
                      </Button>
                      <span className="text-[11px] text-muted">
                        Present {presentCount} of {students.length}
                      </span>
                    </div>
                  </div>
                  {quickQuery.trim() ? (
                    <div className="mt-[10px] max-h-44 overflow-y-auto rounded-md border border-line bg-paper">
                      {quickMatches.length ? (
                        quickMatches.map((match) => (
                          <div
                            className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 first:border-t-0"
                            key={match.id}
                          >
                            <span className="min-w-0 truncate text-[13px] text-ink">
                              <strong className="text-brand-dark">{match.name}</strong>
                              <small className="ml-2 text-muted">{match.student_id}</small>
                              <br />
                              <small className="text-[11px]">
                                {match.status === 'present' ? (
                                  <span className="font-medium text-success">Present</span>
                                ) : match.status ? (
                                  <span className="font-medium text-danger">
                                    {statusLabels[match.status] || match.status}
                                  </span>
                                ) : (
                                  <span className="text-muted">Not marked yet</span>
                                )}
                              </small>
                            </span>
                            {match.status !== 'present' ? (
                              <Button
                                type="button"
                                variant="primary"
                                className="h-7 !px-3 !text-xs"
                                disabled={saving}
                                onClick={() => quickMark(match)}
                              >
                                Attend
                              </Button>
                            ) : (
                              <span className="text-[12px] font-medium text-success">Marked present</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-[13px] text-muted">No student matches.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                {students.length ? (
                  students.map((student) => (
                    <div
                      className="grid grid-cols-[minmax(200px,1fr)_150px_minmax(180px,1fr)] items-center gap-3 border-t border-line px-[14px] py-[10px] first:border-t-0 [@media(max-width:900px)]:grid-cols-1"
                      key={student.id}
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-[13px] text-brand-dark">{student.name}</strong>
                        <small className="mt-1 block text-[11px] text-muted">{student.student_id}</small>
                      </div>
                      <select
                        className={inputClass}
                        value={student.status}
                        onChange={(event) =>
                          setStudents((current) =>
                            current.map((item) =>
                              item.id === student.id ? { ...item, status: event.target.value } : item,
                            ),
                          )
                        }
                      >
                        <option value="">None</option>
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status] || status}
                          </option>
                        ))}
                      </select>
                      <input
                        className={inputClass}
                        value={student.remarks}
                        onChange={(event) =>
                          setStudents((current) =>
                            current.map((item) =>
                              item.id === student.id ? { ...item, remarks: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Remarks"
                      />
                    </div>
                  ))
                ) : (
                  <p className={emptyState}>No active students are enrolled in this class and semester.</p>
                )}
              </div>
            ) : null}
            {saveOpen && students.length ? (
              <Modal
                size="xl"
                eyebrow={mergedDate || sessionDate}
                title="Confirm attendance"
                onClose={() => setSaveOpen(false)}
                footer={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSaveOpen(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={commitSave}
                      disabled={saving}
                    >
                      <Save size={16} /> Save attendance
                    </Button>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-[10px] px-5 py-4 text-[12px]">
                  <span className="rounded-md bg-[#edf7ef] px-2.5 py-1 font-medium text-success">
                    Present: {presentCount}
                  </span>
                  <span className="rounded-md bg-red-50 px-2.5 py-1 font-medium text-danger">
                    Absent: {absentCount}
                  </span>
                  <span className="rounded-md bg-surface px-2.5 py-1 font-medium text-muted">
                    Not marked: {unmarkedCount} (will be absent)
                  </span>
                  <span className="rounded-md bg-surface px-2.5 py-1 font-medium text-muted">
                    Total: {students.length}
                  </span>
                </div>
                <div className="max-h-[55vh] overflow-y-auto border-t border-line">
                  {students.map((student) => (
                    <div
                      className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-[13px] last:border-b-0"
                      key={student.id}
                    >
                      <span className="min-w-0 truncate">
                        <strong className="text-brand-dark">{student.name}</strong>
                        <small className="ml-2 text-muted">{student.student_id}</small>
                      </span>
                      <span
                        className={
                          student.status === 'present'
                            ? 'shrink-0 font-medium text-success'
                            : 'shrink-0 font-medium text-danger'
                        }
                      >
                        {student.status === 'present'
                          ? 'Present'
                          : student.status === 'absent'
                            ? 'Absent'
                            : 'Not marked → Absent'}
                      </span>
                    </div>
                  ))}
                </div>
              </Modal>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}