import { searchableOptions, selectOptions } from './helpers';

export default {
  title: 'Teacher assignments',
  description: 'Assign a teacher to an existing course. Course subjects are managed in Courses.',
  endpoint: '/class-subject-teacher',
  columns: [
    ['subject_name', 'Subject'],
    ['teacher_name', 'Teacher'],
    ['batch_name', 'Batch'],
    ['semester_number', 'Semester'],
  ],
  fields: [
    {
      name: 'class_subject_teacher_id',
      label: 'Course',
      required: true,
      ...searchableOptions(
        '/class-subject-teacher',
        (row) =>
          `${row.subject_name} | ${row.batch_name} | Semester ${row.semester_number}${
            row.teacher_name ? ` | ${row.teacher_name}` : ''
          }`,
      ),
    },
    {
      name: 'teacher_id',
      label: 'Teacher',
      required: true,
      ...searchableOptions('/teachers', (row) => row.name),
    },
    {
      name: 'semester_id',
      label: 'Semester',
      required: true,
      ...selectOptions('/semesters', (row) => `Semester ${row.number}`),
    },
  ],
  create: false,
};