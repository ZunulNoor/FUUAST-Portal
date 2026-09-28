'use client';

import { inputClass } from '@/components/ui/Field';
import { semesterLabel } from '@/configs/helpers';

const studentAdmins = (role) => ['super_admin', 'keen_admin', 'admin'].includes(role);

export default function ResourceToolbar({
  resource,
  user,
  roleConfig,
  filters,
  setFilters,
  setPage,
  filterDepartments,
  filterSemesters,
  filterBatches,
  filterClasses,
  search,
  setSearch,
}) {
  const isBatches = resource === 'batches';
  const isStudents = resource === 'students';
  const isTimetable = resource === 'timetable';
  const isSuper = user?.role === 'super_admin';
  const showDepartment =
    (isBatches && ['super_admin', 'keen_admin'].includes(user?.role)) ||
    (isStudents && studentAdmins(user?.role) && user?.role !== 'admin') ||
    (isTimetable && isSuper);
  const showSemester =
    (isStudents &&
      (studentAdmins(user?.role) || user?.role === 'teacher') &&
      (user?.role === 'teacher' || !filters.batch_id)) ||
    (isTimetable && studentAdmins(user?.role));
  const showBatch =
    (isStudents && studentAdmins(user?.role)) || (isTimetable && studentAdmins(user?.role));
  const showSection =
    (isStudents && studentAdmins(user?.role) && Boolean(filters.batch_id)) ||
    (isStudents && user?.role === 'teacher' && filterClasses.length > 0) ||
    (isTimetable && studentAdmins(user?.role) && Boolean(filters.batch_id));

  const changeFilter = (key) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'batch_id' ? { class_id: '' } : {}),
    }));
    setPage(1);
  };

  const changeSemesterShift = (event) => {
    const [semesterId, shift] = String(event.target.value || '').split(':');
    setFilters((prev) => ({ ...prev, semester_id: semesterId || '', shift: shift || '' }));
    setPage(1);
  };
  const semesterShiftValue =
    filters.semester_id || filters.shift
      ? `${filters.semester_id || ''}:${filters.shift || ''}`
      : '';

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
      {showDepartment ? (
        <select
          className={`${inputClass} w-48`}
          value={filters.department_id}
          onChange={changeFilter('department_id')}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {filterDepartments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      ) : null}
      {showSemester ? (
        isTimetable ? (
          <select
            className={`${inputClass} w-56`}
            value={semesterShiftValue}
            onChange={changeSemesterShift}
            aria-label="Filter by semester and shift"
          >
            <option value="">All semesters</option>
            {filterSemesters.map((semester) =>
              ['morning', 'evening'].map((shift) => (
                <option key={`${semester.id}:${shift}`} value={`${semester.id}:${shift}`}>
                  {semesterLabel(semester)} — {shift === 'morning' ? 'Morning' : 'Evening'}
                </option>
              )),
            )}
          </select>
        ) : (
          <select
            className={`${inputClass} w-48`}
            value={filters.semester_id}
            onChange={changeFilter('semester_id')}
            aria-label="Filter by semester"
          >
            <option value="">All semesters</option>
            {filterSemesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semesterLabel(semester)}
              </option>
            ))}
          </select>
        )
      ) : null}
      {showBatch ? (
        <select
          className={`${inputClass} w-48`}
          value={filters.batch_id}
          onChange={changeFilter('batch_id')}
          aria-label="Filter by batch"
        >
          <option value="">All batches</option>
          {filterBatches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name}
              {batch.start_year ? ` (${batch.start_year}-${batch.end_year || ''})` : ''}
            </option>
          ))}
        </select>
      ) : null}
      {showSection && filterClasses.length ? (
        <select
          className={`${inputClass} w-48`}
          value={filters.class_id}
          onChange={changeFilter('class_id')}
          aria-label="Filter by section"
        >
          <option value="">
            {user?.role === 'teacher' ? 'All my sections' : 'All sections of this batch'}
          </option>
          {filterClasses.map((classRow) => (
            <option key={classRow.id} value={classRow.id}>
              {classRow.class_code}
            </option>
          ))}
        </select>
      ) : null}
      {roleConfig.searchable ? (
        <input
          className={`${inputClass} min-w-[220px] flex-1`}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={
            roleConfig.searchPlaceholder || 'Search teachers by name, login ID, or email'
          }
        />
      ) : null}
    </div>
  );
}
