import { searchableOptions, selectOptions } from './helpers';

export default {
  title: 'Timetable',
  description:
    'Schedule a batch course into a section, by day and time. Teacher and section overlaps are rejected.',
  endpoint: '/timetable',
  columns: [
    ['day_of_week', 'Day'],
    ['start_time', 'Start'],
    ['end_time', 'End'],
    ['batch_name', 'Batch'],
    ['class_code', 'Section'],
    ['subject_name', 'Subject'],
    ['teacher_name', 'Teacher'],
    ['room', 'Room'],
  ],
  fields: [
    {
      name: 'class_subject_teacher_id',
      label: 'Course',
      required: true,
      ...searchableOptions(
        '/class-subject-teacher',
        (row) =>
          `${row.batch_name} | Semester ${row.semester_number} | ${row.subject_name} | ${row.teacher_name || 'No teacher'}`,
      ),
      textField: 'class_subject_teacher_label',
    },
    {
      name: 'class_id',
      label: 'Section',
      required: true,
      ...selectOptions('/classes', (row) => `${row.class_code} - ${row.section_name}`),
    },
    {
      name: 'teacher_id',
      label: 'Teacher (optional)',
      hint: 'Assigning a teacher sets it on the course and checks for time conflicts.',
      ...searchableOptions('/teachers', (row) => row.name),
      textField: 'teacher_label',
    },
    {
      name: 'room',
      label: 'Room / class',
      hint: 'e.g. B-204, Lab 3',
    },
    {
      name: 'color',
      label: 'Color',
      type: 'color',
      hint: 'Pick a color for this class in the timetable grid.',
    },
    { name: 'days', label: 'Days and times', type: 'days' },
  ],
  create: true,
  createRoles: ['admin', 'super_admin'],
  edit: true,
  editRoles: ['admin', 'super_admin'],
  remove: true,
  removeRoles: ['admin', 'super_admin'],
};
