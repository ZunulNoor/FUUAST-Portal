import TeacherAttendancePage from '@/components/TeacherAttendancePage';
import TeacherDayAttendance from '@/components/TeacherDayAttendance';

export default async function MarkAttendancePage({ searchParams }) {
  const resolved = await searchParams;
  const mode = resolved?.mode === 'single' ? 'single' : 'day';
  return mode === 'day' ? <TeacherDayAttendance /> : <TeacherAttendancePage />;
}
