'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Filter,
  User,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { studentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PortalSidebar from './PortalSidebar';
import PageHeader from './PageHeader';
import { panel, portalMain, portalContent, emptyState } from '@/components/ui/cx';

function standingOf(percentage) {
  if (percentage >= 75)
    return { label: 'Good standing', tone: 'bg-white/20 text-white', dot: 'bg-success' };
  if (percentage >= 50)
    return { label: 'Needs attention', tone: 'bg-white/20 text-white', dot: 'bg-warning' };
  return { label: 'At risk', tone: 'bg-white/20 text-white', dot: 'bg-danger' };
}

function subjectTone(percentage) {
  if (percentage >= 75)
    return { pill: 'bg-[#edf7ef] text-success', bar: 'from-success to-[#7ed492]', ring: '#2F9E44' };
  if (percentage >= 50)
    return { pill: 'bg-[#fff5e8] text-warning', bar: 'from-warning to-[#f2c078]', ring: '#E08E2B' };
  return { pill: 'bg-[#fff0f0] text-danger', bar: 'from-danger to-[#f09393]', ring: '#D64545' };
}

function Ring({
  value,
  size = 120,
  stroke = 11,
  track = 'rgba(255,255,255,0.22)',
  color = '#ffffff',
  textClass = '',
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = animated ? Math.min(100, Math.max(0, Number(value) || 0)) : 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * shown) / 100}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className={`absolute inset-0 grid place-items-center text-center ${textClass}`}>
        <div>
          <div className="text-[26px] font-bold leading-none">
            {Math.round(Number(value) || 0)}
            <span className="text-sm font-semibold">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className={`${panel} animate-pulse p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-2/3 rounded bg-surface" />
        <div className="h-6 w-16 rounded-full bg-surface" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-[72px] w-[72px] rounded-full bg-surface" />
        <div className="grid flex-1 gap-2">
          <div className="h-3 rounded bg-surface" />
          <div className="h-3 w-3/4 rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}

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

  const totals = courses.reduce(
    (acc, course) => ({
      present: acc.present + (Number(course.present_classes) || 0),
      late: acc.late + (Number(course.late_classes) || 0),
      absent: acc.absent + (Number(course.absent_classes) || 0),
      total: acc.total + (Number(course.total_classes) || 0),
    }),
    { present: 0, late: 0, absent: 0, total: 0 },
  );
  const counted = totals.present + totals.late + totals.absent;
  const overall = counted > 0 ? ((totals.present + totals.late) / counted) * 100 : 0;
  const standing = standingOf(overall);

  const chips = [
    profile?.seat_number ? `Seat ${profile.seat_number}` : null,
    profile?.class_code
      ? `${profile.class_code}${profile.section_name ? ` · ${profile.section_name}` : ''}`
      : null,
    profile?.semester ? profile.semester : null,
  ].filter(Boolean);

  return (
    <>
      <PortalSidebar portal="student" />
      <main className={portalMain}>
        <PageHeader
          title="Attendance record"
          description="Your live standing across every subject, all in one glance."
          portal="student"
        />
        <div className={portalContent}>
          {/* Hero */}
          <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-dark via-brand to-brand-light text-white shadow-[var(--shadow)]">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-28 right-32 h-56 w-56 rounded-full bg-white/[0.07]" />
            <div className="pointer-events-none absolute -left-10 -bottom-20 h-44 w-44 rounded-full bg-black/10" />
            <div className="relative flex flex-wrap items-center gap-6 p-[26px] max-md:gap-5">
              <Ring value={overall} size={132} stroke={12} />
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${standing.tone}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${standing.dot}`} />
                    {standing.label}
                  </span>
                  <span className="text-[11px] text-white/70">Overall attendance</span>
                </div>
                <h2 className="mt-2 flex items-center gap-2 text-[22px] font-semibold">
                  <User size={20} className="text-white/80" />
                  {profile?.name || 'Student'}
                </h2>
                {chips.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-white/85" />
                    <strong>{totals.present}</strong> present
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={15} className="text-white/85" />
                    <strong>{totals.late}</strong> late
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <XCircle size={15} className="text-white/85" />
                    <strong>{totals.absent}</strong> absent
                  </span>
                  <span className="text-white/70">of {totals.total} marked</span>
                </div>
              </div>
            </div>
          </section>

          {/* Semester filter */}
          <section className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <Filter size={14} /> Semester
            </span>
            <button
              type="button"
              onClick={() => setSemesterId('')}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                !semesterId
                  ? 'bg-brand text-white shadow'
                  : 'border border-line bg-paper text-muted hover:border-brand hover:text-brand'
              }`}
            >
              All
            </button>
            {semesters.map((semester) => (
              <button
                key={semester.semester_id}
                type="button"
                onClick={() => setSemesterId(semester.semester_id)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  String(semesterId) === String(semester.semester_id)
                    ? 'bg-brand text-white shadow'
                    : 'border border-line bg-paper text-muted hover:border-brand hover:text-brand'
                }`}
              >
                {semester.semester}
                {semester.batch_name ? ` (${semester.batch_name})` : ''}
              </button>
            ))}
          </section>

          {/* Subjects */}
          <section className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-brand" />
              <h2 className="text-[15px] font-bold uppercase tracking-wide text-brand-dark">
                Subjects · {courses.length}
              </h2>
            </div>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : courses.length ? (
              <div className="grid items-start gap-4 md:grid-cols-2">
                {courses.map((course) => {
                  const percentage = Number(course.percentage) || 0;
                  const tone = subjectTone(percentage);
                  return (
                    <article
                      key={course.id}
                      className={`${panel} group p-5 transition duration-200 hover:-translate-y-[2px] hover:shadow-[0_10px_28px_-12px_rgba(55,69,31,0.35)]`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block truncate text-[15px] text-brand-dark">
                            {course.subject_name}
                          </strong>
                          <span className="mt-1 block text-[11px] text-muted">
                            {course.subject_code || ''} · {course.teacher_name || 'Teacher pending'}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone.pill}`}
                        >
                          {percentage >= 75 ? 'Safe' : percentage >= 50 ? 'Watch' : 'Critical'}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <Ring
                          value={percentage}
                          size={76}
                          stroke={8}
                          track="#eef1e6"
                          color={tone.ring}
                          textClass="text-brand-dark"
                        />
                        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
                          <div className="rounded-md bg-[#edf7ef] px-2 py-2">
                            <span className="block text-lg font-bold leading-none text-success">
                              {course.present_classes || 0}
                            </span>
                            <span className="mt-1 block text-[10px] font-semibold uppercase text-muted">
                              Present
                            </span>
                          </div>
                          <div className="rounded-md bg-[#fff5e8] px-2 py-2">
                            <span className="block text-lg font-bold leading-none text-warning">
                              {(Number(course.late_classes) || 0) +
                                (Number(course.absent_classes) || 0)}
                            </span>
                            <span className="mt-1 block text-[10px] font-semibold uppercase text-muted">
                              Missed
                            </span>
                          </div>
                          <div className="rounded-md bg-brand-soft px-2 py-2">
                            <span className="block text-lg font-bold leading-none text-brand-dark">
                              {course.total_classes || 0}
                            </span>
                            <span className="mt-1 block text-[10px] font-semibold uppercase text-muted">
                              Total
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1e6]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-[width] duration-700`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarCheck size={13} />
                          {course.present_classes || 0} present
                          {course.late_classes ? ` (${course.late_classes} late)` : ''}
                        </span>
                        {course.class_code ? <span>Section {course.class_code}</span> : null}
                        {course.schedule ? <span>{course.schedule}</span> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={`${panel} p-[25px]`}>
                <p className={`${emptyState} flex flex-col items-center gap-2`}>
                  <AlertTriangle size={22} className="text-warning" />
                  No courses are allocated to your current enrollment.
                </p>
              </div>
            )}
          </section>

          <p className="mt-6 flex items-center gap-1.5 text-[11px] text-muted">
            <Award size={13} />
            Most courses require 75% attendance to sit in final exams — keep every ring green.
          </p>
          <p className="mt-3 text-center text-[11px] text-muted">
            Powered by{' '}
            <a
              href="https://www.tychora.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-action hover:underline"
            >
              Tychora
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
