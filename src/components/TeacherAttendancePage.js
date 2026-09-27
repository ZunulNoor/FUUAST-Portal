'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, ChevronDown, RefreshCw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import PortalSidebar from './PortalSidebar';
import PageHeader from './PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { inputClass } from '@/components/ui/Field';
import {
  panel,
  portalMain,
  portalContent,
  eyebrow,
  sectionHeading,
  sectionHeadingTitle,
  emptyState,
  formError,
  errorTop,
} from '@/components/ui/cx';
import { friendlyError } from '@/lib/apiError';

const statuses = ['present', 'absent'];
const statusLabels = {
  present: 'Present',
  absent: 'Absent',
};

const sectionKeyOf = (cstId, classId) => `${cstId}::${classId}`;

const countsOf = (students) => {
  let present = 0;
  let absent = 0;
  for (const student of students) {
    if (student.status === 'present') present += 1;
    else if (student.status === 'absent') absent += 1;
  }
  return { present, absent, unmarked: students.length - present - absent };
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
  const [sectionIds, setSectionIds] = useState([]);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [mergeEnabled, setMergeEnabled] = useState(false);
  const [mergeGroupId, setMergeGroupId] = useState(null);
  const [mergedDate, setMergedDate] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState('');
  // Merge mode roster (single combined list, unchanged behavior).
  const [students, setStudents] = useState([]);
  // Multi-section rosters: key -> { cstId, classId, classCode, sessionId, students, dirty, loadError }.
  const [rosters, setRosters] = useState({});
  const [expandedKeys, setExpandedKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const subjectBoxRef = useRef(null);
  const sectionBoxRef = useRef(null);
  const quickInputRef = useRef(null);
  const quickTimerRef = useRef(null);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickMarkedName, setQuickMarkedName] = useState('');
  const [saveKeys, setSaveKeys] = useState(null);

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
      setError(friendlyError(requestError));
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
      if (sectionBoxRef.current && !sectionBoxRef.current.contains(event.target)) {
        setSectionOpen(false);
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

  const selectedSubject = subjects.find((s) => String(s.subject_id) === String(subjectId));
  const firstSelectedSection = sections.find(
    (section) => sectionIds.includes(sectionKeyOf(section.classSubjectTeacherId, section.classId)),
  );
  const resolvedSemester = mergeEnabled
    ? firstSelectedSection?.semesterId || selectedSubject?.semester_id || ''
    : firstSelectedSection?.semesterId || '';

  const rosterEntries = useMemo(
    () =>
      sectionIds
        .map((key) => ({ key, entry: rosters[key] }))
        .filter(({ entry }) => Boolean(entry)),
    [sectionIds, rosters],
  );

  const dirtyEntries = useMemo(
    () => rosterEntries.filter(({ entry }) => entry.dirty),
    [rosterEntries],
  );

  const totals = useMemo(() => {
    let studentsTotal = 0;
    let marked = 0;
    for (const { entry } of rosterEntries) {
      studentsTotal += entry.students.length;
      marked += entry.students.filter((s) => s.status).length;
    }
    return { classes: rosterEntries.length, studentsTotal, marked };
  }, [rosterEntries]);

  const quickMatches = useMemo(() => {
    const needle = quickQuery.trim();
    if (!needle) return [];
    if (mergeEnabled) {
      return students
        .filter((student) => String(student.student_id || '').endsWith(needle))
        .slice(0, 8)
        .map((student) => ({ ...student, rosterKey: null, classCode: '' }));
    }
    const matches = [];
    for (const { key, entry } of rosterEntries) {
      for (const student of entry.students) {
        if (String(student.student_id || '').endsWith(needle)) {
          matches.push({ ...student, rosterKey: key, classCode: entry.classCode });
        }
        if (matches.length >= 8) return matches;
      }
    }
    return matches;
  }, [quickQuery, students, mergeEnabled, rosterEntries]);

  const selectSubject = (subject) => {
    setSubjectId(subject.subject_id);
    setSubjectQuery(subject.subject_name);
    setSubjectOpen(false);
    setSectionIds([]);
    setRosters({});
    setExpandedKeys({});
  };

  const toggleSection = (key) => {
    setSectionIds((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  };

  const loadOneSection = async (cstId, classId, date, slot, preserve) => {
    const sessionsResponse = await staffApi.get('/attendance/sessions', {
      params: { class_subject_teacher_id: cstId, class_id: classId, date },
    });
    let session = sessionsResponse.data?.[0];
    if (!session) {
      try {
        const created = await staffApi.post('/attendance/sessions', {
          class_subject_teacher_id: cstId,
          class_id: classId,
          session_date: date,
          time_slot: slot || null,
        });
        session = created.data;
      } catch (createError) {
        if (createError.response?.status === 409) {
          const retry = await staffApi.get('/attendance/sessions', {
            params: { class_subject_teacher_id: cstId, class_id: classId, date },
          });
          session = retry.data?.[0];
        } else {
          throw createError;
        }
      }
    }
    if (!session) throw new Error('Unable to open a session for this section.');
    const roster = await staffApi.get(`/attendance/sessions/${session.id}/roster`);
    const fresh = (roster.data.students || []).map((student) => ({
      ...student,
      status: student.status || '',
      remarks: student.remarks || '',
    }));
    if (preserve) {
      const kept = new Map(preserve.map((s) => [s.id, s]));
      for (const student of fresh) {
        const old = kept.get(student.id);
        if (old?.status) {
          student.status = old.status;
          student.remarks = old.remarks || student.remarks;
        }
      }
    }
    return { sessionId: session.id, students: fresh };
  };

  const openRosters = async (event) => {
    event.preventDefault();
    if (!subjectId) {
      setError('Select a subject first.');
      return;
    }
    if (!sessionDate) return;
    if (mergeEnabled && !resolvedSemester) {
      setError('Unable to resolve the semester for this subject.');
      return;
    }
    if (!mergeEnabled && sectionIds.length === 0) {
      setError('Tick at least one section below, or turn on "Merge all sections".');
      return;
    }
    setSaving(true);
    setError('');
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
        const next = {};
        for (const key of sectionIds) {
          const [cstId, classId] = key.split('::');
          const section = sections.find(
            (s) => sectionKeyOf(s.classSubjectTeacherId, s.classId) === key,
          );
          try {
            // eslint-disable-next-line no-await-in-loop
            const { sessionId, students: fresh } = await loadOneSection(
              cstId,
              classId,
              date,
              timeSlot,
              rosters[key]?.students,
            );
            next[key] = {
              cstId,
              classId,
              classCode: section?.classCode || key,
              sessionId,
              students: fresh,
              dirty: Boolean(rosters[key]?.dirty),
              loadError: '',
            };
          } catch (sectionError) {
            next[key] = {
              cstId,
              classId,
              classCode: section?.classCode || key,
              sessionId: rosters[key]?.sessionId || null,
              students: rosters[key]?.students || [],
              dirty: Boolean(rosters[key]?.dirty),
              loadError:
                friendlyError(sectionError),
            };
          }
        }
        setRosters(next);
        setExpandedKeys(Object.fromEntries(sectionIds.map((key) => [key, true])));
      }
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const setRosterStudent = (key, studentId, patch) => {
    setRosters((current) => {
      const entry = current[key];
      if (!entry) return current;
      return {
        ...current,
        [key]: {
          ...entry,
          dirty: true,
          students: entry.students.map((item) =>
            item.id === studentId ? { ...item, ...patch } : item,
          ),
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
          students: entry.students.map((item) => ({ ...item, status: 'present' })),
        },
      };
    });
  };

  const quickMark = async (match) => {
    setSaving(true);
    setError('');
    try {
      const records = [
        { student_id: match.id, status: 'present', remarks: match.remarks || '' },
      ];
      if (mergeGroupId && mergedDate) {
        await staffApi.put(`/attendance/sessions/merged/${mergeGroupId}/records`, {
          date: mergedDate,
          records,
        });
        setStudents((current) =>
          current.map((item) =>
            item.id === match.id ? { ...item, status: 'present' } : item,
          ),
        );
      } else if (match.rosterKey && rosters[match.rosterKey]) {
        const entry = rosters[match.rosterKey];
        await staffApi.put(`/attendance/sessions/${entry.sessionId}/records`, { records });
        setRosterStudent(match.rosterKey, match.id, { status: 'present' });
      } else {
        return;
      }
      setQuickMarkedName(
        `${match.name} (${match.student_id})${match.classCode ? ` — ${match.classCode}` : ''}`,
      );
      setQuickQuery('');
      if (quickTimerRef.current) clearTimeout(quickTimerRef.current);
      quickTimerRef.current = setTimeout(() => setQuickMarkedName(''), 2500);
      if (quickInputRef.current) quickInputRef.current.focus();
    } catch (requestError) {
      setError(
        friendlyError(requestError),
      );
    } finally {
      setSaving(false);
    }
  };

  const buildRecords = (list) => {
    let autoAbsent = 0;
    const records = list.map(({ id, status, remarks }) => {
      const resolved = status || 'absent';
      if (resolved === 'absent' && !status) autoAbsent += 1;
      return { student_id: id, status: resolved, remarks };
    });
    return { autoAbsent, records };
  };

  const openSaveModal = (keys) => {
    setError('');
    setSaveKeys(keys);
  };

  const saveTargets = useMemo(() => {
    if (!saveKeys) return [];
    if (mergeEnabled) {
      return [{ key: '__merge__', classCode: 'Merged roster', students }];
    }
    return saveKeys
      .map((key) => {
        const entry = rosters[key];
        return entry ? { key, classCode: entry.classCode, students: entry.students } : null;
      })
      .filter(Boolean);
  }, [saveKeys, mergeEnabled, students, rosters]);

  const saveSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    let total = 0;
    for (const target of saveTargets) {
      const counts = countsOf(target.students);
      present += counts.present;
      absent += counts.absent;
      unmarked += counts.unmarked;
      total += target.students.length;
    }
    return { present, absent, unmarked, total };
  }, [saveTargets]);

  const commitSave = async () => {
    if (!saveTargets.length) return;
    setSaving(true);
    setError('');
    try {
      let classes = 0;
      let studentTotal = 0;
      let autoAbsent = 0;
      for (const target of saveTargets) {
        const built = buildRecords(target.students);
        autoAbsent += built.autoAbsent;
        studentTotal += built.records.length;
        if (mergeEnabled && target.key === '__merge__') {
          // eslint-disable-next-line no-await-in-loop
          await staffApi.put(`/attendance/sessions/merged/${mergeGroupId}/records`, {
            date: mergedDate,
            records: built.records,
          });
          setStudents((current) =>
            current.map((item) => (item.status ? item : { ...item, status: 'absent' })),
          );
        } else {
          const entry = rosters[target.key];
          if (!entry?.sessionId) continue;
          // eslint-disable-next-line no-await-in-loop
          await staffApi.put(`/attendance/sessions/${entry.sessionId}/records`, {
            records: built.records,
          });
          setRosters((current) => {
            const existing = current[target.key];
            if (!existing) return current;
            return {
              ...current,
              [target.key]: {
                ...existing,
                dirty: false,
                students: existing.students.map((item) =>
                  item.status ? item : { ...item, status: 'absent' },
                ),
              },
            };
          });
        }
        classes += 1;
      }
      setSaveKeys(null);
      if (mergeEnabled) {
        toast.success(
          autoAbsent
            ? `Attendance saved — ${autoAbsent} unmarked student(s) were recorded as absent.`
            : 'Attendance saved successfully.',
        );
      } else if (classes > 1) {
        toast.success(
          autoAbsent
            ? `Saved ${classes} classes — ${studentTotal} record(s); ${autoAbsent} unmarked counted absent.`
            : `Saved ${classes} classes — ${studentTotal} record(s) in one go.`,
        );
      } else {
        toast.success(
          autoAbsent
            ? `Attendance saved — ${autoAbsent} unmarked student(s) were recorded as absent.`
            : 'Attendance saved successfully.',
        );
      }
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !user || user.role !== 'teacher') return null;

  const mergeCounts = countsOf(students);
  const anyDirtyWithPresent = dirtyEntries.some(({ entry }) =>
    entry.students.some((s) => s.status === 'present'),
  );

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <PageHeader
          title="Mark attendance"
          description="Pick a subject and tick one or more sections, then mark every roster together."
          portal="staff"
        />
        <div className={portalContent}>
          <section className={`${panel} p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>TEACHER WORKSPACE</span>
                <h2 className={sectionHeadingTitle}>Session roster</h2>
              </div>
              <button
                type="button"
                onClick={loadOfferings}
                title="Refresh courses"
                className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft"
              >
                <RefreshCw size={17} />
              </button>
            </div>
            <form
              className="mt-[22px] flex flex-wrap items-end gap-[14px]"
              onSubmit={openRosters}
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
                    setSectionIds([]);
                    setRosters({});
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
                      setSectionIds([]);
                      setRosters({});
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
                <div
                  className="grid min-w-[200px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark"
                  ref={sectionBoxRef}
                >
                  Sections ({sectionIds.length} selected)
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSectionOpen((open) => !open)}
                      className={`${inputClass} flex items-center justify-between text-left`}
                    >
                      <span className="truncate">
                        {sectionIds.length === 0
                          ? 'Tick 1, 2, 3… sections'
                          : sectionIds.length === 1
                            ? sections.find(
                                (s) =>
                                  sectionKeyOf(s.classSubjectTeacherId, s.classId) ===
                                  sectionIds[0],
                              )?.classCode || '1 section'
                            : `${sectionIds.length} sections`}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-muted transition-transform ${sectionOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {sectionOpen ? (
                      <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-xl">
                        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSectionIds(
                                sections.map((s) =>
                                  sectionKeyOf(s.classSubjectTeacherId, s.classId),
                                ),
                              )
                            }
                            className="text-[11px] font-bold uppercase tracking-wide text-action hover:underline"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={() => setSectionIds([])}
                            className="text-[11px] font-bold uppercase tracking-wide text-muted hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        {sections.length ? (
                          sections.map((section) => {
                            const key = sectionKeyOf(
                              section.classSubjectTeacherId,
                              section.classId,
                            );
                            return (
                              <label
                                key={key}
                                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink transition hover:bg-brand-soft/60"
                              >
                                <input
                                  type="checkbox"
                                  checked={sectionIds.includes(key)}
                                  onChange={() => toggleSection(key)}
                                  className="h-[16px] w-[16px] shrink-0 accent-brand"
                                />
                                <span className="truncate">{section.classCode}</span>
                              </label>
                            );
                          })
                        ) : (
                          <span className="block px-3 py-2 text-sm text-muted">
                            Pick a subject first.
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
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
                      if (event.target.checked) {
                        setSectionIds([]);
                        setRosters({});
                      }
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
                    onChange={(event) => {
                      setSessionDate(event.target.value);
                      setRosters({});
                    }}
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
                Load rosters
              </Button>
            </form>
            {mergeEnabled && selectedSubject ? (
              <p className="mt-[12px] text-xs text-muted">
                Merged roster for{' '}
                <strong className="text-brand-dark">{selectedSubject.subject_name}</strong> — one
                session per section, shown together. Attendance is saved per section.
              </p>
            ) : null}
            {!mergeEnabled && totals.classes > 0 ? (
              <p className="mt-[12px] text-xs text-muted">
                <strong className="text-brand-dark">{totals.classes} class(es)</strong> ·{' '}
                {totals.studentsTotal} student(s) · {totals.marked} marked — mark each roster,
                then save everything together.
              </p>
            ) : null}
            {error ? <p className={`${formError} ${errorTop}`}>{error}</p> : null}

            {mergeEnabled && (mergeGroupId || students.length) ? (
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
                        onClick={() => openSaveModal(['__merge__'])}
                        disabled={saving || mergeCounts.present === 0}
                        className="[@media(max-width:900px)]:w-full"
                      >
                        <Save size={16} /> Save attendance
                      </Button>
                      <span className="text-[11px] text-muted">
                        Present {mergeCounts.present} of {students.length}
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

            {!mergeEnabled && rosterEntries.length > 0 ? (
              <div className="mt-[22px]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className="grid min-w-[300px] flex-1 gap-[7px] text-xs font-semibold text-brand-dark">
                    Quick mark (all open rosters)
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
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => openSaveModal(dirtyEntries.map(({ key }) => key))}
                    disabled={saving || !anyDirtyWithPresent}
                  >
                    <Save size={16} /> Save all marked
                  </Button>
                </div>
                {quickQuery.trim() ? (
                  <div className="mt-[10px] max-h-44 overflow-y-auto rounded-md border border-line bg-paper">
                    {quickMatches.length ? (
                      quickMatches.map((match) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 first:border-t-0"
                          key={`${match.rosterKey}:${match.id}`}
                        >
                          <span className="min-w-0 truncate text-[13px] text-ink">
                            <strong className="text-brand-dark">{match.name}</strong>
                            <small className="ml-2 text-muted">{match.student_id}</small>
                            <small className="ml-2 text-[11px] text-brand">{match.classCode}</small>
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

                <div className="mt-[14px] grid gap-3">
                  {rosterEntries.map(({ key, entry }) => {
                    const counts = countsOf(entry.students);
                    const isOpen = expandedKeys[key] !== false;
                    return (
                      <div key={key} className="overflow-hidden rounded-md border border-line">
                        <div className="flex flex-wrap items-center gap-3 bg-surface px-[14px] py-[10px]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedKeys((current) => ({ ...current, [key]: !isOpen }))
                            }
                            className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-brand-soft hover:text-brand"
                            aria-label={isOpen ? 'Collapse section' : 'Expand section'}
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <strong className="text-[14px] text-brand-dark">{entry.classCode}</strong>
                          {entry.dirty ? (
                            <span className="rounded bg-[#fff5e8] px-2 py-[3px] text-[10px] font-bold uppercase text-warning">
                              Unsaved changes
                            </span>
                          ) : entry.sessionId ? (
                            <span className="rounded bg-[#edf7ef] px-2 py-[3px] text-[10px] font-bold uppercase text-success">
                              Saved
                            </span>
                          ) : null}
                          {entry.loadError ? (
                            <span className="text-xs font-medium text-danger">{entry.loadError}</span>
                          ) : null}
                          <span className="ml-auto text-[11px] text-muted">
                            Present {counts.present} of {entry.students.length}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 !px-3 !text-xs"
                            disabled={saving}
                            onClick={() => markAllPresent(key)}
                          >
                            <CheckCheck size={14} /> All present
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            className="h-8 !px-3 !text-xs"
                            disabled={saving || counts.present === 0}
                            onClick={() => openSaveModal([key])}
                          >
                            <Save size={14} /> Save
                          </Button>
                        </div>
                        {isOpen ? (
                          entry.students.length ? (
                            entry.students.map((student) => (
                              <div
                                className="grid grid-cols-[minmax(200px,1fr)_150px_minmax(180px,1fr)] items-center gap-3 border-t border-line px-[14px] py-[10px] [@media(max-width:900px)]:grid-cols-1"
                                key={student.id}
                              >
                                <div className="min-w-0">
                                  <strong className="block truncate text-[13px] text-brand-dark">
                                    {student.name}
                                  </strong>
                                  <small className="mt-1 block text-[11px] text-muted">
                                    {student.student_id}
                                  </small>
                                </div>
                                <select
                                  className={inputClass}
                                  value={student.status}
                                  onChange={(event) =>
                                    setRosterStudent(key, student.id, { status: event.target.value })
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
                                    setRosterStudent(key, student.id, { remarks: event.target.value })
                                  }
                                  placeholder="Remarks"
                                />
                              </div>
                            ))
                          ) : (
                            <p className={emptyState}>
                              {entry.loadError ||
                                'No active students are enrolled in this class and semester.'}
                            </p>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {saveKeys && saveTargets.length ? (
              <Modal
                size="xl"
                eyebrow={mergeEnabled ? mergedDate || sessionDate : sessionDate}
                title={saveTargets.length > 1 ? `Confirm attendance — ${saveTargets.length} classes` : 'Confirm attendance'}
                onClose={() => setSaveKeys(null)}
                footer={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setSaveKeys(null)}
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
                    Present: {saveSummary.present}
                  </span>
                  <span className="rounded-md bg-red-50 px-2.5 py-1 font-medium text-danger">
                    Absent: {saveSummary.absent}
                  </span>
                  <span className="rounded-md bg-surface px-2.5 py-1 font-medium text-muted">
                    Not marked: {saveSummary.unmarked} (will be absent)
                  </span>
                  <span className="rounded-md bg-surface px-2.5 py-1 font-medium text-muted">
                    Total: {saveSummary.total}
                  </span>
                </div>
                <div className="max-h-[55vh] overflow-y-auto border-t border-line">
                  {saveTargets.map((target) => (
                    <div key={target.key}>
                      {saveTargets.length > 1 ? (
                        <p className="border-b border-line bg-surface px-5 py-2 text-[12px] font-bold uppercase tracking-wide text-brand-dark">
                          {target.classCode}
                        </p>
                      ) : null}
                      {target.students.map((student) => (
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
