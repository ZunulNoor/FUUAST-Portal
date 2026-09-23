'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, XCircle, Filter, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { studentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PortalSidebar from './PortalSidebar';
import PortalHeaderUser from './PortalHeaderUser';
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
  filterInputClass,
} from '@/components/ui/cx';

export default function StudentRecordsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [profile, setProfile] = useState(null);
  const [semesterId, setSemesterId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !user) return;
    studentApi
      .get(`/attendance/student/${user.id}/profile`)
      .then((response) => setProfile(response.data?.profile || null))
      .catch(() => {});
    studentApi
      .get(`/attendance/student/${user.id}/semesters`)
      .then((response) => {
        const list = response.data?.semesters || [];
        setSemesters(list);
        setSemesterId(
          (current) =>
            current ||
            list.find((semester) => semester.is_active)?.semester_id ||
            list[list.length - 1]?.semester_id ||
            '',
        );
      })
      .catch(() => {});
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/student/login');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const coursesResponse = await studentApi.get(`/attendance/student/${user.id}/courses`, {
          params: { semester_id: semesterId || undefined },
        });
        setCourses(coursesResponse.data.courses || []);
      } catch (error) {
        console.error('Unable to load student records', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hydrated, user, semesterId, router]);

  if (!hydrated || !user) return null;

  return (
    <>
      <PortalSidebar portal="student" />
      <main className={portalMain}>
        <header className={portalHeader}>
          <div>
            <h1 className={headerTitle}>Attendance record</h1>
            <p className={headerSub}>Review your standing in every subject.</p>
          </div>
          <PortalHeaderUser portal="student" />
        </header>
        <div className={portalContent}>
          {profile ? (
            <section className={`${panel} mb-6 p-[22px]`}>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="mr-auto flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-brand/10 text-brand">
                    <User size={20} />
                  </div>
                  <div>
                    <strong className="block text-[15px] text-brand-dark">
                      {profile.name || 'Student'}
                    </strong>
                    <span className="mt-[2px] block text-[11px] text-muted">
                      {profile.father_name ? `Father: ${profile.father_name}` : ' '}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-[22px] text-[11px] max-md:grid-cols-2">
                  <div>
                    <span className="block text-[10px] text-muted">Enrollment</span>
                    <strong className="mt-[3px] block text-[13px] text-brand-dark">
                      {profile.enrollment_no || '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted">Seat Number</span>
                    <strong className="mt-[3px] block text-[13px] text-brand-dark">
                      {profile.seat_number || '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted">Section</span>
                    <strong className="mt-[3px] block text-[13px] text-brand-dark">
                      {profile.class_code ? `${profile.class_code} · ${profile.section_name || ''}` : 'Not assigned'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted">Current Semester</span>
                    <strong className="mt-[3px] block text-[13px] text-brand-dark">
                      {profile.semester ? `${profile.semester}${profile.batch_name ? ` · ${profile.batch_name}` : ''}` : '—'}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
          <section className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-paper px-[18px] py-[15px] max-md:items-stretch">
            <div className="mr-auto inline-flex items-center gap-2 text-xs font-semibold text-brand max-md:w-full">
              <Filter size={16} /> Filter
            </div>
            {semesters.length ? (
              <label className="grid gap-[5px] text-[10px] text-muted max-md:flex-1">
                Semester
                <select
                  className={filterInputClass}
                  value={semesterId}
                  onChange={(event) => setSemesterId(event.target.value)}
                >
                  <option value="">All semesters</option>
                  {semesters.map((semester) => (
                    <option key={semester.semester_id} value={semester.semester_id}>
                      {semester.semester}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </section>
          <section className={`${panel} mt-6 p-[25px]`}>
            <div className={sectionHeading}>
              <div>
                <span className={eyebrow}>SUBJECT RECORDS</span>
                <h2 className={sectionHeadingTitle}>Attendance by subject</h2>
              </div>
            </div>
            {loading ? (
              <p className={emptyState}>Loading attendance...</p>
            ) : courses.length ? (
              <div className="grid gap-[15px] pt-[20px]">
                {courses.map((course) => (
                  <article className="rounded-md border border-line p-[15px]" key={course.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-[14px] text-brand-dark">
                          {course.subject_name}
                          {course.subject_code ? ` (${course.subject_code})` : ''}
                        </strong>
                        <span className="mt-1 block text-[11px] text-muted">
                          Teacher: {course.teacher_name || 'Pending'}
                          {course.class_code ? ` | Section: ${course.class_code}` : ''}
                          {course.semester ? ` | ${course.semester}` : ''}
                        </span>
                      </div>
                      <div className="grid shrink-0 grid-cols-4 gap-[10px] text-center">
                        <div className="rounded-md bg-[#edf7ef] px-4 py-2">
                          <small className="block text-[10px] text-muted">Present</small>
                          <strong className="block text-sm text-success">
                            {course.present_classes || 0}
                          </strong>
                        </div>
                        <div className="rounded-md bg-[#fff0f0] px-4 py-2">
                          <small className="block text-[10px] text-muted">Absent</small>
                          <strong className="block text-sm text-danger">
                            {course.absent_classes || 0}
                          </strong>
                        </div>
                        <div className="rounded-md bg-[#f2f2f2] px-4 py-2">
                          <small className="block text-[10px] text-muted">Total</small>
                          <strong className="block text-sm">{course.total_classes || 0}</strong>
                        </div>
                        <div className="rounded-md bg-[#ebf6fb] px-4 py-2">
                          <small className="block text-[10px] text-muted">Percentage</small>
                          <strong className="block text-sm text-action">
                            {course.percentage || 0}%
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-[9px] bg-[#e8ebe4]">
                      <span
                        className="block h-full rounded-[9px] bg-action"
                        style={{ width: `${course.percentage || 0}%` }}
                      />
                    </div>
                    <div className="mt-[11px] flex flex-wrap gap-[18px] text-[11px] text-muted">
                      <span className="inline-flex items-center gap-[6px]">
                        <CalendarCheck size={14} /> {course.present_classes || 0} present (
                        {course.late_classes ? `${course.late_classes} late` : 'no late'})
                      </span>
                      <span className="inline-flex items-center gap-[6px]">
                        <XCircle size={14} /> {course.absent_classes || 0} absent
                      </span>
                      {course.schedule ? <span>Schedule: {course.schedule}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className={emptyState}>No courses are allocated to your current enrollment.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
