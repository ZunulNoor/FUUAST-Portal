import { selectOptions, creatableOptions, searchableOptions } from './helpers';

export default {
  title: 'Courses',
  description:
    'Create a course for a whole batch. Sections and their timings are set on the Timetable. A course can be offered by a different teacher per section.',
  endpoint: '/class-subject-teacher',
  columns: [
    ['batch_name', 'Batch'],
    ['semester_number', 'Semester'],
    ['subject_name', 'Subject'],
    ['teacher_name', 'Teacher'],
    ['schedule', 'Scheduled sections'],
    ['course_type', 'Type'],
    ['shift', 'Shift'],
  ],
  fields: [
    {
      name: 'batch_id',
      label: 'Batch',
      required: true,
      ...selectOptions('/batches', (row) => row.name),
    },
    {
      name: 'semester_id',
      label: 'Semester',
      required: true,
      ...selectOptions('/semesters', (row) => `Semester ${row.number}`),
    },
    {
      name: 'subject_id',
      label: 'Subject',
      required: true,
      ...creatableOptions('/subjects', (row) => `${row.code} - ${row.name}`, 'subject_name'),
    },
    {
      name: 'teacher_id',
      label: 'Teacher (optional)',
      hint: 'Optional per-section teacher. Add the course again with a different teacher for the other section.',
      ...searchableOptions('/teachers', (row) => row.name),
    },
    {
      name: 'course_type',
      label: 'Course type',
      required: true,
      type: 'select',
      options: [
        { value: 'theory', label: 'Theory' },
        { value: 'lab', label: 'Lab' },
        { value: 'project', label: 'Project' },
      ],
    },
    {
      name: 'shift',
      label: 'Shift',
      required: true,
      type: 'select',
      options: [
        { value: 'morning', label: 'Morning' },
        { value: 'evening', label: 'Evening' },
      ],
    },
  ],
  create: true,
  createRoles: ['admin'],
};
